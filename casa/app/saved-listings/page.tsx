"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

export default function SavedListingsPage() {
  const [saved, setSaved] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSaved = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSaved([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("saved_listings")
        .select("id, property_id, properties(*)")
        .eq("user_id", user.id)

      if (error) {
        console.error("Failed to load saved listings", error)
        alert("Failed to load saved listings: " + error.message)
        setLoading(false)
        return
      }

      const structured = (data || []).map((item: any) => ({
        savedId: item.id,
        propertyId: item.property_id,
        property: item.properties
      }))

      setSaved(structured)
      setLoading(false)
    }

    loadSaved()
  }, [])

  const unsave = async (savedId:string) => {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("id", savedId)

    if (error) {
      console.error("Failed to unsave", error)
      alert("Failed to remove saved listing: " + error.message)
      return
    }

    setSaved(prev => prev.filter(item => item.savedId !== savedId))
  }

  if (loading) {
    return <p className="p-10">Loading saved listings...</p>
  }

  return (
    <main>
      

      <section className="p-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Saved Listings</h1>

        {saved.length === 0 ? (
          <p className="text-gray-500">You have no saved listings yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {saved.map(item => {
              if (!item.property) return null
              const property = item.property
              const image = Array.isArray(property.images) && property.images.length > 0
                ? property.images[0]
                : null

              return (
                <div
                  key={item.savedId}
                  className="relative rounded-xl shadow-md overflow-hidden bg-white transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg"
                >
                  <Link href={`/property/${item.propertyId}`} className="block">
                    {image ? (
                      <img
                        src={image}
                        alt={property.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                        No Image
                      </div>
                    )}
                    <div className="p-4">
                      <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">{property.title}</h2>
                      <p className="text-green-700 font-medium mt-1">₦{Number(property.price).toLocaleString()}</p>
                      <p className="text-gray-500 text-sm mt-1">{property.location}</p>
                    </div>
                  </Link>
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); unsave(item.savedId) }}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-full shadow"
                    >
                      Unsave
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
