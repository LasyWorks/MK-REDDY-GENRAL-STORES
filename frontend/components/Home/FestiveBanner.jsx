"use client";
import { usePromotions } from "@/context/PromotionContext";
import CountdownTimer from "@/components/common/CountdownTimer";
export default function FestiveBanner() {
  const { activePromos, loading } = usePromotions();
  const banners = activePromos.filter(p => p.banner_text);
  if (loading || banners.length === 0) return null;
  const primary = banners[0];
  const bgColor = primary.theme_color || "#FF6B00";
  return (
    <div className="relative overflow-hidden print:hidden" style={{ backgroundColor: bgColor }}>
      { }
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 relative z-10">
        {banners.length === 1 ? (
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="text-white text-sm font-semibold text-center">
              {primary.banner_text}
            </span>
            <CountdownTimer endsAt={primary.ends_at} compact themeColor="#fff" className="!text-white/90" />
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap gap-16">
              {[...banners, ...banners].map((b, i) => (
                <span key={i} className="inline-flex items-center gap-3 text-white text-sm font-semibold">
                  <span>{b.banner_text}</span>
                  <CountdownTimer endsAt={b.ends_at} compact themeColor="#fff" className="!text-white/90" />
                  <span className="text-white/40">•</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
