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
    .select("id,title,price,location,image,images")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4">Campus Market</h1>
        <p className="text-red-600">Unable to load market items right now.</p>
      </main>
    )
  }

  const items: MarketItem[] = data || []

  return (
    <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Campus Market</h1>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">No active items yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {items.map((item) => {
            const image =
              item.image ||
              (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null)

            return (
              <Link
                key={item.id}
                href={`/market/${item.id}`}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col"
              >
                {image ? (
                  <img src={image} alt={item.title} className="w-full h-40 sm:h-44 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    No Image
                  </div>
                )}
                <div className="p-3 sm:p-4 space-y-1 flex-1 flex flex-col">
                  <h2 className="font-semibold text-sm sm:text-base line-clamp-2">{item.title}</h2>
                  <p className="text-green-700 font-medium text-sm sm:text-base">₦{Number(item.price).toLocaleString()}</p>
                  <p className="text-gray-500 text-sm line-clamp-2 mt-auto">{item.location}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
