"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import PropertyCard from "../../components/PropertyCard"
import Link from "next/link"

type Property = {
  id: string;
  image: string;
  images?: string[];
  videos?: string[];
  price: number;
  title: string;
  location: string;
  rent_period: string;
  is_active: boolean;
  updated_at?: string | null;
  inquiry_count?: number | null;
}

type MarketItem = {
  id: string;
  title: string;
  price: number;
  is_active: boolean;
  images?: string[] | null;
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
          .select("id,title,price,is_active,images")
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

 const deleteProperty = async (property: Property) => {

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

  setProperties((prev) =>
    prev.filter((p) => p.id !== property.id)
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

const renewListing = async (property: Property) => {
  if (togglingId === property.id) return

  setTogglingId(property.id)
  const now = new Date().toISOString()

  try {
    const { error } = await supabase
      .from("properties")
      .update({ updated_at: now })
      .eq("id", property.id)

    if (error) {
      console.log(error)
      alert("Failed to renew listing")
      return
    }

    setProperties((prev) =>
      prev.map((p) =>
        p.id === property.id ? { ...p, updated_at: now } : p
      )
    )

    alert("Listing renewed")
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
                  updatedAt={property.updated_at}
                  inquiryCount={property.inquiry_count ?? 0}
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

                  <button
                    onClick={() => renewListing(property)}
                    disabled={togglingId === property.id}
                    className="text-sm text-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {togglingId === property.id ? "Renewing..." : "Renew"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketItems.map((item) => {
              const imageUrl = item.images?.[0] || "https://via.placeholder.com/400x300?text=No+Image"

              return (
                <Link key={item.id} href={`/market/${item.id}`} className="block w-full">
                  <div className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition w-full">
                    <img
                      src={imageUrl}
                      alt={item.title}
                      className="w-full h-[220px] object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "https://via.placeholder.com/400x300?text=No+Image"
                      }}
                    />

                    <div className="p-4 flex flex-col min-h-[140px]">
                      <p className="text-green-700 font-semibold text-lg">₦{Number(item.price).toLocaleString()}</p>
                      <p className="font-semibold text-gray-900 line-clamp-2 mt-1">{item.title}</p>
                      <p className={`text-xs font-medium mt-2 ${item.is_active ? "text-green-700" : "text-gray-500"}`}>
                        {item.is_active ? "Active" : "Inactive"}
                      </p>

                      <div className="mt-auto pt-4 flex items-center gap-3 text-sm">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            router.push(`/dashboard/post-item?edit=${item.id}`)
                          }}
                          className="text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            deleteMarketItem(item)
                          }}
                          className="text-red-600"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            toggleMarketItem(item)
                          }}
                          className="text-indigo-600"
                        >
                          {item.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

    </main>
  )
}
