"use client";

import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { useRef } from "react";
import Image from "next/image";

export default function HotDeals() {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // TODO: Replace with API call to fetch hot deals from backend
  // Example API call:
  // const fetchHotDeals = async () => {
  //   const response = await fetch('/api/products/hot-deals?lang=en');
  //   const data = await response.json();
  //   setDeals(data.deals);
  // };

  // Sample data - will be replaced with backend data
  const hotDeals = [
    {
      id: 1,
      name: "Fresh Tomatoes",
      quantity: "500g",
      image: "/images/tomatoes.jpg", // TODO: Replace with actual image from backend
      currentPrice: 32,
      originalPrice: 40,
      discount: 20,
      isBestSeller: true,
    },
    {
      id: 2,
      name: "Fresh Potatoes",
      quantity: "1kg",
      image: "/images/potatoes.jpg", // TODO: Replace with actual image from backend
      currentPrice: 25,
      originalPrice: 30,
      discount: 17,
      isBestSeller: false,
    },
    {
      id: 3,
      name: "English Cucumber",
      quantity: "500g",
      image: "/images/cucumber.jpg", // TODO: Replace with actual image from backend
      currentPrice: 24,
      originalPrice: 30,
      discount: 20,
      isBestSeller: false,
    },
    {
      id: 4,
      name: "Yellow Bananas",
      quantity: "1 dozen",
      image: "/images/bananas.jpg", // TODO: Replace with actual image from backend
      currentPrice: 35,
      originalPrice: 45,
      discount: 22,
      isBestSeller: true,
    },
    {
      id: 5,
      name: "Alphonso Mangoes",
      quantity: "1kg",
      image: "/images/mangoes.jpg", // TODO: Replace with actual image from backend
      currentPrice: 299,
      originalPrice: 350,
      discount: 15,
      isBestSeller: true,
    },
    {
      id: 6,
      name: "Toor Dal",
      quantity: "1kg",
      image: "/images/toor-dal.jpg", // TODO: Replace with actual image from backend
      currentPrice: 135,
      originalPrice: 150,
      discount: 10,
      isBestSeller: true,
    },
  ];

  // TODO: Add to cart function - will integrate with backend API
  // const handleAddToCart = async (productId) => {
  //   try {
  //     const response = await fetch('/api/cart/add', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ productId, quantity: 1 })
  //     });
  //     const data = await response.json();
  //     // Update cart state
  //   } catch (error) {
  //     console.error('Error adding to cart:', error);
  //   }
  // };

  const handleAddToCart = (productId) => {
    console.log("Add to cart:", productId);
    // TODO: Integrate with backend cart API
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Hot Deals</h2>
            <p className="text-gray-600 mt-1">
              Limited time offers on your favorite items
            </p>
          </div>

          {/* Navigation Arrows */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-10 h-10 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-10 h-10 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Products Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        >
          {hotDeals.map((product) => (
            <div
              key={product.id}
              className="min-w-[280px] bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex-shrink-0"
            >
              {/* Product Image */}
              <div className="relative h-[200px] bg-gray-100">
                {/* Discount Badge */}
                <div className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-md z-10">
                  {product.discount}% OFF
                </div>

                {/* Best Seller Badge */}
                {product.isBestSeller && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md z-10">
                    Best Seller
                  </div>
                )}

                {/* TODO: Replace with actual product image from backend */}
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  {product.name}
                  <br />
                  Image
                </div>
                {/* Uncomment when images are available:
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                */}
              </div>

              {/* Product Details */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-base mb-1">
                  {product.name}
                </h3>
                <p className="text-gray-500 text-sm mb-3">{product.quantity}</p>

                {/* Price and Add Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">
                      ₹{product.currentPrice}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      ₹{product.originalPrice}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product.id)}
                    className="flex items-center gap-1.5 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
