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
  is_active: boolean;
}

export default function Dashboard() {

  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [filter, setFilter] = useState("all")

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

   const toggleListingStatus = async (property: Property) => {

    if (togglingId === property.id) return

    const nextIsActive = !property.is_active

    setTogglingId(property.id)

    try {

      const { error } = await supabase
        .from("properties")
        .update({ is_active: nextIsActive })
        .eq("id", property.id)

      if (error) {

        console.log(error)
        alert("Failed to update listing status")
        return

      }

      setProperties((prev) =>
        prev.map((p) =>
          p.id === property.id ? { ...p, is_active: nextIsActive } : p
        )
      )

      alert(nextIsActive ? "Listing activated" : "Listing deactivated")

    } finally {

      setTogglingId(null)

    }

   }

  if (loading) {
    return <p className="p-10">Loading...</p>
  }

  const listings = properties
  const filteredListings = listings.filter((property) => {
    if (filter === "active") return property.is_active === true
    if (filter === "inactive") return property.is_active === false
    return true
  })

  return (

    <main>

      

      <section className="p-10">

        <h1 className="text-2xl font-semibold mb-6">
          My Listings
        </h1>

        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          background: "#f5f5f5",
          padding: "6px",
          borderRadius: "10px",
          width: "fit-content"
        }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: filter === "all" ? "#000" : "transparent",
              color: filter === "all" ? "#fff" : "#333",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: filter === "active" ? "#000" : "transparent",
              color: filter === "active" ? "#fff" : "#333",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("inactive")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: filter === "inactive" ? "#000" : "transparent",
              color: filter === "inactive" ? "#fff" : "#333",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
          >
            Inactive
          </button>
        </div>

        {filteredListings.length > 0 ? (

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {filteredListings.map((property: Property) => (

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

                  <button
                    onClick={() => toggleListingStatus(property)}
                    disabled={togglingId === property.id}
                    className="text-sm text-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {togglingId === property.id
                      ? "Updating..."
                      : property.is_active
                        ? "Deactivate Listing"
                        : "Activate Listing"}
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