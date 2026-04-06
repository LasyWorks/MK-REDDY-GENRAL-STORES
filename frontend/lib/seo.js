const isDevelopment = process.env.NODE_ENV === "development";

export const SITE_NAME = "MK Reddy General Stores";
export const SITE_DESCRIPTION =
  "Order groceries, fresh produce, household essentials, and daily needs from your trusted local kirana store online.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (isDevelopment
    ? "http://localhost:3000"
    : "https://mkreddygeneralstore.com/");

export function getMetadataBase() {
  return new URL(SITE_URL);
}