"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase, getOptimizedAvatarUrl } from "../../../lib/supabaseClient"
import VirtualTour from "../../../components/VirtualTour"
import Image from "next/image"
import Head from "next/head"
import Link from "next/link"

type Property = {
  id: string
  title: string
  price: number
  rent_period?: string
  location?: string
  image?: string
  images?: string[]
  videos?: string[]
  tour_images?: string[]
  description?: string
  phone?: string
  owner_id?: string
  agent_id?: string
}

type AgentProfile = {
  id: string
  full_name: string
  avatar_url?: string | null
}

export default function PropertyPage() {

  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null)
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
  const [showContactModal, setShowContactModal] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleCloseGallery = useCallback(() => {
    setShowGalleryModal(false)
  }, [])

  const handleNextImage = useCallback(() => {
    const imgs = Array.isArray(property?.images) ? property.images : []
    if (imgs.length === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % imgs.length)
  }, [property])

  const handlePrevImage = useCallback(() => {
    const imgs = Array.isArray(property?.images) ? property.images : []
    if (imgs.length === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + imgs.length) % imgs.length)
  }, [property])

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
  }, [showGalleryModal, currentImageIndex, handleCloseGallery, handleNextImage, handlePrevImage])

  useEffect(() => {
    if (!showToast) return

    const timeoutId = window.setTimeout(() => {
      setShowToast(false)
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [showToast])

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

  const getAgentAvatarSrc = (avatarUrl: string | null, name: string) => {
    return getOptimizedAvatarUrl(avatarUrl, name)
  }

  const handleContact = () => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const currentPath = window.location.pathname + window.location.search
        localStorage.setItem("redirectAfterLogin", currentPath)
        authRedirect()
        return
      }
      // Show modal instead of directly contacting
      setShowContactModal(true)
    }

    checkAuth()
  }

  const handleContinueContact = () => {
    const proceed = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const currentPath = window.location.pathname + window.location.search
        localStorage.setItem("redirectAfterLogin", currentPath)
        authRedirect()
        return
      }

      if (!property) return

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

      // Close modal and redirect
      setShowContactModal(false)
      window.open(whatsappLink, "_blank")
    }

    proceed()
  }

  const handleReport = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!property?.id) {
      console.error("Report aborted: property.id is undefined")
      return
    }

    if (!user?.id) {
      alert("You must be logged in")
      return
    }

    const reason = prompt("Why are you reporting this listing?")
    const cleanReason = reason?.trim()

    if (!cleanReason) {
      alert("Please enter a reason")
      return
    }

    const payload = {
      property_id: property.id,
      user_id: user.id,
      reason: cleanReason
    }

    console.log("SENDING REPORT:", {
      property_id: property.id,
      user_id: user.id,
      reason: cleanReason
    })

    const { error } = await supabase
      .from("flagged_properties")
      .insert([payload])

    if (error) {
      console.error("REPORT ERROR FULL:", JSON.stringify(error, null, 2))
      alert("Failed to report listing")
      return
    }

    alert("Listing reported successfully")
  }

  const handleShare = async () => {
    if (!property) return

    const shareText = `🏠 ₦${property.price}/${property.rent_period || "year"} in ${property.location} — See full details on Casa`

    const shareData = {
      title: property.title,
      text: shareText,
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        setShowToast(true)
      }
    } catch (err) {
      console.error("Share failed:", err)
    }
  }

  const openGallery = (index: number) => {
    setCurrentImageIndex(index)
    setShowGalleryModal(true)
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
      <main className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <p>Loading property...</p>
      </main>
    )
  }

  if (!property) {
    return (
      <main className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-lg sm:text-xl font-semibold">
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
  const shareImage = images[0] || property.image || ""
  const shareDescription = `₦${property.price}/${property.rent_period || "year"} in ${property.location}`
  const shareUrl = typeof window !== "undefined" ? window.location.href : ""

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">

      <Head>
        <title>{property.title} | Casa</title>
        <meta property="og:title" content={property.title} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:image" content={shareImage} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Image Gallery */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        <div className="sm:col-span-2 lg:col-span-2 row-span-2">
          <div className="w-full h-64 sm:h-80 lg:h-[420px] overflow-hidden rounded-xl">
            <img
              src={images[0] || property.image}
              alt="Main property image"
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
              onClick={() => openGallery(0)}
            />
          </div>
        </div>

        {images.slice(1,5).map((img: string, index: number) => (
          <div key={index} className="w-full h-40 sm:h-44 lg:h-[200px] overflow-hidden rounded-lg">
            <img
              src={img}
              alt={`Property image ${index + 2}`}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
              onClick={() => openGallery(index + 1)}
            />
          </div>
        ))}

      </div>

      {agentProfile && (
        <div className="mt-6 mb-4 p-4 sm:p-6 bg-white rounded-lg shadow">
          <Link href={`/agent/${agentProfile.id}`} className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:bg-gray-50 p-3 sm:p-4 rounded">
            <div className="relative w-16 h-16">
              <Image
                src={getAgentAvatarSrc(agentProfile.avatar_url || null, agentProfile.full_name)}
                alt={`${agentProfile.full_name} avatar`}
                width={64}
                height={64}
                className="rounded-full object-cover"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB4PSIyNCIgeT0iMjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0E0QUYiIHN0cm9rZS13aWR0aD0iMS41Ij4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0QzE0IDUuMSAxMy4xIDYgMTIgNkMxMC45IDYgMTAgNS4xIDEwIDRDMTAgMi45IDEwLjkgMiAxMiAyWk0xMiAxNEM5LjggMTQgOCA5LjggOCA3QzggNS4yIDkuMiA0IDEyIDRDMTQuOCA0IDE2IDUuMiAxNiA3QzE2IDkuOCAxNC44IDE0IDEyIDE0WiIvPgo8L3N2Zz4KPC9zdmc+"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold">{agentProfile.full_name}</h3>
              <p className="text-sm text-gray-500">
                ⭐ {agentReviewsCount > 0
                  ? `${agentRating.toFixed(1)} / 5 (${agentReviewsCount} reviews)`
                  : "No rating yet"}
              </p>
            </div>
          </Link>
        </div>
      )}


      {/* Property Info */}

      <div className="mt-6">

        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">
          {property.title}
        </h1>

        <p className="text-lg sm:text-xl lg:text-2xl font-semibold mt-2">
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
                className="bg-black text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg inline-flex items-center justify-center gap-2 min-h-10 w-full sm:w-auto"
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

          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center md:text-left">
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

          <h2 className="text-lg sm:text-xl font-semibold mb-3">
            Description
          </h2>

          <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
            {property.description}
          </p>

        </div>

      )}
      {/* Contact, Save & Report */}

      <div className="mt-10">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">

          <button
            onClick={handleToggleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 min-h-10 rounded-lg font-semibold hover:bg-blue-700 transition w-full sm:w-auto"
          >
            {saving ? "..." : isSaved ? "Unsave Listing" : "Save Listing"}
          </button>

          <button
            onClick={handleShare}
            className="bg-gray-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 min-h-10 rounded-lg font-semibold hover:bg-gray-800 transition w-full sm:w-auto"
          >
            Share Listing
          </button>

          {phone ? (
            <button
              onClick={handleContact}
              className="bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 min-h-10 rounded-lg font-semibold hover:bg-green-700 transition w-full sm:w-auto"
            >
              Contact on WhatsApp
            </button>
          ) : (
            <p className="text-red-500">Phone number not available</p>
          )}

        </div>

        <button
          onClick={handleReport}
          className="w-full mt-3 py-2.5 min-h-10 rounded-xl border border-red-500 text-red-500 hover:bg-red-50 text-sm font-medium"
        >
          Report this listing
        </button>
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
            className="absolute top-4 right-4 text-white text-2xl sm:text-3xl h-10 w-10 inline-flex items-center justify-center hover:text-gray-300 transition z-50"
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
              className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white text-2xl sm:text-3xl w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded transition"
            >
              ‹
            </button>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNextImage()
              }}
              className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white text-2xl sm:text-3xl w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded transition"
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

      {/* Safety Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Before you contact the agent
            </h2>

            {/* Safety Message */}
            <div className="text-gray-700 mb-6 space-y-3 text-sm">
              <p>Please take a moment to stay safe:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>Do not send money directly to any agent. Payments should only be made to the landlord or caretaker after proper verification.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>Speak to people living in the property to confirm details before making any decision.</span>
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 px-4 py-2.5 min-h-10 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleContinueContact}
                className="flex-1 px-4 py-2.5 min-h-10 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Continue to WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2.5 rounded-lg text-sm z-[1000]">
          Link copied!
        </div>
      )}

    </main>
  )
}
