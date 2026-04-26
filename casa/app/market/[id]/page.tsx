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
    return <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">Loading item...</main>
  }

  if (!item) {
    return <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">Item not found.</main>
  }

  return (
    <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {images.length > 0 ? (
          images.map((img: string, index: number) => (
            <img
              key={`${img}-${index}`}
              src={img}
              alt={`${item.title} ${index + 1}`}
              className="w-full h-52 sm:h-64 object-cover rounded-lg border"
            />
          ))
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            No Images
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow p-6 space-y-3">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold break-words">{item.title}</h1>
        <p className="text-base sm:text-lg lg:text-xl text-green-700 font-semibold">₦{Number(item.price).toLocaleString()}</p>
        <p className="text-sm sm:text-base text-gray-600">{item.location}</p>
        <p className="text-sm sm:text-base text-gray-800 leading-relaxed break-words">{item.description}</p>

        <button
          onClick={handleContactSeller}
          className="mt-4 w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          Contact Seller
        </button>
      </section>
    </main>
  )
}
