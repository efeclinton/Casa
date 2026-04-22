import HeroSection from "../components/HeroSection"
import PropertyCard from "../components/PropertyCard"
import { supabase } from "../lib/supabaseClient"

export default async function Home() {

  // Try the RPC first (keeps existing ranking behavior),
  // then fall back to direct table query if the function fails.
  const { data: rpcProperties, error } = await supabase
    .rpc("get_featured_properties")

  let properties = (rpcProperties || []).filter((property: any) => property.is_active === true)

  if (error) {
    console.error("Error loading featured properties:", error)

    const { data: fallbackProperties, error: fallbackError } = await supabase
      .from("properties")
      .select("id,image,price,title,location,rent_period")
      .eq("is_active", true)
      .limit(6)

    if (fallbackError) {
      console.error("Fallback featured properties query failed:", fallbackError)
    } else {
      properties = fallbackProperties
    }
  }

  const { data: marketPreview } = await supabase
    .from("market_items")
    .select("id,title,price,location,image,images")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6)

  return (
    <main>

      

      <HeroSection />

      <section className="p-10 mt-8 md:mt-12">

        <h2 className="text-2xl font-semibold mb-6">
          Featured Properties
        </h2>

        {properties && properties.length > 0 ? (

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {properties.map((property:any) => (

              <PropertyCard
                key={property.id}
                image={property.image}
                price={property.price}
                title={property.title}
                location={property.location}
                rent_period={property.rent_period}
                id={property.id}
              />

            ))}

          </div>

        ) : (

          <p className="text-gray-500">
            No featured listings yet.
          </p>

        )}

      </section>

      <section className="p-10 pt-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Campus Market</h2>
          <a href="/market" className="text-green-700 font-medium hover:underline">
            View all
          </a>
        </div>

        {marketPreview && marketPreview.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {marketPreview.map((item: any) => {
              const image = item.image || (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null)

              return (
                <a
                  key={item.id}
                  href={`/market/${item.id}`}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
                >
                  {image ? (
                    <img src={image} alt={item.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                    <p className="text-green-700 font-medium">₦{Number(item.price).toLocaleString()}</p>
                    <p className="text-gray-500 text-sm line-clamp-1">{item.location}</p>
                  </div>
                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500">No market items yet.</p>
        )}
      </section>

    </main>
  )
}
