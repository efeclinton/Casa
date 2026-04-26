import HeroSection from "../components/HeroSection"
import PropertyCard from "../components/PropertyCard"
import { supabase } from "../lib/supabaseClient"

export default async function Home() {

  // Try the RPC first (keeps existing ranking behavior),
  // then fall back to direct table query if the function fails.
  const { data: rpcProperties, error } = await supabase
    .rpc("get_featured_properties")

  let properties = rpcProperties

  if (error) {
    console.error("Error loading featured properties:", error)

    const { data: fallbackProperties, error: fallbackError } = await supabase
      .from("properties")
      .select("id,image,price,title,location,rent_period")
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

      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 mt-2 sm:mt-4">

        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4 sm:mb-6">
          Featured Properties
        </h2>

        {properties && properties.length > 0 ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

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

      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">Campus Market</h2>
          <a href="/market" className="text-sm sm:text-base text-green-700 font-medium hover:underline">
            View all
          </a>
        </div>

        {marketPreview && marketPreview.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {marketPreview.map((item: any) => {
              const image = item.image || (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null)

              return (
                <a
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
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{item.title}</h3>
                    <p className="text-green-700 font-medium text-sm sm:text-base">₦{Number(item.price).toLocaleString()}</p>
                    <p className="text-gray-500 text-sm line-clamp-2 mt-auto">{item.location}</p>
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
