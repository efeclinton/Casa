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
        .select("*, user_id(*)")
        .eq("id", id)
        .single()

      console.log(data)

      setItem(data)
      setLoading(false)
    }

    if (!id) return
    loadItem()
  }, [id])

  const imageUrl = useMemo(() => {
    if (!item) return null
    const images = item.images ?? []
    return images.length > 0 ? images[0] : null
  }, [item])

  const handleContactSeller = () => {
    console.log("MARKET ITEM USER:", item?.user_id)

    let phone = item?.user_id?.phone ? String(item.user_id.phone) : String(item?.user_id?.phone_number || "")

    if (!phone) {
      alert("Seller contact not available")
      return
    }

    if (phone.startsWith("0")) {
      phone = "234" + phone.slice(1)
    }

    const itemUrl = `${window.location.origin}/market/${item.id}`
    const message = `Hi, I'm interested in your item "${item.title}" on Casa.\nHere is the link: ${itemUrl}`
    const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappLink, "_blank")
  }

  if (loading) {
    return <main className="max-w-4xl mx-auto p-10">Loading item...</main>
  }

  if (!item) {
    return <main className="max-w-4xl mx-auto p-10">Item not found.</main>
  }

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
      <section className="grid grid-cols-1 gap-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-64 object-cover rounded-lg border"
          />
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            No Image
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
