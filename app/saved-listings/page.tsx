"use client"

import { useEffect, useState } from "react"
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
          <div className="space-y-4">
            {saved.map(item => {
              if (!item.property) return null
              const property = item.property
              return (
                <div key={item.savedId} className="border p-4 rounded">
                  <h2 className="text-xl font-semibold">{property.title}</h2>
                  <p>Price: ₦{property.price}</p>
                  <p>Location: {property.location}</p>
                  <button
                    onClick={() => unsave(item.savedId)}
                    className="mt-3 bg-red-600 text-white px-3 py-2 rounded"
                  >
                    Unsave
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
