"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone, ShieldCheck, ArrowRight, RotateCcw, User, MapPin,
  Mail, Loader2, CheckCircle2, Store,
} from "lucide-react";
import api from "@/lib/api";
import secureStorage from "@/lib/secureStorage";

// ── Inner component (needs useSearchParams) ──────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  // ── Steps: "phone" | "otp" | "register" ──────────────────────────────────
  const [step, setStep] = useState("phone");
  const [loginMethod, setLoginMethod] = useState("phone"); // "phone" or "email"

  // Phone step
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [sentToEmail, setSentToEmail] = useState(""); // Track which email OTP was sent for

  // OTP step — 6 individual boxes
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const [countdown, setCountdown] = useState(0);

  // Register step
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [userType, setUserType] = useState("retail");
  const [address, setAddress] = useState("");

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Already logged in? ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && secureStorage.getItem("token") && secureStorage.getItem("user")) {
      router.replace("/");
    }
  }, [router]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Auto-focus first OTP box when entering otp step
  useEffect(() => {
    if (step === "otp") setTimeout(() => otpRefs.current[0]?.focus(), 80);
  }, [step]);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  async function handleSendOTP(e) {
    e?.preventDefault();
    
    if (loginMethod === "phone") {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        setError("Enter a valid 10-digit Indian mobile number");
        return;
      }
      setError(""); setLoading(true);
      try {
        await api.post("/auth/otp/send", { phone });
        setSentToEmail("");
        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
        setCountdown(30);
      } catch (err) {
        setError(err.message || "Failed to send OTP. Please try again.");
      } finally { setLoading(false); }
    } else {
      // Email method
      if (!email || !email.includes('@')) {
        setError("Enter a valid email address");
        return;
      }
      setError(""); setLoading(true);
      try {
        const res = await api.post("/auth/otp/send-by-email", { email });
        // Backend returns the phone number associated with this email
        setPhone(res.data.phone);
        setSentToEmail(email);
        setStep("otp");
        setOtp(["", "", "", "", "", ""]);
        setCountdown(30);
      } catch (err) {
        setError(err.message || "Failed to send OTP. Please try again.");
      } finally { setLoading(false); }
    }
  }

  // ── Verify OTP (shared by button + auto-submit) ───────────────────────────
  async function doVerify(otpStr) {
    setError(""); setLoading(true);
    try {
      const res = await api.post("/auth/otp/verify", { phone, otp: otpStr });
      if (res.data?.requiresRegistration) {
        // Pre-fill email if they logged in via email
        if (sentToEmail) {
          setRegisterEmail(sentToEmail);
        }
        setStep("register");
      } else {
        secureStorage.setItem("token", res.data.accessToken);
        secureStorage.setItem("refreshToken", res.data.refreshToken);
        secureStorage.setItem("user", JSON.stringify(res.data.user));
        window.dispatchEvent(new Event("authChange"));
        setSuccess("Login successful! Redirecting…");
        setTimeout(() => router.push(redirectTo), 600);
      }
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 60);
    } finally { setLoading(false); }
  }

  function handleVerifyOTP(e) { e?.preventDefault(); doVerify(otp.join("")); }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  async function handleResend() {
    if (countdown > 0) return;
    setError(""); setLoading(true);
    try {
      await api.post("/auth/otp/resend", { phone });
      setOtp(["", "", "", "", "", ""]);
      setCountdown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch (err) { setError(err.message || "Failed to resend OTP.");
    } finally { setLoading(false); }
  }

  // ── Step 3: Register ──────────────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Full name is required"); return; }
    
    // If user logged in via email, phone is already set from backend
    // If user logged in via phone, use that phone
    // Otherwise check registerPhone field
    const phoneToUse = phone || registerPhone;
    
    if (!phoneToUse || !/^[6-9]\d{9}$/.test(phoneToUse)) {
      setError("Valid phone number is required");
      return;
    }
    
    setError(""); setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        name: name.trim(),
        phone: phoneToUse,
        user_type: userType,
        ...(registerEmail.trim() && { email: registerEmail.trim() }),
        ...(address.trim() && { address: address.trim() }),
      });
      
      // Backend returns tokens after successful registration, use them directly
      if (res.data?.accessToken && res.data?.user) {
        secureStorage.setItem("token", res.data.accessToken);
        secureStorage.setItem("refreshToken", res.data.refreshToken);
        secureStorage.setItem("user", JSON.stringify(res.data.user));
        window.dispatchEvent(new Event("authChange"));
        setSuccess("Account created successfully! Redirecting…");
        setTimeout(() => router.push(redirectTo), 600);
      } else {
        // Fallback: if for some reason tokens aren't returned, send OTP
        await api.post("/auth/otp/send", { phone: phoneToUse });
        setSuccess("Account created! Enter the OTP to sign in.");
        setOtp(["", "", "", "", "", ""]); setCountdown(30);
        setStep("otp");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  }

  // ── OTP box key handling ──────────────────────────────────────────────────
  function handleOtpChange(idx, val) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[idx] = digit; setOtp(next); setError("");
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (digit && idx === 5 && next.every(Boolean)) {
      setTimeout(() => doVerify(next.join("")), 80);
    }
  }
  function handleOtpKeyDown(idx, e) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  }
  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["","","","","",""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) setTimeout(() => doVerify(pasted), 80);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-600 rounded-2xl shadow-lg mb-4">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MK Reddy Stores</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === "phone" && "Sign in or create a new account"}
            {step === "otp"   && "Verify your mobile number"}
            {step === "register" && "Complete your profile to get started"}
          </p>
        </div>

        {/* Step indicator — shown on otp + register steps */}
        {(step === "otp" || step === "register") && (
          <div className="flex items-center justify-center gap-2 mb-5">
            {["Phone", "OTP", "Profile"].map((label, i) => {
              const currentIdx = step === "otp" ? 1 : 2;
              const done   = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                    done   ? "bg-green-600 text-white"
                    : active ? "bg-green-600 text-white ring-2 ring-green-200"
                    : "bg-gray-200 text-gray-500"
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${done || active ? "text-green-700" : "text-gray-400"}`}>{label}</span>
                  {i < 2 && <div className={`w-6 h-px ${done ? "bg-green-400" : "bg-gray-200"}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">

          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* ── STEP 1: Phone ── */}
          {step === "phone" && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              {/* Login method toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLoginMethod("phone")}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                    loginMethod === "phone"
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  📱 Phone
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("email")}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                    loginMethod === "email"
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  ✉️ Email
                </button>
              </div>

              {loginMethod === "phone" ? (
                <>
                  {/* Phone number — always required & verified via OTP */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-green-500 transition-colors bg-white">
                      <div className="flex items-center gap-1.5 px-3 py-3 border-r border-gray-200 bg-gray-50 select-none">
                        <span className="text-lg leading-none">🇮🇳</span>
                        <span className="text-sm font-semibold text-gray-700">+91</span>
                      </div>
                      <input
                        type="tel" inputMode="numeric" maxLength={10}
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                        className="flex-1 px-3 py-3 text-gray-900 outline-none text-sm placeholder-gray-400"
                        autoFocus autoComplete="tel-national"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      An OTP will be sent to verify your number
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phone.length !== 10}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get OTP <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </>
              ) : (
                <>
                  {/* Email login */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-green-500 transition-colors overflow-hidden">
                      <Mail className="w-4 h-4 text-gray-400 ml-3" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        className="flex-1 px-3 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
                        autoFocus
                        autoComplete="email"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      OTP will be sent to your registered phone number
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.includes('@')}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get OTP <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </>
              )}

              <p className="text-center text-xs text-gray-500">
                New here? Just enter your {loginMethod} — we'll create your account after verification.
              </p>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center">
                {sentToEmail ? (
                  <>
                    <p className="text-sm text-gray-600">
                      OTP sent to phone ending in <span className="font-semibold text-gray-900">••••{phone.slice(-4)}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      (Associated with {sentToEmail})
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    OTP sent to <span className="font-semibold text-gray-900">+91 {phone}</span>
                  </p>
                )}
                <button type="button" onClick={() => { setStep("phone"); setError(""); setSuccess(""); setSentToEmail(""); }}
                  className="text-xs text-green-600 hover:underline mt-0.5">
                  Change {loginMethod}
                </button>
              </div>

              {/* 6-box OTP input */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input key={idx} ref={(el) => (otpRefs.current[idx] = el)}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-xl outline-none transition-colors ${
                      digit ? "border-green-500 bg-green-50 text-green-700"
                             : "border-gray-200 focus:border-green-400 text-gray-900"}`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              <button type="submit" disabled={loading || otp.join("").length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm text-sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify &amp; Sign In <ShieldCheck className="w-4 h-4" /></>}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-sm">
                <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                {countdown > 0 ? (
                  <span className="text-gray-500">Resend in <span className="font-semibold text-green-700">{countdown}s</span></span>
                ) : (
                  <button type="button" onClick={handleResend} disabled={loading}
                    className="text-green-600 font-semibold hover:underline disabled:opacity-50">Resend OTP</button>
                )}
              </div>
            </form>
          )}

          {/* ── STEP 3: Register ── */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                ✓ OTP verified — complete your profile to finish sign-up.
              </p>

              {/* Phone (read-only if entered via phone, editable if via email) */}
              {phone && !sentToEmail ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  +91 {phone}
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                </div>
              ) : null}

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-green-500 transition-colors overflow-hidden">
                  <User className="w-4 h-4 text-gray-400 ml-3" />
                  <input type="text" placeholder="Your full name" value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    className="flex-1 px-3 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
                    autoFocus autoComplete="name" />
                </div>
              </div>

              {/* Email - pre-filled if logged in via email, otherwise optional */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address {sentToEmail ? <CheckCircle2 className="w-3 h-3 inline text-green-500" /> : <span className="text-xs font-normal text-gray-400">(optional)</span>}
                </label>
                <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-green-500 transition-colors overflow-hidden">
                  <Mail className="w-4 h-4 text-gray-400 ml-3" />
                  <input type="email" placeholder="you@example.com" value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="flex-1 px-3 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
                    autoComplete="email"
                    disabled={!!sentToEmail} />
                </div>
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "retail",    label: "Retail",    desc: "Personal / household" },
                    { value: "wholesale", label: "Wholesale", desc: "Business / bulk orders" },
                  ].map(({ value, label, desc }) => (
                    <label key={value} className={`relative flex flex-col gap-0.5 p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                      userType === value ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="user_type" value={value} checked={userType === value}
                        onChange={() => setUserType(value)} className="sr-only" />
                      <span className={`text-sm font-semibold ${userType === value ? "text-green-700" : "text-gray-800"}`}>{label}</span>
                      <span className="text-xs text-gray-500">{desc}</span>
                      {userType === value && <CheckCircle2 className="w-4 h-4 text-green-600 absolute top-2.5 right-2.5" />}
                    </label>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Delivery Address <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <div className="flex items-start border-2 border-gray-200 rounded-xl focus-within:border-green-500 transition-colors overflow-hidden">
                  <MapPin className="w-4 h-4 text-gray-400 ml-3 mt-3.5 flex-shrink-0" />
                  <textarea rows={2} placeholder="House / flat, street, city, pincode"
                    value={address} onChange={(e) => setAddress(e.target.value)}
                    className="flex-1 px-3 py-3 text-sm text-gray-900 outline-none placeholder-gray-400 resize-none" />
                </div>
              </div>

              <button type="submit" disabled={loading || !name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm text-sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing, you agree to our{" "}
          <span className="text-green-600 cursor-pointer hover:underline">Terms of Service</span>{" "}
          &amp;{" "}
          <span className="text-green-600 cursor-pointer hover:underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

// ── Exported page (Suspense for useSearchParams) ──────────────────────────────
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
