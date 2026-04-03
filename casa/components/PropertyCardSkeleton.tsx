export default function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden animate-pulse">

      {/* Image placeholder */}
      <div className="w-full h-[220px] bg-gray-300"></div>

      <div className="p-4 space-y-3">

        <div className="h-5 bg-gray-300 rounded w-1/2"></div>

        <div className="h-4 bg-gray-300 rounded w-3/4"></div>

        <div className="h-4 bg-gray-300 rounded w-1/3"></div>

        <div className="h-4 bg-gray-300 rounded w-1/4"></div>

      </div>

    </div>
  )
}