"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase, getOptimizedAvatarUrl } from "../../../lib/supabaseClient"
import Image from "next/image"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import MarketItemCard from "../../../components/MarketItemCard"
import VerifiedAgentBadge from "../../../components/VerifiedAgentBadge"
import { ensureProfileComplete } from "../../../lib/profileCompletion"
import { getAgentDisplayName } from "../../../lib/agentDisplay"

type AgentProfile = {
  id: string
  full_name?: string
  business_name?: string | null
  avatar_url?: string | null
  phone?: string
  verification_status?: string | null
}

type Listing = {
  id: string
  title?: string
  price?: number
  location?: string
  image?: string
}

type MarketItem = {
  id: string
  title?: string
  price?: number
  location?: string
  images?: string[] | null
  is_active?: boolean | null
  updated_at?: string | null
}

type ReviewProfile = {
  id: string
  full_name?: string
  avatar_url?: string | null
}

type Review = {
  id: string
  rating: number
  comment?: string
  created_at: string
  user_id: string
  profile?: ReviewProfile
}

type RatingRow = {
  rating?: number
}

const fallbackListingImage = "https://via.placeholder.com/480x320?text=No+Image"

const formatPrice = (price?: number) =>
  typeof price === "number" ? `NGN ${Number(price).toLocaleString()}` : "Price not set"

const getMarketItemImage = (item: MarketItem) => {
  if (Array.isArray(item.images) && item.images.length > 0) return item.images[0]
  return fallbackListingImage
}

export default function AgentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [marketItems, setMarketItems] = useState<MarketItem[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [reviews, setReviews] = useState<Review[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [hasContacted, setHasContacted] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [showContactModal, setShowContactModal] = useState(false)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!agentId) return

    const load = async () => {
      setLoading(true)

      const { data: agentData, error: agentError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", agentId)
        .single()

      if (agentError || !agentData) {
        console.error("Agent not found", agentError)
        setLoading(false)
        return
      }

      setAgent(agentData)

      const [{ data: propertiesData }, { data: marketItemsData }, { data: ratingsData }, { data: reviewsData }] = await Promise.all([
        supabase
          .from("properties")
          .select("id,title,price,location,image")
          .eq("agent_id", agentId)
          .eq("is_active", true),
        supabase
          .from("market_items")
          .select("id,title,price,location,images,is_active")
          .eq("user_id", agentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("agent_ratings")
          .select("rating")
          .eq("agent_id", agentId),
        supabase
          .from("agent_ratings")
          .select("id, rating, comment, created_at, user_id")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false }),
      ])

      const { data: authData } = await supabase.auth.getUser()

      setListings(propertiesData || [])
      setMarketItems((marketItemsData || []).filter((item: MarketItem) => item.is_active !== false))

      const currentUser = authData?.user ?? null
      setUser(currentUser)

      const reviewList = reviewsData || []
      const userIds = Array.from(new Set(reviewList.map((review: Review) => review.user_id).filter(Boolean)))
      const profileMap: Record<string, ReviewProfile> = {}

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds)

        ;(profilesData || []).forEach((profile: ReviewProfile) => {
          profileMap[profile.id] = profile
        })
      }

      const reviewsWithUser = reviewList.map((review: Review) => ({
        ...review,
        profile: profileMap[review.user_id],
      }))

      setReviews(reviewsWithUser)

      const ratingValues = ratingsData || []
      if (ratingValues.length > 0) {
        const sum = (ratingValues as RatingRow[]).reduce((acc, item) => acc + (item.rating || 0), 0)
        setAvgRating(Number((sum / ratingValues.length).toFixed(1)))
        setTotalReviews(ratingValues.length)
      } else {
        setAvgRating(0)
        setTotalReviews(0)
      }

      if (currentUser) {
        const contactResult = await supabase
          .from("agent_contacts")
          .select("id")
          .eq("agent_id", agentId)
          .eq("user_id", currentUser.id)
          .single()

        setHasContacted(!!contactResult.data)

        const existingReview = reviewsWithUser.find((review) => review.user_id === currentUser.id)
        if (existingReview) {
          setUserReview(existingReview)
          setRating(existingReview.rating)
          setComment(existingReview.comment || "")
        }
      }

      setLoading(false)
    }

    void load()
  }, [agentId])

  const submitReview = async () => {
    if (!user) {
      router.push(`/login?redirect=/agent/${agentId}`)
      return
    }

    if (!hasContacted) {
      alert("You can only review agents you have contacted")
      return
    }

    if (!comment.trim() || !rating) {
      alert("Please provide rating and comment")
      return
    }

    setSubmitting(true)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        throw new Error("You must be logged in to submit a review")
      }

      if (userReview) {
        const { error } = await supabase
          .from("agent_ratings")
          .update({ rating, comment })
          .eq("id", userReview.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("agent_ratings")
          .insert({ agent_id: agentId, user_id: authUser.id, rating, comment })

        if (error) throw error
      }

      const { data: newReviews } = await supabase
        .from("agent_ratings")
        .select("id, rating, comment, created_at, user_id")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })

      const reviewUserIds = Array.from(new Set((newReviews || []).map((review: Review) => review.user_id).filter(Boolean)))
      const refreshedProfileMap: Record<string, ReviewProfile> = {}

      if (reviewUserIds.length > 0) {
        const { data: refreshedProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", reviewUserIds)

        ;(refreshedProfiles || []).forEach((profile: ReviewProfile) => {
          refreshedProfileMap[profile.id] = profile
        })
      }

      const reviewsWithUser = (newReviews || []).map((review: Review) => ({
        ...review,
        profile: refreshedProfileMap[review.user_id],
      }))

      setReviews(reviewsWithUser)

      const ratingValues = newReviews || []
      if (ratingValues.length > 0) {
        const sum = (ratingValues as RatingRow[]).reduce((acc, item) => acc + (item.rating || 0), 0)
        setAvgRating(Number((sum / ratingValues.length).toFixed(1)))
        setTotalReviews(ratingValues.length)
      }

      alert("Review saved")
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Unable to submit review")
    } finally {
      setSubmitting(false)
    }
  }

  const handleContactClick = async () => {
    if (!user) {
      const currentPath = window.location.pathname + window.location.search
      localStorage.setItem("redirectAfterLogin", currentPath)
      router.push(`/login?redirect=/agent/${agentId}`)
      return
    }

    const complete = await ensureProfileComplete(user, router, `/agent/${agentId}`)
    if (!complete) return

    setShowContactModal(true)
  }

  const handleContinueContact = async () => {
    if (!user) {
      const currentPath = window.location.pathname + window.location.search
      localStorage.setItem("redirectAfterLogin", currentPath)
      router.push(`/login?redirect=/agent/${agentId}`)
      return
    }

    const complete = await ensureProfileComplete(user, router, `/agent/${agentId}`)
    if (!complete) return

    if (!agent) return

    let phone = String(agent.phone || "")
    if (!phone) return

    if (phone.startsWith("0")) {
      phone = "234" + phone.slice(1)
    }

    const agentDisplayName = getAgentDisplayName(agent)
    const whatsappMessage = encodeURIComponent(
      `Hello, I'm interested in the property listings by ${agentDisplayName} on Casa.`
    )
    const whatsappLink = `https://wa.me/${phone}?text=${whatsappMessage}`

    const { error } = await supabase
      .from("agent_contacts")
      .insert({ agent_id: agentId, user_id: user.id })

    if (error) {
      console.error("Could not insert contact record", error)
    }

    setHasContacted(true)
    setShowContactModal(false)
    window.open(whatsappLink, "_blank")
  }

  if (loading) return <main className="px-4 py-6 sm:p-10">Loading agent...</main>
  if (!agent) return <main className="px-4 py-6 sm:p-10">Agent not found</main>

  const isViewingOwnProfile = Boolean(user && user.id === agent.id)
  const agentDisplayName = getAgentDisplayName(agent)

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 sm:p-10 space-y-6">
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-r from-green-50 via-white to-blue-50 px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 flex-shrink-0">
                <Image
                  src={getOptimizedAvatarUrl(agent.avatar_url || null, agentDisplayName)}
                  alt={`${agentDisplayName} avatar`}
                  width={96}
                  height={96}
                  className="rounded-full object-cover"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB4PSIzNiIgeT0iMzYiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0E0QUYiIHN0cm9rZS13aWR0aD0iMS41Ij4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0QzE0IDUuMSAxMy4xIDYgMTIgNkMxMC45IDYgMTAgNS4xIDEwIDRDMTAgMi45IDEwLjkgMiAxMiAyWk0xMiAxNEM5LjggMTQgOCA5LjggOCA3QzggNS4yIDkuMiA0IDEyIDRDMTQuOCA0IDE2IDUuMiAxNiA3QzE2IDkuOCAxNC44IDE0IDEyIDE0WiIvPgo8L3N2Zz4KPC9zdmc+"
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-950">{agentDisplayName}</h1>
                  <VerifiedAgentBadge status={agent.verification_status} />
                </div>
                {agent.verification_status === "verified" && (
                  <p className="mt-1 text-sm font-medium text-blue-700">
                    Identity confirmed by CASA
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
                  <span className="rounded-full bg-white px-3 py-1 font-semibold shadow-sm">
                    {avgRating.toFixed(1)} / 5 rating
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-semibold shadow-sm">
                    {totalReviews} review{totalReviews === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleContactClick}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              Contact Agent
            </button>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Properties</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">{listings.length}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Market Items</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">{marketItems.length}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Rating</p>
            <p className="mt-1 text-2xl font-bold text-gray-950">{avgRating.toFixed(1)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-950">Property Listings ({listings.length})</h2>
          <p className="text-sm text-gray-500">Homes and accommodation listed by this agent.</p>
        </div>
        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
            No property listings yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => (
              <Link key={item.id} href={`/property/${item.id}`} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <img src={item.image || fallbackListingImage} alt={item.title || "Property listing"} className="h-44 w-full object-cover" />
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="line-clamp-2 font-semibold text-gray-950">{item.title || "Untitled property"}</h3>
                    <VerifiedAgentBadge status={agent.verification_status} />
                  </div>
                  {agent.verification_status === "verified" && (
                    <p className="text-xs font-medium text-blue-700">
                      Identity confirmed by CASA
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{item.location || "Location not provided"}</p>
                  <p className="mt-3 font-semibold text-green-700">{formatPrice(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-950">Marketplace Items ({marketItems.length})</h2>
          <p className="text-sm text-gray-500">Campus market items posted by this agent.</p>
        </div>
        {marketItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
            No marketplace items listed yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {marketItems.map((item) => (
              <MarketItemCard
                key={item.id}
                id={item.id}
                title={item.title || "Untitled item"}
                price={item.price || 0}
                location={item.location}
                image={getMarketItemImage(item)}
                updatedAt={item.updated_at}
                isActive={item.is_active}
              />
            ))}
          </div>
        )}
      </section>

      {showContactModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Before you contact the agent
            </h2>

            <div className="text-gray-700 mb-6 space-y-3 text-sm">
              <p>Please take a moment to stay safe:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold">*</span>
                  <span>Do not send money directly to any agent. Payments should only be made to the landlord or caretaker after proper verification.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600 font-bold">*</span>
                  <span>Speak to people living in the property to confirm details before making any decision.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleContinueContact}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Continue to WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-950">Reviews</h2>
          <p className="text-sm text-gray-500">Ratings from users who have contacted this agent.</p>
        </div>

        {!isViewingOwnProfile && (
          <div className="mb-5">
            {!user ? (
            <button onClick={() => router.push("/login")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Login to leave a review
            </button>
            ) : (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="font-medium">Rating</label>
                <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="rounded-lg border border-gray-200 bg-white p-2">
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>

              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="min-h-28 w-full rounded-lg border border-gray-200 bg-white p-3"
                placeholder="Write your review"
              />

              <button
                onClick={submitReview}
                disabled={submitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {userReview ? "Update Review" : "Submit Review"}
              </button>
            </div>
            )}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
            No reviews yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <img
                      src={getOptimizedAvatarUrl(
                        review.profile?.avatar_url || null,
                        review.profile?.full_name || "Anonymous"
                      )}
                      alt={review.profile?.full_name || "Anonymous"}
                      className="w-10 h-10 rounded-full"
                    />

                    <div className="flex flex-col gap-1 md:gap-0 min-w-0">
                      <p className="font-semibold">{review.profile?.full_name || "Anonymous"}</p>
                      <span className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <span className="font-semibold whitespace-nowrap self-start md:self-auto md:whitespace-normal">Rating: {review.rating} / 5</span>
                </div>
                <p className="text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
