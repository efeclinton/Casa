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

type MarketItem = {
  id: string;
  title: string;
  price: number;
  is_active: boolean;
}

export default function Dashboard() {

  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [isAgent, setIsAgent] = useState(false)
  const [currentUserId, setCurrentUserId] = useState("")
  const [filter, setFilter] = useState("all")

  useEffect(() => {

    const fetchData = async () => {

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      setCurrentUserId(session.user.id)

      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", session.user.id)

      const [{ data: profile }, { data: items }] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,agent_status")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("market_items")
          .select("id,title,price,is_active")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
      ])

      setIsAgent(profile?.role === "agent" || profile?.agent_status === "approved")
      setMarketItems(items || [])
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

const toggleMarketItem = async (item: MarketItem) => {
  const { error } = await supabase
    .from("market_items")
    .update({ is_active: !item.is_active })
    .eq("id", item.id)

  if (error) {
    alert("Failed to update item status")
    return
  }

  setMarketItems((prev) =>
    prev.map((x) => x.id === item.id ? { ...x, is_active: !x.is_active } : x)
  )
}

const deleteMarketItem = async (item: MarketItem) => {
  const ok = confirm("Delete this item?")
  if (!ok) return

  const { error } = await supabase
    .from("market_items")
    .delete()
    .eq("id", item.id)
    .eq("user_id", currentUserId)

  if (error) {
    alert("Failed to delete item")
    return
  }

  setMarketItems((prev) => prev.filter((x) => x.id !== item.id))
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
    return <p className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">Loading...</p>
  }

  const listings = properties
  const filteredListings = listings.filter((property) => {
    if (filter === "active") return property.is_active === true
    if (filter === "inactive") return property.is_active === false
    return true
  })

  return (

    <main className="w-full overflow-x-hidden">

      

      <section className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">

        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4 sm:mb-6">
          My Listings
        </h1>

        <div className="inline-flex flex-wrap gap-2 mb-4 sm:mb-6 bg-gray-100 p-1.5 rounded-lg">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-2 rounded-md min-h-10 text-sm font-medium transition ${
              filter === "all" ? "bg-black text-white" : "text-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-2 rounded-md min-h-10 text-sm font-medium transition ${
              filter === "active" ? "bg-black text-white" : "text-gray-700"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("inactive")}
            className={`px-3 py-2 rounded-md min-h-10 text-sm font-medium transition ${
              filter === "inactive" ? "bg-black text-white" : "text-gray-700"
            }`}
          >
            Inactive
          </button>
        </div>

        {filteredListings.length > 0 ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

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
                <div className="flex flex-wrap gap-3 mt-2">

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

      <section className="w-full max-w-6xl mx-auto px-4 pb-6 sm:pb-8">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">My Items</h2>

          {isAgent && (
            <Link href="/dashboard/post-item" className="w-full sm:w-auto text-center px-4 py-2.5 min-h-10 bg-black text-white rounded text-sm">
              Post Item
            </Link>
          )}
        </div>

        {marketItems.length === 0 ? (
          <p className="text-gray-500">You haven&apos;t posted any market item yet.</p>
        ) : (
          <div className="space-y-3">
            {marketItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-600">₦{Number(item.price).toLocaleString()}</p>
                  <p className={`text-xs font-medium ${item.is_active ? "text-green-700" : "text-gray-500"}`}>
                    {item.is_active ? "Active" : "Inactive"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Link href={`/dashboard/post-item?edit=${item.id}`} className="text-blue-600">Edit</Link>
                  <button onClick={() => deleteMarketItem(item)} className="text-red-600">Delete</button>
                  <button onClick={() => toggleMarketItem(item)} className="text-indigo-600">
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  )
}
