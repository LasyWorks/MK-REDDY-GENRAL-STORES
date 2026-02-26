import {
  Clock,
  Truck,
  CheckCircle,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          { }
          <div className="space-y-6">
            { }
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                Delivery in 10 minutes
              </span>
            </div>
            { }
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Fresh Groceries
              </h1>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-600 leading-tight">
                Delivered Fast
              </h2>
            </div>
            { }
            <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-lg">
              Get your daily essentials delivered to your doorstep in minutes.
              Fresh vegetables, fruits, dairy, and more at the best prices.
            </p>
            { }
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-base hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
                Shop Now
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-base border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 transition-colors">
                Explore Fruits
              </button>
            </div>
            { }
            <div className="flex flex-col sm:flex-row gap-6 pt-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Truck className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">
                  Free delivery above ₹199
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">
                  100% fresh guarantee
                </span>
              </div>
            </div>
          </div>
          { }
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              { }
              <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                <div className="bg-amber-200/80 px-8 py-4 rounded-lg rotate-[-5deg] shadow-lg">
                  <span className="text-3xl font-bold text-amber-900">
                    Order Online
                  </span>
                </div>
              </div>
              { }
              <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-xl px-6 py-4 max-w-[240px]">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <ShoppingBag className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      2000+ Products
                    </p>
                    <p className="text-sm text-gray-600">
                      Across 11 categories
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}