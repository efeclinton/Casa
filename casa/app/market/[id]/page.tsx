"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

export default function MarketItemDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadItem = async () => {
      const { data } = await supabase
        .from("market_items")
        .select("*")
        .eq("id", id)
        .single()

      setItem(data)
      setLoading(false)
    }

    if (!id) return
    loadItem()
  }, [id])

  const images = useMemo(() => {
    if (!item) return []
    if (Array.isArray(item.images) && item.images.length > 0) return item.images
    if (item.image) return [item.image]
    return []
  }, [item])

  const handleContactSeller = () => {
    if (!item?.whatsapp_number) return
    const message = `Hi, I’m interested in your item: ${item.title}`
    window.open(`https://wa.me/${item.whatsapp_number}?text=${encodeURIComponent(message)}`)
  }

  if (loading) {
    return <main className="max-w-4xl mx-auto p-10">Loading item...</main>
  }

  if (!item) {
    return <main className="max-w-4xl mx-auto p-10">Item not found.</main>
  }

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.length > 0 ? (
          images.map((img: string, index: number) => (
            <img
              key={`${img}-${index}`}
              src={img}
              alt={`${item.title} ${index + 1}`}
              className="w-full h-64 object-cover rounded-lg border"
            />
          ))
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            No Images
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow p-6 space-y-3">
        <h1 className="text-3xl font-bold">{item.title}</h1>
        <p className="text-2xl text-green-700 font-semibold">₦{Number(item.price).toLocaleString()}</p>
        <p className="text-gray-600">{item.location}</p>
        <p className="text-gray-800 leading-relaxed">{item.description}</p>

        <button
          onClick={handleContactSeller}
          className="mt-4 px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          Contact Seller
        </button>
      </section>
    </main>
  )
}
