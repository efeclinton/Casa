"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import { formatUpdatedAtFullDate } from "../../../lib/activity"
import VirtualTour from "../../../components/VirtualTour"
import Head from "next/head"
import Link from "next/link"
import VerifiedAgentBadge from "../../../components/VerifiedAgentBadge"
import { ensureProfileComplete } from "../../../lib/profileCompletion"
import { getAgentDisplayName } from "../../../lib/agentDisplay"
import { DetailPageSkeleton } from "../../../components/LoadingSkeletons"
import Avatar from "../../../components/Avatar"

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
  is_active?: boolean
  updated_at?: string | null
  inquiry_count?: number | null
}

type AgentProfile = {
  id: string
  full_name: string
  business_name?: string | null
  avatar_url?: string | null
  verification_status?: string | null
}

type PropertyDetailClientProps = {
  propertyId?: string
  initialProperty?: Property | null
}

const fallbackPropertyImage =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80"

const getGalleryImages = (property?: Property | null) => {
  const images = Array.isArray(property?.images) ? property.images.filter(Boolean) : []
  if (images.length > 0) return images
  if (property?.image) return [property.image]
  return [fallbackPropertyImage]
}

const logSupabaseError = (message: string, error: unknown) => {
  if (error && typeof error === "object") {
    const supabaseError = error as {
      code?: string
      message?: string
      details?: string | null
      hint?: string | null
    }

    console.error(message, {
      code: supabaseError.code,
      message: supabaseError.message,
      details: supabaseError.details,
      hint: supabaseError.hint,
    })
    return
  }

  console.error(message, error)
}

const savePropertyInquiry = async (propertyId: string, userId: string) => {
  try {
    const { error: inquiryError } = await supabase
      .from("property_inquiries")
      .insert({
        property_id: propertyId,
        user_id: userId,
      })

    if (inquiryError) {
      console.log(inquiryError)
    }
  } catch (inquiryError) {
    console.log(inquiryError)
  }
}

export default function PropertyPage({ propertyId, initialProperty = null }: PropertyDetailClientProps) {

  const params = useParams()
  const router = useRouter()
  const id = propertyId || (params.id as string)

  const [property, setProperty] = useState<Property | null>(initialProperty)
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null)
  const [agentRating, setAgentRating] = useState<number>(0)
  const [agentReviewsCount, setAgentReviewsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [canViewListing, setCanViewListing] = useState(true)
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
    const imgs = getGalleryImages(property)
    if (imgs.length === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % imgs.length)
  }, [property])

  const handlePrevImage = useCallback(() => {
    const imgs = getGalleryImages(property)
    if (imgs.length === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + imgs.length) % imgs.length)
  }, [property])

  useEffect(() => {

    const loadProperty = async () => {
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single()

      if (propertyError || !propertyData) {
        setProperty(null)
        setCanViewListing(false)
        setLoading(false)
        return
      }

      setProperty(propertyData)

      const { data: { user } } = await supabase.auth.getUser()
      const isOwner = Boolean(user && (user.id === propertyData.owner_id || user.id === propertyData.agent_id))

      if (user) {
        const { data: savedListing, error: savedListingError } = await supabase
          .from("saved_listings")
          .select("id")
          .eq("user_id", user.id)
          .eq("property_id", id)
          .single()

        if (!savedListingError && savedListing) {
          setIsSaved(true)
          setSavedId(savedListing.id)
        } else {
          setIsSaved(false)
          setSavedId(null)
        }
      } else {
        setIsSaved(false)
        setSavedId(null)
      }

      if (propertyData.is_active === false && !isOwner) {
        setCanViewListing(false)
        setLoading(false)
        return
      }

      setCanViewListing(true)

      // Fetch agent info and rating (listings owner_id is agent user id)
      const agentId = propertyData?.agent_id || propertyData?.owner_id

      if (agentId) {
        const [{ data: agentData }, { data: ratingData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, business_name, avatar_url, verification_status")
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

  }, [id, setAgentProfile, setAgentRating, setAgentReviewsCount, setLoading])

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

    const complete = await ensureProfileComplete(user, router, `/property/${id}`)
    if (!complete) {
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

  const handleContact = () => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const currentPath = window.location.pathname + window.location.search
        localStorage.setItem("redirectAfterLogin", currentPath)
        authRedirect()
        return
      }
      const complete = await ensureProfileComplete(user, router, `/property/${id}`)
      if (!complete) return
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

      const complete = await ensureProfileComplete(user, router, `/property/${id}`)
      if (!complete) return

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

      try {
        const { error: contactError } = await supabase
          .from("agent_contacts")
          .insert({ agent_id: property.owner_id, user_id: user.id })
        if (contactError) {
          logSupabaseError("Could not save contact record", contactError)
        }
      } catch (error) {
        logSupabaseError("Could not save contact record", error)
      }

      void savePropertyInquiry(property.id, user.id)

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
    return <DetailPageSkeleton />
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

  if (!canViewListing) {
    return (
      <main className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold mb-3">Listing no longer available</h1>
          <p className="text-gray-600">This property has been deactivated and is no longer visible to the public.</p>
        </div>
      </main>
    )
  }

  const formattedPrice = `₦${Math.round(property.price / 1000)}k / ${property.rent_period}`

  let phone = property.phone ? String(property.phone) : ""

  if (phone.startsWith("0")) {
    phone = "234" + phone.slice(1)
  }

  const images = getGalleryImages(property)
  const hasMultipleImages = images.length > 1
  const collageThumbnails = images.slice(1, 5)
  const videos = Array.isArray(property.videos) ? property.videos : []
  const tours = Array.isArray(property.tour_images) ? property.tour_images : []
  const shareImage = images[0] || property.image || ""
  const shareDescription = `₦${property.price}/${property.rent_period || "year"} in ${property.location}`
  const shareUrl = typeof window !== "undefined" ? window.location.href : ""

  const updatedFullDate = formatUpdatedAtFullDate(property.updated_at)
  const inquiryCount = property.inquiry_count ?? 0
  const inquiryCountLabel =
    inquiryCount >= 100 ? "100+" :
      inquiryCount >= 50 ? "50+" :
        inquiryCount >= 25 ? "25+" :
          inquiryCount >= 3 ? String(inquiryCount) :
            null
  const inquiryCountText = inquiryCountLabel
    ? `${inquiryCountLabel} people have inquired about this accommodation`
    : null
  const agentDisplayName = getAgentDisplayName(agentProfile)

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">

      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Residence",
              name: property.title,
              description: property.description || shareDescription,
              image: [shareImage || "https://casa.example/favicon-v2.png"],
              url: shareUrl,
              offers: {
                "@type": "Offer",
                priceCurrency: "NGN",
                price: property.price,
                availability: property.is_active
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                url: shareUrl,
              },
              provider: {
                "@type": "Organization",
                name: "CASA",
                url: shareUrl,
              },
            }),
          }}
        />
      </Head>

      {/* Image Gallery */}

      <div
        className={`grid gap-2 sm:gap-3 lg:gap-4 ${
          hasMultipleImages
            ? "grid-cols-1 lg:grid-cols-4 lg:grid-rows-2"
            : "grid-cols-1"
        }`}
      >

        <button
          type="button"
          onClick={() => openGallery(0)}
          className={`group overflow-hidden rounded-2xl bg-gray-100 text-left shadow-sm ${
            hasMultipleImages
              ? "h-64 sm:h-80 lg:col-span-2 lg:row-span-2 lg:h-[430px]"
              : "h-72 sm:h-96 lg:h-[520px]"
          }`}
        >
          <img
            src={images[0]}
            alt="Main property image"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            onError={(event) => {
              event.currentTarget.src = fallbackPropertyImage
            }}
          />
        </button>

        {hasMultipleImages && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:col-span-2 lg:row-span-2 lg:grid-cols-2 lg:grid-rows-2 lg:gap-4">
            {collageThumbnails.map((img: string, index: number) => {
              const galleryIndex = index + 1
              const showOverlay = images.length > 5 && index === collageThumbnails.length - 1

              return (
                <button
                  key={`${img}-${galleryIndex}`}
                  type="button"
                  onClick={() => openGallery(galleryIndex)}
                  className="group relative h-28 overflow-hidden rounded-xl bg-gray-100 text-left shadow-sm sm:h-36 lg:h-full"
                >
                  <img
                    src={img}
                    alt={`Property image ${galleryIndex + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    onError={(event) => {
                      event.currentTarget.src = fallbackPropertyImage
                    }}
                  />
                  {showOverlay && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 px-3 text-center text-sm font-semibold text-white sm:text-base">
                      View all photos
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

      </div>

      {agentProfile && (
        <div className="mt-6 mb-4 p-4 sm:p-6 bg-white rounded-lg shadow">
          <Link href={`/agent/${agentProfile.id}`} className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:bg-gray-50 p-3 sm:p-4 rounded">
            <div className="relative w-16 h-16">
              <Avatar
                avatarUrl={agentProfile.avatar_url}
                businessName={agentProfile.business_name}
                fullName={agentProfile.full_name}
                alt={`${agentDisplayName} avatar`}
                size={64}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold">{agentDisplayName}</h3>
                <VerifiedAgentBadge status={agentProfile.verification_status} />
              </div>
              {agentProfile.verification_status === "verified" && (
                <p className="mt-1 text-xs font-medium text-blue-700">
                  Identity confirmed by CASA
                </p>
              )}
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

        {updatedFullDate && (
          <p className="text-sm text-gray-500 mt-3">
            Last updated: {updatedFullDate}
          </p>
        )}

        {inquiryCountText && (
          <p className="text-sm text-gray-500 mt-1">
            {inquiryCountText}
          </p>
        )}

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
