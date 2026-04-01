"use client";

import { useEffect, useState } from "react";
import { GiftIcon, CheckCircleIcon, LockClosedIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";

export default function BirthdayOfferCard() {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const res = await api.get("/birth-day/my-offer");
        setOffer(res?.data || null);
        setError("");
      } catch (err) {
        setError("");
        setOffer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 h-32 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    );
  }

  if (!offer) {
    return null;
  }

  const isRevealed = offer.status === "revealed";
  const isClaimed = offer.status === "claimed";
  const isExpired = offer.status === "expired";
  const isPending = offer.status === "pending_selection" || offer.status === "selected";

  const getStatusConfig = () => {
    if (isClaimed) {
      return {
        icon: CheckCircleIcon,
        bg: "bg-green-50",
        border: "border-green-100",
        badge: "bg-green-100 text-green-700",
        text: "Offer Claimed",
      };
    }
    if (isExpired) {
      return {
        icon: ExclamationTriangleIcon,
        bg: "bg-red-50",
        border: "border-red-100",
        badge: "bg-red-100 text-red-700",
        text: "Offer Expired",
      };
    }
    if (isRevealed) {
      return {
        icon: GiftIcon,
        bg: "bg-violet-50",
        border: "border-violet-100",
        badge: "bg-violet-100 text-violet-700",
        text: "Offer Ready",
      };
    }
    return {
      icon: LockClosedIcon,
      bg: "bg-blue-50",
      border: "border-blue-100",
      badge: "bg-blue-100 text-blue-700",
      text: "Coming Soon",
    };
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className={`${config.bg} border ${config.border} rounded-2xl shadow-sm p-4`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Birthday Offer</h3>
            <p className="text-xs text-gray-600">{offer.offer_title || "Special Gift"}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${config.badge}`}>
          {config.text}
        </span>
      </div>

      <div className="bg-white rounded-lg p-3 space-y-2 mb-3">
        {isRevealed && offer.coupon_code && (
          <div>
            <p className="text-xs text-gray-600 mb-1">Coupon Code</p>
            <div className="bg-violet-100 border border-violet-200 rounded px-3 py-2 flex items-center justify-between">
              <code className="text-sm font-mono font-bold text-violet-700">{offer.coupon_code}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(offer.coupon_code);
                }}
                className="text-xs text-violet-600 hover:text-violet-700 font-semibold"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {offer.discount_type && offer.discount_value ? (
          <div>
            <p className="text-xs text-gray-600">Discount</p>
            <p className="text-sm font-bold text-gray-900">
              {offer.discount_type === "flat" ? `₹${offer.discount_value}` : `${offer.discount_value}% OFF`}
            </p>
          </div>
        ) : null}

        {offer.valid_until && (
          <div>
            <p className="text-xs text-gray-600">Valid Until</p>
            <p className="text-sm font-bold text-gray-900">{formatDate(offer.valid_until)}</p>
          </div>
        )}
      </div>

      {isRevealed ? (
        <p className="text-xs text-gray-700 leading-relaxed">
          Use code <span className="font-bold">{offer.coupon_code}</span> at checkout to claim your birthday offer.
        </p>
      ) : isPending ? (
        <p className="text-xs text-gray-700 leading-relaxed">
          Your birthday offer will be revealed on your birthday. Check back soon!
        </p>
      ) : isClaimed ? (
        <p className="text-xs text-gray-700 leading-relaxed">
          Thank you for using your birthday offer. We hope you enjoyed your gift!
        </p>
      ) : (
        <p className="text-xs text-gray-700 leading-relaxed">
          This offer is no longer valid. Thank you for the love!
        </p>
      )}
    </div>
  );
}
