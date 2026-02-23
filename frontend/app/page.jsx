import HeroSection from "@/components/Home/HeroSection";
import HotDeals from "@/components/Home/HotDeals";
import CategorySection from "@/components/Home/CategorySection";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <HeroSection />
      <CategorySection />
      <HotDeals />

      {/* More sections will go here */}
      <div className="py-16">{/* Product sections, deals, etc. */}</div>
    </main>
  );
}
