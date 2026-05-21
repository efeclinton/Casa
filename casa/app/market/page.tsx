import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

type MarketItem = {
  id: string
  title: string
  description?: string | null
  price: number
  location: string
  image?: string | null
  images?: string[] | null
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    minPrice?: string
    maxPrice?: string
  }>
}) {
  const params = await searchParams

  const q = (params?.q || "").trim()
  const minPrice = params?.minPrice
  const maxPrice = params?.maxPrice

  let query = supabase
    .from("market_items")
    .select("*, user_id(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

      if (q) {
    // Normalize and sanitize user input
    const normalized = q.replace(/\s+/g, " ").trim()
    const safeQ = normalized.replace(/[%_,()]/g, " ")

    // Single OR clause across both searchable fields
    // This gives flexible partial matching for full query text, e.g. "bed stand"
    query = query.or(
      `title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`
    )
  }

  if (minPrice) {
    query = query.gte("price", Number(minPrice))
  }

  if (maxPrice) {
    query = query.lte("price", Number(maxPrice))
  }

    const { data, error } = await query

  if (error) {
    console.error("Market fetch failed")
    console.error("Supabase error message:", error.message)
    console.error("Supabase error details:", error.details)
    console.error("Supabase error hint:", error.hint)
    console.error("Supabase error code:", error.code)
    console.error("Raw error JSON:", JSON.stringify(error, null, 2))
  }

  const items: MarketItem[] = data || []

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Campus Market</h1>
      </div>

      {/* FILTER */}
      <form method="GET" className="bg-white p-4 rounded shadow mb-6">
        <input
          name="q"
          type="text"
          placeholder="Search item title, description or category..."
          defaultValue={q}
          className="border p-2 rounded w-full mb-3"
        />

        <div className="flex gap-2">
          <input
            name="minPrice"
            type="number"
            placeholder="Min price"
            defaultValue={minPrice}
            className="border p-2 rounded w-full"
          />
          <input
            name="maxPrice"
            type="number"
            placeholder="Max price"
            defaultValue={maxPrice}
            className="border p-2 rounded w-full"
          />
        </div>

        <button type="submit" className="mt-3 w-full bg-black text-white py-2 rounded">
          Apply Filters
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-gray-500">No items match your search/filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {items.map((item) => {
            const images = Array.isArray(item.images) ? item.images : []
            const imageUrl = images.length > 0 ? images[0] : null

            return (
              <Link
                key={item.id}
                href={`/market/${item.id}`}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={item.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    No Image
                  </div>
                )}
                <div className="p-3 sm:p-4 space-y-1 flex flex-col justify-between flex-1">
                  <h2 className="font-semibold text-sm sm:text-base line-clamp-2">{item.title}</h2>
                  <p className="text-green-700 font-medium text-sm sm:text-base">₦{Number(item.price).toLocaleString()}</p>
                  <p className="text-gray-500 text-sm line-clamp-2">{item.location}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}