import dynamic from "next/dynamic";
import CategorySection from "@/components/Home/CategorySection";
import MobileBannerCarousel from "@/components/Home/MobileBannerCarousel";
import LazySection from "@/components/common/LazySection";

// Lazy load below-the-fold components for better initial page load
const PromotionalProducts = dynamic(
  () => import("@/components/Home/PromotionalProducts"),
  {
    loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
    ssr: true, // Keep SSR for SEO
  },
);

const HotDeals = dynamic(() => import("@/components/Home/HotDeals"), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
  ssr: true,
});

const NewArrivals = dynamic(() => import("@/components/Home/NewArrivals"), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
  ssr: true,
});

const RecentlyUpdated = dynamic(
  () => import("@/components/Home/RecentlyUpdated"),
  {
    loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
    ssr: true,
  },
);

const FeaturedProducts = dynamic(
  () => import("@/components/Home/FeaturedProducts"),
  {
    loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
    ssr: true,
  },
);

const SnacksSection = dynamic(() => import("@/components/Home/SnacksSection"), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
  ssr: true,
});

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F7F7F7]">
      {/* ─── PRIMARY ZONE: Hero + Categories ─── */}
      <MobileBannerCarousel />
      <CategorySection />

      {/* ─── TIER 1: Primary featured products (highest priority) ─── */}
      <div className="pt-8 md:pt-12 pb-10 md:pb-14">
        <LazySection
          fallback={
            <div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />
          }
          rootMargin="100px"
        >
          <FeaturedProducts />
        </LazySection>
      </div>

      {/* ─── TIER 2: Secondary discovery sections ─── */}
      <div className="pt-2 md:pt-4 space-y-3 md:space-y-5 pb-8 md:pb-12">
        <LazySection
          fallback={
            <div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />
          }
          rootMargin="100px"
        >
          <PromotionalProducts />
        </LazySection>

        <LazySection
          fallback={
            <div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />
          }
          rootMargin="100px"
        >
          <HotDeals />
        </LazySection>

        <LazySection
          fallback={
            <div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />
          }
          rootMargin="100px"
        >
          <RecentlyUpdated />
        </LazySection>

        <LazySection
          fallback={
            <div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />
          }
          rootMargin="100px"
        >
          <NewArrivals />
        </LazySection>

        <LazySection
          fallback={
            <div className="h-96 bg-gray-100 animate-pulse rounded-lg mx-4" />
          }
          rootMargin="100px"
        >
          <SnacksSection />
        </LazySection>
      </div>
    </main>
  );
}
