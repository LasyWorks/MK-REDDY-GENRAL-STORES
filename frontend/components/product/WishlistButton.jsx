"use client";
import { useState, useEffect } from "react";
import { Heart } from "lucide-react";

export default function WishlistButton({ productId, productName }) {
  const [wished, setWished] = useState(false);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setWished(saved.includes(productId));
    } catch {}
  }, [productId]);

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const saved = JSON.parse(localStorage.getItem("wishlist") || "[]");
      const next = saved.includes(productId)
        ? saved.filter((id) => id !== productId)
        : [...saved, productId];
      localStorage.setItem("wishlist", JSON.stringify(next));
      setWished(next.includes(productId));
      setPop(true);
      setTimeout(() => setPop(false), 400);
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      title={wished ? "Remove from wishlist" : "Save to wishlist"}
      className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
        ${wished ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:border-red-300 hover:bg-red-50"}
        ${pop ? "scale-125" : "scale-100"}
      `}
    >
      <Heart
        className={`w-5 h-5 transition-colors duration-200 ${
          wished ? "text-red-500 fill-red-500" : "text-gray-400"
        }`}
      />
    </button>
  );
}
