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

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    location?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}) {
  const params = await searchParams;

  const q = (params?.q || "").trim();
  const location = (params?.location || "").trim();
  const minPrice = params?.minPrice;
  const maxPrice = params?.maxPrice;

  let query = supabase
    .from("market_items")
    .select("*, user_id(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);
  }

  if (location) {
    query = query.ilike("location", `%${location}%`);
  }

  if (minPrice) {
    query = query.gte("price", Number(minPrice));
  }

  if (maxPrice) {
    query = query.lte("price", Number(maxPrice));
  }

  const { data, error } = await query
 
   if (error) {
    console.error("Fetch error:", error)
  }

  const items: MarketItem[] = data || []

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Campus Market</h1>
      </div>

            {/* FILTER */}
      <form method="GET" className="bg-white p-4 rounded shadow mb-6">
        <input
          name="q"
          type="text"
          placeholder="Search item title, description, or category..."
          defaultValue={q}
          className="border p-2 rounded w-full mb-3"
        />

        <input
          name="location"
          type="text"
          placeholder="Search location..."
          defaultValue={location}
          className="border p-2 rounded w-full mb-3"
        />

        {/* POPULAR AREAS */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["Hilltop", "Ekosodin", "Sabo", "Ugbowo", "Town"].map((area) => (
            <button
              key={area}
              type="submit"
              name="location"
              value={area}
              className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm transition"
            >
              {area}
            </button>
          ))}
        </div>

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
