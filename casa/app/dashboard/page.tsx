"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import PropertyCard from "../../components/PropertyCard"
import Link from "next/link"
import { formatUpdatedAtLabel } from "../../lib/activity"
import { DashboardSkeleton } from "../../components/LoadingSkeletons"

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
  location?: string | null;
  images?: string[] | null;
  updated_at?: string | null;
}

export default function Dashboard() {

  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [isAgent, setIsAgent] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState("")
  const [filter, setFilter] = useState("all")

  useEffect(() => {

    const fetchData = async () => {

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("agent_status,verification_status")
        .eq("id", session.user.id)
        .single()

      if (profile?.agent_status !== "approved") {
        router.push("/profile")
        return
      }

      setCurrentUserId(session.user.id)

      const [{ data }, { data: items }] = await Promise.all([
        supabase
          .from("properties")
          .select("*")
          .eq("owner_id", session.user.id)
          .order("is_active", { ascending: false })
          .order("updated_at", { ascending: false, nullsFirst: false }),
        supabase
          .from("market_items")
          .select("id,title,price,is_active,images,location")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
      ])

      setIsAgent(profile.agent_status === "approved")
      setVerificationStatus(profile?.verification_status || "pending")
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
  const renewedAt = new Date().toISOString()

  try {
    const { error } = await supabase.rpc("renew_property_listing", {
      property_id: property.id,
    })

    if (error) {
      console.log(error)
      alert("Failed to renew listing")
      return
    }

    setProperties((prev) =>
      prev.map((p) =>
        p.id === property.id ? { ...p, updated_at: renewedAt } : p
      )
    )

    alert("Listing renewed")
  } finally {
    setTogglingId(null)
  }
}

  if (loading) {
    return <DashboardSkeleton />
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
                  images={property.images}
                  price={property.price}
                  title={property.title}
                  location={property.location}
                  rent_period={property.rent_period}
                  updatedAt={property.updated_at}
                  inquiryCount={property.inquiry_count ?? 0}
                  agentVerificationStatus={verificationStatus}
                  isActive={property.is_active}
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
              const updatedText = formatUpdatedAtLabel(item.updated_at)

              return (
                <Link key={item.id} href={`/market/${item.id}`} className="group block h-full w-full">
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition md:group-hover:-translate-y-1 md:group-hover:shadow-[0_20px_55px_rgba(15,23,42,0.14)]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-slate-100">
                    <img
                      src={imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.03]"
                      onError={(event) => {
                        event.currentTarget.src = "https://via.placeholder.com/400x300?text=No+Image"
                      }}
                    />
                      <div className="absolute left-3 top-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur ${item.is_active ? "bg-emerald-50/95 text-emerald-700" : "bg-white/95 text-slate-600"}`}>
                          {item.is_active ? "Available" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-h-[250px] flex-1 flex-col p-4 sm:p-5">
                      <p className="text-green-700 font-semibold text-lg">₦{Number(item.price).toLocaleString()}</p>
                      <p className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-slate-950">{item.title}</p>
                      <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-500">{item.location || "Location not provided"}</p>
                      {updatedText && <p className="mt-2 text-xs font-medium text-slate-400">{updatedText}</p>}
                      <p className={`sr-only mt-2 text-xs font-medium ${item.is_active ? "text-green-700" : "text-gray-500"}`}>
                        {item.is_active ? "Active" : "Inactive"}
                      </p>

                      <div className="mt-auto pt-5">
                        <span className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition md:group-hover:bg-emerald-700">
                          View Details
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-4 text-sm">
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
