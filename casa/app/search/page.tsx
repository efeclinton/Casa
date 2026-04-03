import { supabase } from "../../lib/supabaseClient"
import PropertyCard from "../../components/PropertyCard"

type Property = {
  id: string;
  image: string;
  price: number;
  title: string;
  location: string;
  rent_period: string;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    location?: string
    minPrice?: string
    maxPrice?: string
    rentPeriod?: string
  }>
}) {

  const params = await searchParams

  const location = (params?.location || "").trim()
  const minPrice = params?.minPrice
  const maxPrice = params?.maxPrice
  const rentPeriod = params?.rentPeriod

  let query = supabase.from("properties").select("*")

  if (location) {
    query = query.ilike("location", `%${location}%`)
  }

  if (minPrice) {
    query = query.gte("price", Number(minPrice))
  }

  if (maxPrice) {
    query = query.lte("price", Number(maxPrice))
  }

  if (rentPeriod) {
    query = query.eq("rent_period", rentPeriod)
  }

  const { data } = await query

  const properties: Property[] = data || []

  return (
    <main>

      

      <section className="p-10">

        <h1 className="text-2xl font-semibold mb-6">
          Results for &quot;{location}&quot;
        </h1>

        {properties.length > 0 ? (

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {properties.map((property: Property) => (
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
            No listings found with the selected filters
          </p>

        )}

      </section>

    </main>
  )
}