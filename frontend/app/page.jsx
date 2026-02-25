import HeroSection from "@/components/Home/HeroSection";
import HotDeals from "@/components/Home/HotDeals";
import CategorySection from "@/components/Home/CategorySection";
import FeaturedProducts from "@/components/Home/FeaturedProducts";
import PromotionalProducts from "@/components/Home/PromotionalProducts";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <HeroSection />
      <CategorySection />
      <PromotionalProducts />
      <HotDeals />
      <FeaturedProducts />
    </main>
  );
}
