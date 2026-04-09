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
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  useEffect(() => {

    const loadProperty = async () => {

      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single()

      setProperty(data)

      // Fetch agent info and rating (listings owner_id is agent user id)
      const agentId = data?.agent_id || data?.owner_id

      if (agentId) {
        const [{ data: agentData }, { data: ratingData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", agentId)
            .single(),
          supabase
            .from("agent_rating_summary")
            .select("*")
            .eq("agent_id", agentId)
            .single()
        ])

        setAgentProfile(agentData)

        const avgRating = ratingData?.avg_rating || 0
        const reviewCount = ratingData?.review_count || 0

        setAgentRating(Number(avgRating.toFixed(1)))
        setAgentReviewsCount(reviewCount)
      } else {
        setAgentProfile(null)
        setAgentRating(0)
        setAgentReviewsCount(0)
      }

      setLoading(false)
    }

    if (!id) return

    loadProperty()

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

  useEffect(() => {
    if (!showGalleryModal) return

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevImage()
      if (e.key === 'ArrowRight') handleNextImage()
      if (e.key === 'Escape') handleCloseGallery()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showGalleryModal, currentImageIndex])

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
      const { error: contactError } = await supabase
        .from("agent_contacts")
        .insert({ agent_id: property.owner_id, user_id: user.id })

      if (contactError) {
        console.error("Could not save contact record", contactError)
      }

      window.open(whatsappLink, "_blank")
    }

    ensure()
  }

  const openGallery = (index: number) => {
    setCurrentImageIndex(index)
    setShowGalleryModal(true)
  }

  const handleCloseGallery = () => {
    setShowGalleryModal(false)
  }

  const handleNextImage = () => {
    const imgs = Array.isArray(property?.images) ? property.images : []
    setCurrentImageIndex((prev) => (prev + 1) % imgs.length)
  }

  const handlePrevImage = () => {
    const imgs = Array.isArray(property?.images) ? property.images : []
    setCurrentImageIndex((prev) => (prev - 1 + imgs.length) % imgs.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNextImage()
      } else {
        handlePrevImage()
      }
    }

    setTouchStart(null)
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
            className="w-full h-[420px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
            onClick={() => openGallery(0)}
          />
        </div>

        {images.slice(1,5).map((img: string, index: number) => (
          <img
            key={index}
            src={img}
            alt={`Property image ${index + 2}`}
            className="w-full h-[200px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
            onClick={() => openGallery(index + 1)}
          />
        ))}

      </div>

      {agentProfile && (
        <div className="mt-6 mb-4 p-6 bg-white rounded-lg shadow">
          <a href={`/agent/${agentProfile.id}`} className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-4 rounded">
            <div className="relative w-16 h-16">
              <Image
                src={getAgentAvatarSrc(agentProfile.avatar_url, agentProfile.full_name)}
                alt={`${agentProfile.full_name} avatar`}
                width={64}
                height={64}
                className="rounded-full object-cover"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB4PSIyNCIgeT0iMjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0E0QUYiIHN0cm9rZS13aWR0aD0iMS41Ij4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0QzE0IDUuMSAxMy4xIDYgMTIgNkMxMC45IDYgMTAgNS4xIDEwIDRDMTAgMi45IDEwLjkgMiAxMiAyWk0xMiAxNEM5LjggMTQgOCA5LjggOCA3QzggNS4yIDkuMiA0IDEyIDRDMTQuOCA0IDE2IDUuMiAxNiA3QzE2IDkuOCAxNC44IDE0IDEyIDE0WiIvPgo8L3N2Zz4KPC9zdmc+"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold">{agentProfile.full_name}</h3>
              <p className="text-sm text-gray-500">
                ⭐ {agentReviewsCount > 0
                  ? `${agentRating.toFixed(1)} / 5 (${agentReviewsCount} reviews)`
                  : "No rating yet"}
              </p>
            </div>
          </a>
        </div>
      )}


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


      {/* Virtual Tour */}

      {tours.length > 0 && (

        <div className="mt-10">

          {!showTour && (
            <>
              <p className="text-sm font-semibold mb-2">
                Virtual Tour
              </p>

              <button
                onClick={() => setShowTour(true)}
                className="bg-black text-white px-6 py-4 rounded-lg inline-flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Walk Through This House (360° View)
              </button>
            </>
          )}

          {showTour && (
            <div className="mt-4">
              <VirtualTour image={tours[0]} />
            </div>
          )}

        </div>

      )}


      {/* Videos */}

      {videos.length > 0 && (

        <div className="mt-8 max-w-4xl mx-auto w-full">

          <h2 className="text-lg font-semibold mb-4 text-center md:text-left">
            Watch the Property Video
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

      </div>

      {/* Fullscreen Gallery Modal */}
      {showGalleryModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={handleCloseGallery}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <button
            onClick={handleCloseGallery}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition z-50"
          >
            ✕
          </button>

          {/* Main Image Container */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[currentImageIndex] || property.image}
              alt={`Gallery image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Previous Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrevImage()
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white text-3xl w-12 h-12 flex items-center justify-center rounded transition"
            >
              ‹
            </button>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNextImage()
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white text-3xl w-12 h-12 flex items-center justify-center rounded transition"
            >
              ›
            </button>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}