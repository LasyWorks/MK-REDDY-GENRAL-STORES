export default function ProductSkeleton() {
  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200" />

      {/* Text placeholders */}
      <div className="p-3 space-y-2.5">
        {/* Brand */}
        <div className="h-2.5 w-16 bg-gray-200 rounded-full" />
        {/* Name */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-full" />
          <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        </div>
        {/* Unit */}
        <div className="h-2.5 bg-gray-200 rounded w-1/3" />
        {/* Stars */}
        <div className="flex gap-1 items-center">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-sm bg-gray-200" />
          ))}
          <div className="h-2.5 w-8 bg-gray-200 rounded ml-1" />
        </div>
        {/* Divider */}
        <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-2.5 w-12 bg-gray-200 rounded" />
          </div>
          <div className="h-7 w-16 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
