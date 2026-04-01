"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  GiftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";
import secureStorage from "@/lib/secureStorage";

function useAdminGuard() {
  const router = useRouter();
  const token = secureStorage.getItem("token");
  const raw = secureStorage.getItem("user");

  const parsedUser = useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [raw]);

  const isAdmin = Boolean(
    parsedUser && (parsedUser.user_type === "admin" || parsedUser.role === "admin"),
  );

  useEffect(() => {
    if (!token || !raw) {
      router.replace("/login?redirect=/admin/birthday-offers");
      return;
    }

    if (!parsedUser) {
      router.replace("/login?redirect=/admin/birthday-offers");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [router, token, raw, parsedUser, isAdmin]);

  return { ready: Boolean(token && isAdmin) };
}

export default function BirthdayOffersAdminPage() {
  const { ready } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [offers, setOffers] = useState([]);
  const [current, setCurrent] = useState(null);

  const selectedKey = current?.selected_offer_key || null;

  const selectedOfferLabel = useMemo(() => {
    const selected = offers.find((offer) => offer.key === selectedKey);
    return selected?.label || "Custom Offer";
  }, [offers, selectedKey]);

  const loadOffers = async () => {
    setLoading(true);
    setNotice("");
    try {
      const res = await api.get("/birthday-offers/options");
      setOffers(res?.data?.offers || []);
      setCurrent(res?.data?.current || null);
    } catch (err) {
      setNotice(err.message || "Failed to load birthday offers");
      setNoticeType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    loadOffers();
  }, [ready]);

  const applyOffer = async (offerKey) => {
    setSaving(true);
    setNotice("");
    try {
      const res = await api.put("/birthday-offers/current", { offer_key: offerKey });
      setCurrent(res?.data || null);
      setNotice("Birthday offer updated successfully");
      setNoticeType("success");
    } catch (err) {
      setNotice(err.message || "Failed to update birthday offer");
      setNoticeType("error");
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async () => {
    if (!current) return;
    setSaving(true);
    setNotice("");
    try {
      const res = await api.put("/birthday-offers/current", {
        enabled: !current.enabled,
      });
      setCurrent(res?.data || null);
      setNotice(`Birthday campaign ${res?.data?.enabled ? "enabled" : "disabled"}`);
      setNoticeType("success");
    } catch (err) {
      setNotice(err.message || "Failed to update campaign status");
      setNoticeType("error");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Birthday Offers</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure predefined birthday campaign offers in one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadOffers}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={toggleCampaign}
              disabled={saving || loading || !current}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <GiftIcon className="w-4 h-4" />
              {current?.enabled ? "Disable Campaign" : "Enable Campaign"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {notice && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              noticeType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <div className="inline-flex items-center gap-2">
              {noticeType === "error" ? (
                <ExclamationTriangleIcon className="w-5 h-5" />
              ) : (
                <CheckCircleIcon className="w-5 h-5" />
              )}
              {notice}
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900">Current Configuration</h2>
          {current ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <Info label="Campaign" value={current.enabled ? "Enabled" : "Disabled"} />
              <Info label="Selected Offer" value={selectedOfferLabel} />
              <Info label="Discount" value={`${current.discount_percent}%`} />
              <Info label="Code" value={current.discount_code} />
              <Info label="Valid Days" value={`${current.discount_valid_days} day(s)`} />
              <Info label="Title" value={current.offer_title} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No birthday offer config loaded.</p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900">Predefined Birthday Offers</h2>
          <p className="text-sm text-gray-500 mt-1">Pick one template to apply instantly.</p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => {
              const active = selectedKey === offer.key;
              return (
                <article
                  key={offer.key}
                  className={`rounded-xl border p-4 transition-all ${
                    active
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{offer.label}</h3>
                      <p className="text-xs text-gray-500 mt-1">Key: {offer.key}</p>
                    </div>
                    {active && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 text-sm text-gray-700">
                    <p><span className="font-semibold">Title:</span> {offer.offer_title}</p>
                    <p><span className="font-semibold">Discount:</span> {offer.discount_percent}%</p>
                    <p><span className="font-semibold">Code:</span> {offer.discount_code}</p>
                    <p><span className="font-semibold">Valid:</span> {offer.discount_valid_days} day(s)</p>
                  </div>

                  <button
                    onClick={() => applyOffer(offer.key)}
                    disabled={saving || loading}
                    className="mt-4 inline-flex items-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
                  >
                    Apply Offer
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{label}</p>
      <p className="text-sm text-gray-900 font-medium mt-0.5">{value || "-"}</p>
    </div>
  );
}
