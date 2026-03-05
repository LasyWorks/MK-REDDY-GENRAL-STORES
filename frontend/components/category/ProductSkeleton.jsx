export default function ProductSkeleton() {
  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[14px] md:rounded-2xl overflow-hidden animate-pulse shadow-sm">
      {/* Image placeholder */}
      <div
        className="w-full bg-gradient-to-br from-gray-100 to-gray-200"
        style={{ height: "115px" }}
      />

      {/* Text placeholders */}
      <div className="px-4 pt-3 pb-3 md:px-2.5 md:pt-2 md:pb-2.5 space-y-0">
        {/* Product name — 2 lines */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-full" />
          <div className="h-3.5 bg-gray-200 rounded w-4/5" />
        </div>
        {/* Variant / size */}
        <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
        {/* Price */}
        <div className="h-5 bg-gray-200 rounded w-2/5 mt-3" />
        {/* ADD button — full width, taller on mobile */}
        <div className="h-[46px] md:h-[34px] bg-gray-200 rounded-[12px] md:rounded-full mt-2" />
      </div>
    </div>
  );
}
