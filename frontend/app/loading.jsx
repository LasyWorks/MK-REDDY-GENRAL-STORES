/**
 * Root `loading.jsx` – shown while any server component in the route tree is loading.
 * Matches the store theme so transitions feel seamless.
 */
export default function Loading() {
  return (
    <div className="min-h-[80vh] bg-gray-50 flex flex-col items-center justify-center gap-5 px-4">
      {/* Animated store logo */}
      <div className="relative">
        <div className="bg-blue-600 text-white font-extrabold text-2xl rounded-2xl w-16 h-16 flex items-center justify-center shadow-lg shadow-blue-200 animate-pulse">
          MK
        </div>
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-2xl border-4 border-blue-300 border-t-blue-600 animate-spin" />
      </div>

      <p className="text-gray-400 text-sm font-medium animate-pulse">
        Loading fresh products…
      </p>

      {/* Skeleton page preview */}
      <div className="w-full max-w-4xl mt-4 space-y-6 px-4">
        {/* Hero skeleton */}
        <div className="h-40 bg-gray-200 rounded-2xl animate-pulse" />

        {/* Category pills skeleton */}
        <div className="flex gap-4 overflow-hidden">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-3 w-12 bg-gray-200 animate-pulse rounded-full" />
            </div>
          ))}
        </div>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="h-40 bg-gray-200 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 animate-pulse rounded w-full" />
                <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-5 bg-gray-200 animate-pulse rounded w-16" />
                  <div className="h-7 bg-gray-200 animate-pulse rounded-lg w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
