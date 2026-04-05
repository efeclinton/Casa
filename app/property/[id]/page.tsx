"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase, getOptimizedAvatarUrl } from "../../../lib/supabaseClient"
import VirtualTour from "../../../components/VirtualTour"
import Image from "next/image"

export default function PropertyPage() {

  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [property, setProperty] = useState<any>(null)
  const [agentProfile, setAgentProfile] = useState<any>(null)
  const [agentRating, setAgentRating] = useState<number>(0)
  const [agentReviewsCount, setAgentReviewsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showTour, setShowTour] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {

    const loadProperty = async () => {

      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single()

      setProperty(data)

      const agentId = data?.agent_id || data?.owner_id

      if (agentId) {
        const [{ data: agentData }, { data: reviewsData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", agentId)
            .single(),
          supabase
            .from("agent_reviews")
            .select("rating")
            .eq("agent_id", agentId)
        ])

        setAgentProfile(agentData)

        const reviewList = reviewsData || []

        if (reviewList.length > 0) {
          const sum = (reviewList as any[]).reduce((acc, item) => acc + (item.rating || 0), 0)
          const avg = sum / reviewList.length
          setAgentRating(Number(avg.toFixed(1)))
          setAgentReviewsCount(reviewList.length)
        } else {
          setAgentRating(0)
          setAgentReviewsCount(0)
        }
      } else {
        setAgentProfile(null)
        setAgentRating(0)
        setAgentReviewsCount(0)
      }

      setLoading(false)

    }

    if (id) loadProperty()

  }, [id])

  useEffect(() => {
    const checkSaved = async () => {
      if (!id) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("saved_listings")
        .select("id")
        .eq("user_id", user.id)
        .eq("property_id", id)
        .single()

      if (!error && data) {
        setIsSaved(true)
        setSavedId(data.id)
      } else {
        setIsSaved(false)
        setSavedId(null)
      }
    }

    checkSaved()
  }, [id])

  const authRedirect = () => {
    router.push(`/login?redirect=/property/${id}`)
  }

  const handleToggleSave = async () => {
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      authRedirect()
      return
    }

    if (isSaved && savedId) {
      const { error } = await supabase
        .from("saved_listings")
        .delete()
        .eq("id", savedId)

      if (error) {
        console.error("Could not unsave listing", error)
        alert("Unable to remove saved listing")
        setSaving(false)
        return
      }

      setIsSaved(false)
      setSavedId(null)
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from("saved_listings")
      .insert({ user_id: user.id, property_id: id })
      .select()
      .single()

    if (error) {
      console.error("Could not save listing", error)
      alert("Unable to save listing")
      setSaving(false)
      return
    }

    setIsSaved(true)
    setSavedId(data?.id || null)
    setSaving(false)
  }

  const flagProperty = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const reason = prompt("Why are you flagging this property?")

    if (!reason) return

    const { error } = await supabase
      .from("flagged_properties")
      .insert({
        property_id: property.id,
        user_id: user.id,
        reason
      })

    if (error) {
      alert("Failed to flag property")
    } else {
      alert("Property flagged for review")
    }
  }

  const getAgentInitials = (name: string) => {
    if (!name) return "?"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const getAgentAvatarSrc = (avatarUrl: string | null, name: string) => {
    return getOptimizedAvatarUrl(avatarUrl, name)
  }

  const handleContact = () => {
    const ensure = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        authRedirect()
        return
      }

      let phone = property?.phone ? String(property.phone) : ""
      if (!phone) return

      if (phone.startsWith("0")) {
        phone = "234" + phone.slice(1)
      }

      const whatsappMessage = encodeURIComponent(
        `Hello, I'm interested in the property "${property.title}" listed on Casa.`
      )
      const whatsappLink = `https://wa.me/${phone}?text=${whatsappMessage}`

      // Track contact action
      const agentId = property?.agent_id || property?.owner_id
      if (agentId) {
        const { error: contactError } = await supabase
          .from("agent_contacts")
          .insert({ agent_id: agentId, user_id: user.id })

        if (contactError) {
          console.error("Could not save contact record", contactError)
        }
      }

      window.open(whatsappLink, "_blank")
    }

    ensure()
  }



  if (loading) {
    return (
      <main className="p-10">
        <p>Loading property...</p>
      </main>
    )
  }

  if (!property) {
    return (
      <main className="p-10">
        <h1 className="text-xl font-semibold">
          Property not found
        </h1>
      </main>
    )
  }

  const formattedPrice = `₦${Math.round(property.price / 1000)}k / ${property.rent_period}`

  let phone = property.phone ? String(property.phone) : ""

  if (phone.startsWith("0")) {
    phone = "234" + phone.slice(1)
  }

  const images = Array.isArray(property.images) ? property.images : []
  const videos = Array.isArray(property.videos) ? property.videos : []
  const tours = Array.isArray(property.tour_images) ? property.tour_images : []

  return (
    <main className="max-w-6xl mx-auto p-10">

      {/* Image Gallery */}

      <div className="grid grid-cols-4 gap-3">

        <div className="col-span-4 md:col-span-2 row-span-2">
          <img
            src={images[0] || property.image}
            alt="Main property image"
            className="w-full h-[420px] object-cover rounded-xl"
          />
        </div>

        {images.slice(1,5).map((img: string, index: number) => (
          <img
            key={index}
            src={img}
            alt={`Property image ${index + 2}`}
            className="w-full h-[200px] object-cover rounded-lg"
          />
        ))}

      </div>


      {/* Property Info */}

      <div className="mt-6">

        <h1 className="text-3xl font-bold">
          {property.title}
        </h1>

        <p className="text-2xl font-semibold mt-2">
          {formattedPrice}
        </p>

        <p className="text-gray-500 mt-1">
          {property.location}
        </p>

      </div>


      {/* Description */}

      {property.description && (

        <div className="mt-8">

          <h2 className="text-xl font-semibold mb-3">
            Description
          </h2>

          <p className="text-gray-700 whitespace-pre-line">
            {property.description}
          </p>

        </div>

      )}

      {(property?.agent_id || property?.owner_id) && (
        <div className="mt-10 p-6 bg-white rounded-lg shadow">
          <a href={`/agent/${property.agent_id || property.owner_id}`} className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-4 rounded">
            <div className="relative w-16 h-16">
              <Image
                src={getAgentAvatarSrc(agentProfile?.avatar_url || null, agentProfile?.full_name || property.owner_name || "Agent")}
                alt={`${agentProfile?.full_name || property.owner_name || "Agent"} avatar`}
                width={64}
                height={64}
                className="rounded-full object-cover"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB4PSIyNCIgeT0iMjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0E0QUYiIHN0cm9rZS13aWR0aD0iMS41Ij4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0QzE0IDUuMSAxMy4xIDYgMTIgNkMxMC45IDYgMTAgNS4xIDEwIDRDMTAgMi45IDEwLjkgMiAxMiAyWk0xMiAxNEM5LjggMTQgOCA5LjggOCA3QzggNS4yIDkuMiA0IDEyIDRDMTQuOCA0IDE2IDUuMiAxNiA3QzE2IDkuOCAxNC44IDE0IDEyIDE0WiIvPgo8L3N2Zz4KPC9zdmc+"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold">{agentProfile?.full_name || property.owner_name || "Agent"}</h3>
              <p className="text-sm text-gray-500">
                ⭐ {agentRating > 0 ? agentRating.toFixed(1) : "No rating yet"}
                {agentReviewsCount > 0 && ` (${agentReviewsCount} review${agentReviewsCount === 1 ? '' : 's'})`}
              </p>
            </div>
          </a>
        </div>
      )}


      {/* Videos */}

      {videos.length > 0 && (

        <div className="mt-10">

          <h2 className="text-xl font-semibold mb-4">
            Property Videos
          </h2>

          <div className="space-y-4">

            {videos.map((video: string, index: number) => (

              <video
                key={index}
                controls
                className="w-full rounded-xl"
              >
                <source src={video} type="video/mp4" />
              </video>

            ))}

          </div>

        </div>

      )}


      {/* Virtual Tour */}

      {tours.length > 0 && (

        <div className="mt-10">

          <h2 className="text-xl font-semibold mb-4">
            Virtual Tour
          </h2>

          {!showTour && (
            <button
              onClick={() => setShowTour(true)}
              className="bg-black text-white px-6 py-3 rounded-lg"
            >
              Explore the Property in 360°
            </button>
          )}

          {showTour && (
            <div className="mt-4">
              <VirtualTour image={tours[0]} />
            </div>
          )}

        </div>

      )}


      {/* Contact & Save */}

      <div className="mt-10 flex flex-col md:flex-row md:items-center md:gap-4 gap-3">

        <button
          onClick={handleToggleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          {saving ? "..." : isSaved ? "Unsave Listing" : "Save Listing"}
        </button>

        {phone ? (
          <button
            onClick={handleContact}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Contact on WhatsApp
          </button>
        ) : (
          <p className="text-red-500">Phone number not available</p>
        )}

        <button
          onClick={flagProperty}
          className="text-red-600 underline mt-3"
        >
          Report Listing
        </button>

      </div>

    </main>
  )
}