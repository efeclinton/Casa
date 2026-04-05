"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase, getOptimizedAvatarUrl } from "../../../lib/supabaseClient"
import Image from "next/image"

export default function AgentProfilePage() {

const params = useParams()
const router = useRouter()
const agentId = params?.id ? String(params.id) : null

const [agent, setAgent] = useState<any>(null)
const [loading, setLoading] = useState(true)
const [listings, setListings] = useState<any[]>([])
const [avgRating, setAvgRating] = useState(0)
const [totalReviews, setTotalReviews] = useState(0)
const [reviews, setReviews] = useState<any[]>([])
const [user, setUser] = useState<any>(null)
const [hasContacted, setHasContacted] = useState(false)
const [userReview, setUserReview] = useState<any>(null)
const [rating, setRating] = useState(5)
const [comment, setComment] = useState("")
const [submitting, setSubmitting] = useState(false)

useEffect(() => {

if (!agentId || agentId === "undefined") {
  console.log("Invalid agentId:", agentId)
  return
}

console.log("FINAL agentId:", agentId)
const load = async () => {
  setLoading(true)

  // =====================
  // LOAD AGENT
  // =====================
  const { data: agentData, error: agentError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", agentId)
    .single()

  if (!agentData) {
    setLoading(false)
    return
  }

  setAgent(agentData)

  const { data: propertiesData } = await supabase
    .from("properties")
    .select("id,title,price,location,image")
    .eq("agent_id", agentId)

  // =====================
  // LOAD REVIEWS (FIXED)
  // =====================
  const { data: reviewsData, error: reviewsError } = await supabase
    .from("agent_ratings")
    .select("id, rating, comment, created_at, user_id, profiles (full_name)")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  console.log("REVIEWS ERROR:", reviewsError)
  console.log("REVIEWS DATA:", reviewsData)

  setReviews(reviewsData || [])

  // =====================
  // CALCULATE RATING
  // =====================
  if (reviewsData && reviewsData.length > 0) {
    const sum = reviewsData.reduce((acc, r: any) => acc + r.rating, 0)
    setAvgRating(Number((sum / reviewsData.length).toFixed(1)))
    setTotalReviews(reviewsData.length)
  } else {
    setAvgRating(0)
    setTotalReviews(0)
  }

  const { data: authData } = await supabase.auth.getUser()

  setListings(propertiesData || [])

  const currentUser = authData?.user ?? null
  setUser(currentUser)

  if (currentUser) {
    const { data: contactData } = await supabase
      .from("agent_contacts")
      .select("id")
      .eq("agent_id", agentId)
      .eq("user_id", currentUser.id)

    setHasContacted((contactData || []).length > 0)

    const existingReview = (reviewsData || []).find((r: any) => r.user_id === currentUser.id)

    if (existingReview) {
      setUserReview(existingReview)
      setRating(existingReview.rating)
      setComment(existingReview.comment || "")
    }
  }

  setLoading(false)
}

load()

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

  if (userReview) {
    const { error } = await supabase
      .from("agent_ratings")
      .update({ rating, comment })
      .eq("id", userReview.id)

    if (error) throw error

  } else {

    const { error } = await supabase
      .from("agent_ratings")
      .insert({
        agent_id: agentId,
        user_id: user.id,
        rating,
        comment
      })

    if (error) throw error
  }

  const { data: newReviews, error: newReviewsError } = await supabase
    .from("agent_ratings")
    .select("id, rating, comment, created_at, user_id, profiles (full_name)")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  console.log("REFETCH ERROR:", newReviewsError)
  console.log("REFETCH DATA:", newReviews)

  setReviews(newReviews || [])

  const ratingValues = newReviews || []

  if (ratingValues.length > 0) {
    const sum = (ratingValues as any[]).reduce((acc, x) => acc + (x.rating || 0), 0)
    setAvgRating(Number((sum / ratingValues.length).toFixed(1)))
    setTotalReviews(ratingValues.length)
  }

  alert("Review saved")

} catch (err: any) {
  console.error(err)
  alert(err.message || "Unable to submit review")
} finally {
  setSubmitting(false)
}
}

const handleContactClick = async () => {

  if (!user) {
    router.push(`/login?redirect=/agent/${agentId}`)
    return
  }

  // Save contact event
  const { error } = await supabase
    .from("agent_contacts")
    .insert([{ agent_id: agentId, user_id: user.id }])

  if (error) {
    console.error("Contact insert failed:", error)
  }

  setHasContacted(true)

  // 🔥 ALWAYS fetch fresh profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", agentId)
    .single()

  let phone = profile?.phone || ""

  if (!phone) {
    alert("Agent phone number not available")
    return
  }

  // Format Nigerian number
  if (phone.startsWith("0")) {
    phone = "234" + phone.slice(1)
  }

  const message = encodeURIComponent(
    "Hello, I'm interested in your property on Casa."
  )

  const whatsappLink = `https://wa.me/${phone}?text=${message}`

  window.open(whatsappLink, "_blank")
}

if (loading) return (<main className="p-10">Loading agent...</main>)
if (!agent) return (<main className="p-10">Agent not found</main>)

return (

<main className="max-w-5xl mx-auto p-10 space-y-6">

  <section className="p-6 bg-white rounded-lg shadow">

    <div className="flex items-center gap-4">

      <div className="relative w-24 h-24">
        <Image
          src={getOptimizedAvatarUrl(agent.avatar_url, agent.full_name)}
          alt={`${agent.full_name} avatar`}
          width={96}
          height={96}
          className="rounded-full object-cover"
        />
      </div>

      <div>
        <h1 className="text-3xl font-bold">{agent.full_name}</h1>

        <p className="text-gray-500">
          Average Rating: {avgRating.toFixed(1)} / 5
        </p>

        <p className="text-gray-500">
          {totalReviews} review{totalReviews === 1 ? "" : "s"}
        </p>

        <button
          onClick={handleContactClick}
          className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Contact Agent
        </button>
      </div>

    </div>

  </section>

  <section className="p-6 bg-white rounded-lg shadow">

    <h2 className="text-2xl font-semibold mb-4">
      Listings by this agent
    </h2>

    {listings.length === 0 ? (
      <p className="text-gray-500">
        This agent has no listings yet
      </p>
    ) : (

      <div className="space-y-4">

        {listings.map((item) => (

          <a
            key={item.id}
            href={`/property/${item.id}`}
            className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50"
          >

            <img
              src={item.image || "https://via.placeholder.com/120"}
              alt={item.title}
              className="w-24 h-24 object-cover rounded"
            />

            <div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.location}</p>
              <p className="text-semibold">₦{item.price}</p>
            </div>

          </a>

        ))}

      </div>
    )}

  </section>

  <section className="p-6 bg-white rounded-lg shadow">

    <h2 className="text-2xl font-semibold mb-4">Reviews</h2>

    <div className="mb-4">

      {!user ? (

        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Login to leave a review
        </button>

      ) : (

        <div className="space-y-2 p-4 border rounded-lg">

          <div className="flex flex-col gap-2">
            <label className="font-medium">Rating</label>

            <div className="flex gap-1">
              {[1,2,3,4,5].map((star)=>(
                <button
                  key={star}
                  type="button"
                  onClick={()=>setRating(star)}
                  className={`text-2xl transition-colors ${
                    star <= rating ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="Write your review"
          />

          <button
            onClick={submitReview}
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {userReview ? "Update Review" : "Submit Review"}
          </button>

        </div>
      )}

    </div>

    {reviews.length === 0 ? (

      <p className="text-gray-500">No reviews yet</p>

    ) : (

      <div className="space-y-3">

        {reviews.map((review) => (

          <div key={review.id} className="border px-4 py-3 rounded-lg">

            <div className="flex justify-between items-start gap-3 mb-2">

              <div className="flex items-start gap-3">
                <img
                  src={getOptimizedAvatarUrl(
                    review.profiles?.avatar_url || review.user?.avatar_url,
                    review.profiles?.full_name || review.user?.full_name
                  )}
                  className="w-10 h-10 rounded-full"
                />

                <div>
                  <p className="font-semibold">
                    {review.profiles?.full_name || review.user?.full_name || "Anonymous"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </div>

            </div>

            <div className="text-yellow-400 mb-1">
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </div>

            <p>{review.comment}</p>

          </div>

        ))}

      </div>
    )}

  </section>

</main>

)
}