"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PhoneIcon as Phone,
  ShieldCheckIcon as ShieldCheck,
  UserIcon as User,
  MapPinIcon as MapPin,
  CheckCircleIcon as CheckCircle2,
  BuildingStorefrontIcon as Store,
  EnvelopeIcon as Mail,
  KeyIcon as Key,
} from "@heroicons/react/24/outline";
import { GoogleLogin } from '@react-oauth/google';
import api from "@/lib/api";
import secureStorage from "@/lib/secureStorage";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  
  // Login method: 'select', 'google', 'email'
  const [loginMethod, setLoginMethod] = useState("select");
  
  // Steps: 'method-select', 'email-input', 'otp-verify', 'phone-collection', 'complete'
  const [step, setStep] = useState("method-select");
  
  // Google OAuth data
  const [googleData, setGoogleData] = useState(null);
  
  // Email OTP data
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  // Phone collection form
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [userType, setUserType] = useState("regular");
  const [address, setAddress] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isProcessing, setIsProcessing] = useState(false); // Prevent double submission
  const verifyingRef = useRef(false); // Ref-based lock for OTP verification

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      secureStorage.getItem("token") &&
      secureStorage.getItem("user")
    ) {
      router.replace("/");
    }
  }, [router]);

  // Google OAuth Handlers
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    
    try {
      const { data } = await api.post("/auth/google/login", {
        idToken: credentialResponse.credential,
      });

      if (!data) {
        throw new Error("Invalid response from server");
      }

      if (data.requiresRegistration) {
        // New user - needs to provide phone number
        setGoogleData(data.googleData);
        setName(data.googleData.name || "");
        setEmail(data.googleData.email || "");
        setStep("phone-collection");
        setSuccess("Google authentication successful! Please provide your phone number to complete registration.");
      } else {
        // Existing user - login successful
        const { user, accessToken, refreshToken } = data;
        secureStorage.setItem("token", accessToken);
        secureStorage.setItem("refreshToken", refreshToken);
        secureStorage.setItem("user", JSON.stringify(user));
        
        // Dispatch auth change event for Navbar to update
        window.dispatchEvent(new Event("authChange"));
        
        setSuccess("Login successful! Redirecting...");
        setStep("complete");
        setTimeout(() => router.push(redirectTo), 1000);
      }
    } catch (err) {
      console.error("Google login error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Google login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login cancelled or failed. Please try again.");
  };

  const handleGooglePhoneSubmit = async (e) => {
    e.preventDefault();
    
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/google/register", {
        name,
        phone,
        email: googleData.email,
        googleId: googleData.googleId,
        picture: googleData.picture,
        user_type: userType,
        address,
      });

      const { user, accessToken, refreshToken } = data;
      secureStorage.setItem("token", accessToken);
      secureStorage.setItem("refreshToken", refreshToken);
      secureStorage.setItem("user", JSON.stringify(user));

      // Dispatch auth change event for Navbar to update
      window.dispatchEvent(new Event("authChange"));

      setSuccess("Registration completed successfully! Redirecting...");
      setStep("complete");
      
      setTimeout(() => router.push(redirectTo), 2000);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Email OTP Handlers
  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      setEmail(normalizedEmail);
      
      const { data } = await api.post("/auth/email-otp/send", { email: normalizedEmail });
      setSuccess(data.message || "OTP sent successfully! Please check your email.");
      setOtpSent(true);
      setStep("otp-verify");
      
      // Auto-show OTP in development
      if (data?.otp) {
        console.log("Development OTP:", data.otp);
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    // Prevent double submission - use ref for immediate check (state updates are async)
    if (verifyingRef.current || isProcessing || loading) {
      console.log("Already processing OTP verification, ignoring duplicate request");
      return;
    }

    // Lock immediately with ref
    verifyingRef.current = true;
    setIsProcessing(true);
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("Sending OTP verification request...");
      const { data } = await api.post("/auth/email-otp/verify", { email, otp });
      console.log("OTP verification response:", data);

      if (!data) {
        throw new Error("Invalid response from server");
      }

      if (data.requiresRegistration) {
        // New user - needs to provide phone number
        setStep("phone-collection");
        setSuccess("Email verified! Please provide your phone number to complete registration.");
        setIsProcessing(false);
        verifyingRef.current = false;
      } else {
        // Existing user - login successful
        const { user, accessToken, refreshToken } = data;
        console.log("Login successful, storing tokens...");
        
        secureStorage.setItem("token", accessToken);
        secureStorage.setItem("refreshToken", refreshToken);
        secureStorage.setItem("user", JSON.stringify(user));
        
        // Dispatch auth change event for Navbar to update
        window.dispatchEvent(new Event("authChange"));
        
        setSuccess("Login successful! Redirecting...");
        setStep("complete");
        setLoading(false);
        
        // Redirect immediately
        console.log("Redirecting to:", redirectTo);
        router.push(redirectTo);
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      // Only show error if we haven't already succeeded
      if (step !== "complete") {
        setError(err.response?.data?.message || "Invalid OTP. Please try again.");
      }
      setIsProcessing(false);
      verifyingRef.current = false; // Reset ref lock on error
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOTPPhoneSubmit = async (e) => {
    e.preventDefault();
    
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/email-otp/register", {
        name,
        phone,
        email,
        user_type: userType,
        address,
      });

      const { user, accessToken, refreshToken } = data;
      secureStorage.setItem("token", accessToken);
      secureStorage.setItem("refreshToken", refreshToken);
      secureStorage.setItem("user", JSON.stringify(user));

      // Dispatch auth change event for Navbar to update
      window.dispatchEvent(new Event("authChange"));

      setSuccess("Registration completed successfully! Redirecting...");
      setStep("complete");
      
      setTimeout(() => router.push(redirectTo), 2000);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp("");
    setError("");
    setSuccess("");
    setIsProcessing(false); // Reset processing flag for new OTP
    await handleSendOTP({ preventDefault: () => {} });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl shadow-lg mb-4">
            <Store className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MK Reddy Stores</h1>
          <p className="text-sm text-gray-500 mt-2">
            {step === "method-select" && "Choose your sign-in method"}
            {step === "email-input" && "Sign in with Email OTP"}
            {step === "otp-verify" && "Verify your OTP"}
            {step === "phone-collection" && "Complete your profile"}
            {step === "complete" && "Welcome to MK Reddy Stores!"}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {success && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-6">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Method Selection Step */}
          {step === "method-select" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome Back!
                </h2>
                <p className="text-sm text-gray-600">
                  Choose how you'd like to sign in
                </p>
              </div>

              {/* Google Sign In */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-3 text-center">
                  Sign in with Google
                </p>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Email OTP Button */}
              <button
                onClick={() => {
                  setLoginMethod("email");
                  setStep("email-input");
                }}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 text-gray-700 font-semibold py-3.5 rounded-xl transition-all duration-200"
              >
                <Mail className="w-5 h-5 text-green-600" />
                Sign in with Email OTP
              </button>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>
                  Secure authentication. Your phone number is required for delivery coordination.
                </span>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-center text-gray-600">
                  By signing in, you agree to our{" "}
                  <Link href="/terms" className="text-green-600 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-green-600 hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Email Input Step */}
          {step === "email-input" && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Enter Your Email
                </h2>
                <p className="text-sm text-gray-600">
                  We'll send a 6-digit OTP to verify your email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("method-select");
                  setEmail("");
                  setError("");
                  setSuccess("");
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-800 py-2"
              >
                ← Back to login methods
              </button>
            </form>
          )}

          {/* OTP Verify Step */}
          {step === "otp-verify" && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Verify OTP
                </h2>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code sent to <br />
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP Code *
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  OTP expires in 5 minutes
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || isProcessing || otp.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {loading || isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Verify OTP"
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full text-sm text-green-600 hover:text-green-700 py-2"
              >
                Resend OTP
              </button>
            </form>
          )}

          {/* Phone Collection Step */}
          {step === "phone-collection" && (
            <form onSubmit={loginMethod === "email" ? handleEmailOTPPhoneSubmit : handleGooglePhoneSubmit} className="space-y-5">{" "}
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Complete Your Profile
                </h2>
                <p className="text-sm text-gray-600">
                  We need your phone number for order notifications
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email - show for email OTP, read-only for Google */}
              {loginMethod === "email" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number * (Required for delivery)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    required
                    maxLength={10}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <ShieldCheck className="w-4 h-4 inline mr-1 text-green-600" />
                  Used for order updates and delivery coordination
                </p>
              </div>

              {/* Customer Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserType("regular")}
                    className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                      userType === "regular"
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    🛒 Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("premium")}
                    className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                      userType === "premium"
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    ⭐ Premium
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("wholesale")}
                    className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                      userType === "wholesale"
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    📦 Wholesale
                  </button>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your delivery address"
                    rows={3}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !phone || phone.length !== 10}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Complete Registration"
                )}
              </button>
            </form>
          )}

          {/* Success Step */}
          {step === "complete" && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to MK Reddy Stores!
              </h2>
              <p className="text-gray-600 mb-6">
                Your account has been created successfully.
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-green-600">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Redirecting...
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help?{" "}
            <Link href="/contact" className="text-green-600 hover:underline font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
