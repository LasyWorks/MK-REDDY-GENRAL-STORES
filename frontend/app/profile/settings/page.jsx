"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRightIcon,
  UserIcon,
  EnvelopeIcon,
  MapPinIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import authService from "@/services/authService";
import secureStorage from "@/lib/secureStorage";
import api from "@/lib/api";
import { ChronoSelect } from "@/components/ui/chrono-select";

export default function ProfileSettingsPage() {
  const router = useRouter();

  const toLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const user = authService.getCurrentUser();

  const [name, setName] = useState(user?.name || "");
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.date_of_birth ? String(user.date_of_birth).slice(0, 10) : "",
  );
  const [email, setEmail] = useState(user?.email || "");
  const [address, setAddress] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!authService.isAuthenticated() || !user) {
      router.replace("/login?redirect=%2Fprofile%2Fsettings");
      return;
    }

    if (authService.requiresProfileCompletion(user)) {
      router.replace(authService.getProfileCompletionLoginHref("/profile/settings"));
    }
  }, [router, user]);

  const handleSave = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: name.trim(),
        display_name: displayName.trim(),
        date_of_birth: dateOfBirth || null,
        email: email.trim() || null,
        address: address.trim() || null,
      };

      const { data: updatedUser } = await api.put("/auth/me", payload);
      secureStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("authChange"));

      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!authService.isAuthenticated() || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600 rotate-180" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Account Settings</h1>
          <div className="w-9" aria-hidden="true" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-3 py-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <Field label="Full Name">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Full name"
              />
            </div>
          </Field>

          <Field label="Display Name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              placeholder="Preferred display name"
            />
          </Field>

          <Field label="Date of Birth">
            <ChronoSelect
              value={dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : undefined}
              onChange={(date) => {
                setDateOfBirth(date ? toLocalDateString(date) : "");
              }}
              placeholder="Pick date of birth"
              yearRange={[1940, new Date().getFullYear()]}
              className="w-full"
            />
          </Field>

          <Field label="Email">
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Email address"
              />
            </div>
          </Field>

          <Field label="Address">
            <div className="relative">
              <MapPinIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                placeholder="Address"
              />
            </div>
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}
