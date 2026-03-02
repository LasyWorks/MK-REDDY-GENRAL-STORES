import dynamic from "next/dynamic";
import HeroSection from "@/components/Home/HeroSection";
import CategorySection from "@/components/Home/CategorySection";
import LazySection from "@/components/common/LazySection";

// Lazy load below-the-fold components for better initial page load
const PromotionalProducts = dynamic(
  () => import("@/components/Home/PromotionalProducts"),
  {
    loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
    ssr: true, // Keep SSR for SEO
  }
);

const HotDeals = dynamic(() => import("@/components/Home/HotDeals"), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
  ssr: true,
});

const FeaturedProducts = dynamic(
  () => import("@/components/Home/FeaturedProducts"),
  {
    loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
    ssr: true,
  }
);

const SnacksSection = dynamic(() => import("@/components/Home/SnacksSection"), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
  ssr: true,
});

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Above the fold - load immediately */}
      <HeroSection />
      <CategorySection />

      {/* Below the fold - lazy load with IntersectionObserver */}
      <LazySection
        fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />}
        rootMargin="100px"
      >
        <PromotionalProducts />
      </LazySection>

      <LazySection
        fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />}
        rootMargin="100px"
      >
        <HotDeals />
      </LazySection>

      <LazySection
        fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />}
        rootMargin="100px"
      >
        <FeaturedProducts />
      </LazySection>

      <LazySection
        fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />}
        rootMargin="100px"
      >
        <SnacksSection />
      </LazySection>
    </main>
  );
}
