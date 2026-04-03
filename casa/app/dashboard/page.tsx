"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import PropertyCard from "../../components/PropertyCard"
import Link from "next/link"

type Property = {
  id: string;
  image: string;
  price: number;
  title: string;
  location: string;
  rent_period: string;
}

export default function Dashboard() {

  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {

    const fetchData = async () => {

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", session.user.id)

      setProperties(data || [])
      setLoading(false)

    }

    fetchData()

  }, [router])

 const deleteProperty = async (property:any) => {

  const confirmDelete = confirm("Delete this listing?")

  if (!confirmDelete) return

  // Delete images from storage
  if (property.images?.length) {

    const imagePaths = property.images.map((url:string) =>
      url.split("/property-images/")[1]
    )

    await supabase.storage
      .from("property-images")
      .remove(imagePaths)

  }

  // Delete videos from storage
  if (property.videos?.length) {

    const videoPaths = property.videos.map((url:string) =>
      url.split("/property-videos/")[1]
    )

    await supabase.storage
      .from("property-videos")
      .remove(videoPaths)

  }

  // Delete database row
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", property.id)

  if (error) {

    console.log(error)
    alert("Failed to delete property")
    return

  }

  setProperties((prev:any) =>
    prev.filter((p:any) => p.id !== property.id)
  )

}

  if (loading) {
    return <p className="p-10">Loading...</p>
  }

  return (

    <main>

      

      <section className="p-10">

        <h1 className="text-2xl font-semibold mb-6">
          My Listings
        </h1>

        {properties.length > 0 ? (

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {properties.map((property: Property) => (

              <div key={property.id}>

                <PropertyCard
                  image={property.image}
                  price={property.price}
                  title={property.title}
                  location={property.location}
                  rent_period={property.rent_period}
                  id={property.id}
                />

                {/* Edit + Delete buttons */}
                <div className="flex gap-4 mt-2">

                  <Link
                    href={`/edit-property/${property.id}`}
                    className="text-blue-600 text-sm"
                  >
                    Edit
                  </Link>

                  <button
                   onClick={() => deleteProperty(property)}
                    className="text-red-600 text-sm"
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        ) : (

          <p className="text-gray-500">
            You haven&apos;t listed any properties yet.
          </p>

        )}

      </section>

    </main>
  )
}