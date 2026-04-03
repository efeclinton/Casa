"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase, getOptimizedAvatarUrl } from "../../../lib/supabaseClient"
import Image from "next/image"

export default function AgentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

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

      const [{ data: propertiesData }, { data: ratingsData }, { data: reviewsData }] = await Promise.all([
        supabase
          .from("properties")
          .select("id,title,price,location,image")
          .or(`agent_id.eq.${agentId},owner_id.eq.${agentId}`),
        supabase
          .from("agent_reviews")
          .select("rating"),
        supabase
          .from("agent_reviews")
          .select("id,user_id,rating,comment,created_at")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false }),
      ])

      const { data: authData } = await supabase.auth.getUser()

      setListings(propertiesData || [])

      const currentUser = authData?.user ?? null
      setUser(currentUser)

      const reviewList = reviewsData || []
      setReviews(reviewList)

      const ratingValues = ratingsData || []
      if (ratingValues.length > 0) {
        const sum = (ratingValues as any[]).reduce((acc, x) => acc + (x.rating || 0), 0)
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

        const existingReview = reviewList.find((r: any) => r.user_id === currentUser.id)
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
          .from("agent_reviews")
          .update({ rating, comment })
          .eq("id", userReview.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("agent_reviews")
          .insert({ agent_id: agentId, user_id: user.id, rating, comment })

        if (error) throw error
      }

      const { data: newReviews } = await supabase
        .from("agent_reviews")
        .select("id,user_id,rating,comment,created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })

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

    const { error } = await supabase
      .from("agent_contacts")
      .insert({ agent_id: agentId, user_id: user.id })

    if (error) {
      console.error("Could not insert contact record", error)
    }

    window.alert("Contact recorded. Please use your preferred communication channel.")
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
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB4PSIzNiIgeT0iMzYiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0E0QUYiIHN0cm9rZS13aWR0aD0iMS41Ij4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0QzE0IDUuMSAxMy4xIDYgMTIgNkMxMC45IDYgMTAgNS4xIDEwIDRDMTAgMi45IDEwLjkgMiAxMiAyWk0xMiAxNEM5LjggMTQgOCA5LjggOCA3QzggNS4yIDkuMiA0IDEyIDRDMTQuOCA0IDE2IDUuMiAxNiA3QzE2IDkuOCAxNC44IDE0IDEyIDE0WiIvPgo8L3N2Zz4KPC9zdmc+"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{agent.full_name}</h1>
            <p className="text-gray-500">Average Rating: {avgRating.toFixed(1)} / 5</p>
            <p className="text-gray-500">{totalReviews} review{totalReviews === 1 ? "" : "s"}</p>
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
        <h2 className="text-2xl font-semibold mb-4">Listings by this agent</h2>
        {listings.length === 0 ? (
          <p className="text-gray-500">This agent has no listings yet</p>
        ) : (
          <div className="space-y-4">
            {listings.map((item) => (
              <a key={item.id} href={`/property/${item.id}`} className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50">
                <img src={item.image || "https://via.placeholder.com/120"} alt={item.title} className="w-24 h-24 object-cover rounded" />
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
            <button onClick={() => router.push('/login')} className="px-4 py-2 bg-blue-500 text-white rounded">Login to leave a review</button>
          ) : (
            <div className="space-y-2 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <label className="font-medium">Rating</label>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border rounded p-1">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
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
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Rating: {review.rating} / 5</span>
                  <span className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
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
