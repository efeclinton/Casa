"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import Head from "next/head"
import Link from "next/link"

type SellerProfile = {
  id?: string
  full_name?: string
  email?: string
  phone?: string
  avatar_url?: string
}

type MarketItem = {
  id: string
  user_id?: string | SellerProfile
  profiles?: SellerProfile
  images?: string[]
  title: string
  price: number
  location?: string
  description?: string
}

type MarketItemDetailClientProps = {
  itemId?: string
}

export default function MarketItemDetailPage({ itemId }: MarketItemDetailClientProps) {
  const params = useParams()
  const id = itemId || (params.id as string)

  const [item, setItem] = useState<MarketItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState<string | null>(null)

  useEffect(() => {
    const loadItem = async () => {
      const { data } = await supabase
        .from("market_items")
        .select("*, profiles ( id, full_name, phone, avatar_url )")
        .eq("id", id)
        .single()

      setItem(data)
      setLoading(false)
    }

    if (!id) return
    loadItem()
  }, [id])


  useEffect(() => {
    const fetchRating = async () => {
      if (!item?.user_id) return

      const agentId =
        typeof item.user_id === "object"
          ? item.user_id?.id
          : item.user_id

      const { data } = await supabase
        .from("agent_ratings")
        .select("rating")
        .eq("agent_id", agentId)

      if (data && data.length > 0) {
        const avg =
          data.reduce((sum, r) => sum + r.rating, 0) / data.length

        setRating(avg.toFixed(1))
      }
    }

    fetchRating()
  }, [item?.user_id])

  const imageUrl = useMemo(() => {
    if (!item) return null
    const images = item.images ?? []
    return images.length > 0 ? images[0] : null
  }, [item])

  const handleContactSeller = () => {
    if (!item) return

    const phone = item.profiles?.phone

    if (!phone) {
      alert("Seller contact not available")
      return
    }

    let phoneStr = String(phone)

    if (phoneStr.startsWith("0")) {
      phoneStr = "234" + phoneStr.slice(1)
    }

    const itemUrl = `${window.location.origin}/market/${item.id}`
    const message = `Hi, I'm interested in your item "${item.title}" on Casa.\nHere is the link: ${itemUrl}`
    const whatsappLink = `https://wa.me/${phoneStr}?text=${encodeURIComponent(message)}`
    window.open(whatsappLink, "_blank")
  }

  if (loading) {
    return <main className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">Loading item...</main>
  }

  if (!item) {
    return <main className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">Item not found.</main>
  }

  const sellerId =
    typeof item.user_id === "object"
      ? item.user_id?.id
      : item.user_id

  const currentUrl = typeof window !== "undefined" ? window.location.href : ""

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: item.title,
              description: item.description || "Campus market item listed on CASA.",
              image: [imageUrl || "https://casa.example/favicon-v2.png"],
              url: currentUrl,
              offers: {
                "@type": "Offer",
                priceCurrency: "NGN",
                price: item.price,
                availability: "https://schema.org/InStock",
                url: currentUrl,
              },
              seller: {
                "@type": "Person",
                name: item.profiles?.full_name || "CASA seller",
              },
            }),
          }}
        />
      </Head>

      <section className="grid grid-cols-1 gap-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-56 sm:h-64 object-cover rounded-lg border"
          />
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-3">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">{item.title}</h1>
        <p className="text-lg sm:text-xl lg:text-2xl text-green-700 font-semibold">₦{Number(item.price).toLocaleString()}</p>
        <p className="text-sm sm:text-base text-gray-600">{item.location}</p>
        <p className="text-sm sm:text-base text-gray-800 leading-relaxed">{item.description}</p>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {item.profiles?.avatar_url ? (
            <img
              src={item.profiles.avatar_url}
              alt="Seller"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              {item.profiles?.full_name?.charAt(0) || "U"}
            </div>
          )}
          <div>
            <p className="font-medium">
              {item.profiles?.full_name || item.profiles?.email || "Seller"}
            </p>
            <p className="text-sm text-yellow-600">
              ⭐ {rating || "No ratings yet"}
            </p>
            <p className="text-sm text-gray-500">Seller</p>
          </div>
        </div>

        {sellerId && (
          <Link href={`/agent/${sellerId}`}>
            <button className="mt-3 w-full sm:w-auto px-3 py-2.5 min-h-10 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-sm">
              View Seller Profile
            </button>
          </Link>
        )}

        <button
          onClick={handleContactSeller}
          className="mt-4 w-full sm:w-auto px-5 py-3 min-h-10 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          Contact Seller
        </button>
      </section>
    </main>
  )
}
