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

  return (
    <main>

      

      <HeroSection />

      <section className="p-10">

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

    </main>
  )
}