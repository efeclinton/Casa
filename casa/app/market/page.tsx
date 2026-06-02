import type { Metadata } from "next"
import MarketItemCard from "@/components/MarketItemCard"
import { supabase } from "../../lib/supabaseClient"

type MarketItem = {
  id: string
  title: string
  description?: string | null
  price: number
  location: string
  image?: string | null
  images?: string[] | null
  is_active?: boolean | null
  updated_at?: string | null
}

export const metadata: Metadata = {
  title: "Campus Market | CASA",
  description:
    "Browse verified campus market items for UNN students with secure seller profiles and transparent pricing.",
  openGraph: {
    title: "Campus Market | CASA",
    description:
      "Browse verified campus market items for UNN students with secure seller profiles and transparent pricing.",
    url: "/market",
    siteName: "CASA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Campus Market | CASA",
    description:
      "Browse verified campus market items for UNN students with secure seller profiles and transparent pricing.",
  },
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
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold sm:text-xl lg:text-2xl">Campus Market</h1>
      </div>

      {/* FILTER */}
      <form method="GET" className="mb-6 rounded bg-white p-4 shadow">
        <input
          name="q"
          type="text"
          placeholder="Search item title, description or category..."
          defaultValue={q}
          className="mb-3 w-full rounded border p-2"
        />

        <div className="flex gap-2">
          <input
            name="minPrice"
            type="number"
            placeholder="Min price"
            defaultValue={minPrice}
            className="w-full rounded border p-2"
          />
          <input
            name="maxPrice"
            type="number"
            placeholder="Max price"
            defaultValue={maxPrice}
            className="w-full rounded border p-2"
          />
        </div>

        <button type="submit" className="mt-3 w-full rounded bg-black py-2 text-white">
          Apply Filters
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-gray-500">No items match your search/filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {items.map((item) => {
            const images = Array.isArray(item.images) ? item.images : []
            const imageUrl = images.length > 0 ? images[0] : item.image || null

            return (
              <MarketItemCard
                key={item.id}
                id={item.id}
                title={item.title}
                price={item.price}
                location={item.location}
                image={imageUrl}
                updatedAt={item.updated_at}
                isActive={item.is_active}
              />
            )
          })}
        </div>
      )}
    </main>
  )
}
