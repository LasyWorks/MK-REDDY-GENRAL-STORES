"use client";

import { isSuspiciousUserAgent, isCommonBotUserAgent } from "@/lib/honeypot";
import { useEffect, useState } from "react";

/**
 * Honeypot Form Field - Hidden field that traps bots
 * If a bot fills this field, it will be logged and the form submission blocked
 * Real users never see or interact with this field (hidden via CSS)
 */
export function HoneypotField() {
  const [honeypotValue, setHoneypotValue] = useState("");

  useEffect(() => {
    const userAgent = navigator.userAgent || "unknown";
    const botType = isCommonBotUserAgent(userAgent);
    const isSuspicious = isSuspiciousUserAgent(userAgent);

    if (botType) {
      console.warn(`Bot detected: ${botType}`);
    }
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        opacity: 0,
        pointerEvents: "none",
        visibility: "hidden",
        display: "none",
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      <input
        type="text"
        name="website_url"
        value={honeypotValue}
        onChange={(e) => setHoneypotValue(e.target.value)}
        placeholder="Leave blank"
        autoComplete="off"
      />
      <input
        type="email"
        name="user_email_confirm"
        placeholder="Leave blank"
        autoComplete="off"
      />
      <input
        type="text"
        name="phone_confirm"
        placeholder="Leave blank"
        autoComplete="off"
      />
    </div>
  );
}

/**
 * Validate honeypot fields before form submission
 * Returns true if form data looks like a bot (honeypot filled)
 */
export function validateHoneypot(formData) {
  const honeypotFields = [
    "website_url",
    "user_email_confirm",
    "phone_confirm",
    "company_name",
  ];

  for (const field of honeypotFields) {
    const value = formData.get(field);
    if (value && typeof value === "string" && value.trim() !== "") {
      console.warn(`🔴 HONEYPOT TRIGGERED: Field "${field}" filled with "${value}"`);
      return true;
    }
  }

  return false;
}

/**
 * Client-side honeypot validation for forms
 * Usage: Add to form submission handler
 */
export function checkHoneypot(event) {
  const formData = new FormData(event.currentTarget);
  if (validateHoneypot(formData)) {
    event.preventDefault();
    console.error("Form submission blocked: Honeypot triggered");
    return false;
  }
  return true;
}
