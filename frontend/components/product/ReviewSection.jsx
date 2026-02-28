"use client";
import { useState } from "react";
import {
  StarIcon as Star,
  HandThumbUpIcon as ThumbsUp,
  ChevronDownIcon as ChevronDown,
  XMarkIcon as X,
  PaperAirplaneIcon as Send,
} from "@heroicons/react/24/outline";

/* -- Helpers -- */
function FilledStars({ value = 0, size = "w-4 h-4" }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = rounded >= s;
        const half = !filled && rounded >= s - 0.5;
        return (
          <span
            key={s}
            className="relative inline-block"
            style={{ width: 16, height: 16 }}
          >
            <Star
              className={`absolute inset-0 ${size} text-gray-200`}
              fill="currentColor"
            />
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden text-yellow-400"
                style={{ width: half ? "50%" : "100%" }}
              >
                <Star className={size} fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function RatingBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colors = {
    5: "bg-green-500",
    4: "bg-green-400",
    3: "bg-yellow-400",
    2: "bg-orange-400",
    1: "bg-red-400",
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-gray-600 font-medium text-right shrink-0">
        {label}
      </span>
      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colors[label] || "bg-gray-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-gray-400 text-xs shrink-0">{count}</span>
    </div>
  );
}

/* -- Interactive star picker for the write review form -- */
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none"
        >
          <Star
            className={`w-7 h-7 transition-colors ${(hover || value) >= s ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

/* -- Sort options (#6) -- */
const SORT_OPTIONS = [
  { value: "helpful", label: "Most Helpful" },
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest Rating" },
  { value: "lowest", label: "Lowest Rating" },
];

/* ---------------------------------------------------------- */
export default function ReviewSection({
  productId,
  productName,
  averageRating = 0,
  reviewCount = 0,
}) {
  const [sortBy, setSortBy] = useState("helpful");
  const [showModal, setShowModal] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [submitted, setSubmitted] = useState(false);

  /* Placeholder reviews */
  const PLACEHOLDER = [
    {
      id: 1,
      author: "Ravi K.",
      rating: 5,
      date: "Jan 2026",
      title: "Excellent product!",
      body: "Very good quality, exactly as described. Fast delivery too.",
      helpful: 12,
    },
    {
      id: 2,
      author: "Priya M.",
      rating: 4,
      date: "Dec 2025",
      title: "Good value for money",
      body: "Satisfied with the purchase. Packaging was intact and delivery was on time.",
      helpful: 7,
    },
    {
      id: 3,
      author: "Suresh B.",
      rating: 3,
      date: "Nov 2025",
      title: "Average",
      body: "Product is okay but the fragrance fades quickly.",
      helpful: 3,
    },
  ];

  const breakdown = { 5: 18, 4: 8, 3: 4, 2: 2, 1: 1 };
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const avg =
    averageRating ||
    (total > 0
      ? Object.entries(breakdown).reduce(
          (acc, [star, c]) => acc + Number(star) * c,
          0,
        ) / total
      : 0);
  const displayCount = reviewCount || total;

  /* Sort reviews */
  const sorted = [...PLACEHOLDER].sort((a, b) => {
    if (sortBy === "newest") return b.id - a.id;
    if (sortBy === "highest") return b.rating - a.rating;
    if (sortBy === "lowest") return a.rating - b.rating;
    return b.helpful - a.helpful;
  });

  const handleSubmitReview = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setShowModal(false);
      setSubmitted(false);
      setFormRating(0);
      setFormTitle("");
      setFormBody("");
    }, 1500);
  };

  if (displayCount === 0) {
    return (
      <section className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Ratings & Reviews</h2>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            Write a Review
          </button>
        </div>
        <p className="text-gray-400 text-sm">
          No reviews yet. Be the first to review this product!
        </p>
        {showModal && (
          <ReviewModal
            show={showModal}
            onClose={() => setShowModal(false)}
            formRating={formRating}
            setFormRating={setFormRating}
            formTitle={formTitle}
            setFormTitle={setFormTitle}
            formBody={formBody}
            setFormBody={setFormBody}
            submitted={submitted}
            onSubmit={handleSubmitReview}
            productName={productName}
          />
        )}
      </section>
    );
  }

  return (
    <section className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {/* Header with sort + write review (#6, #7) */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900">Ratings & Reviews</h2>
        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {/* Write review button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Write a Review
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-col sm:flex-row gap-8 pb-6 border-b border-gray-100">
        <div className="flex flex-col items-center justify-center shrink-0 min-w-30">
          <span className="text-5xl font-extrabold text-gray-900">
            {avg.toFixed(1)}
          </span>
          <FilledStars value={avg} size="w-5 h-5" />
          <span className="text-xs text-gray-400 mt-1">
            {displayCount.toLocaleString()} ratings
          </span>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {["5", "4", "3", "2", "1"].map((s) => (
            <RatingBar
              key={s}
              label={s}
              count={breakdown[s] || 0}
              total={total}
            />
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="mt-6 space-y-6">
        {sorted.map((r) => (
          <div
            key={r.id}
            className="pb-6 border-b border-gray-50 last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-100 to-blue-200 flex items-center justify-center shrink-0">
                <span className="text-blue-700 font-bold text-sm">
                  {r.author.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">
                    {r.author}
                  </span>
                  <span className="text-gray-300 text-xs">�</span>
                  <span className="text-gray-400 text-xs">{r.date}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                  <FilledStars value={r.rating} size="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold text-gray-700">
                    {r.rating}/5
                  </span>
                </div>
                {r.title && (
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">
                    {r.title}
                  </p>
                )}
                <p className="text-sm text-gray-600 leading-relaxed">
                  {r.body}
                </p>
                <button className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                  <ThumbsUp className="w-3 h-3" />
                  Helpful ({r.helpful})
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Write Review Modal (#7) */}
      {showModal && (
        <ReviewModal
          show={showModal}
          onClose={() => setShowModal(false)}
          formRating={formRating}
          setFormRating={setFormRating}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formBody={formBody}
          setFormBody={setFormBody}
          submitted={submitted}
          onSubmit={handleSubmitReview}
          productName={productName}
        />
      )}
    </section>
  );
}

/* -- Review Modal -- */
function ReviewModal({
  show,
  onClose,
  formRating,
  setFormRating,
  formTitle,
  setFormTitle,
  formBody,
  setFormBody,
  submitted,
  onSubmit,
  productName,
}) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Write a Review</h3>
        <p className="text-sm text-gray-500 mb-5">{productName}</p>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-7 h-7 text-green-600 fill-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">Thank you!</p>
            <p className="text-sm text-gray-500 mt-1">
              Your review has been submitted.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Rating
              </label>
              <StarPicker value={formRating} onChange={setFormRating} />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Summarize your experience"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Review
              </label>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={4}
                placeholder="Tell others what you think about this product..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={formRating === 0}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors"
            >
              Submit Review
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
