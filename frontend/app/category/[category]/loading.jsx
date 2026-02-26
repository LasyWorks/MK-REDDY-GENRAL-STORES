export default function Loading() {
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-200 h-11 animate-pulse" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 mt-6">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block w-64 shrink-0 space-y-4">
            <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
          </div>

          {/* Grid Skeleton */}
          <div className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-100 rounded-xl overflow-hidden h-[340px] animate-pulse"
                >
                  <div className="h-[180px] bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-6 bg-gray-200 rounded w-1/3 mt-4" />
                    <div className="h-10 bg-gray-200 rounded w-full mt-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
