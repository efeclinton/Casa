import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

type MarketItem = {
  id: string
  title: string
  price: number
  location: string
  image?: string | null
  images?: string[] | null
}

export default async function MarketPage() {
  const { data, error } = await supabase
    .from("market_items")
    .select("*, user_id(*)")
    .eq("is_active", true)
 
  console.log(data)

  if (error) {
    console.error("Fetch error:", error)
  } else {
    console.log("Fetched items:", data)
  }

  const items: MarketItem[] = data || []

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Campus Market</h1>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">No active items yet.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => {
            const images = Array.isArray(item.images) ? item.images : []
            const imageUrl = images.length > 0 ? images[0] : null

            return (
              <Link
                key={item.id}
                href={`/market/${item.id}`}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={item.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    No Image
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <h2 className="font-semibold line-clamp-1">{item.title}</h2>
                  <p className="text-green-700 font-medium">₦{Number(item.price).toLocaleString()}</p>
                  <p className="text-gray-500 text-sm line-clamp-1">{item.location}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
