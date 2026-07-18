"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import { ensureProfileComplete } from "../../../lib/profileCompletion"
import { FormPageSkeleton } from "../../../components/LoadingSkeletons"

export default function PostItemPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAgent, setIsAgent] = useState(false)
  const [accessMessage, setAccessMessage] = useState("Only approved agents can post marketplace items.")
  const [userId, setUserId] = useState("")

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const complete = await ensureProfileComplete(user, router, `/dashboard/post-item${editId ? `?edit=${editId}` : ""}`)
      if (!complete) return

      setUserId(user.id)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("agent_status")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.error("Unable to verify marketplace posting access:", profileError)
        setAccessMessage("Unable to verify your agent status. Please refresh and try again.")
        setIsAgent(false)
        setLoading(false)
        return
      }

      const canPost = profile?.agent_status === "approved"
      setIsAgent(!!canPost)

      if (!canPost) {
        setLoading(false)
        return
      }

      if (editId) {
        const { data: existingItem } = await supabase
          .from("market_items")
          .select("*")
          .eq("id", editId)
          .eq("user_id", user.id)
          .single()

        if (existingItem) {
          setTitle(existingItem.title || "")
          setPrice(String(existingItem.price || ""))
          setLocation(existingItem.location || "")
          setDescription(existingItem.description || "")
          setWhatsappNumber(existingItem.whatsapp_number || "")
          setExistingImages(existingItem.images || (existingItem.image ? [existingItem.image] : []))
        }
      }

      setLoading(false)
    }

    initialize()
  }, [router, editId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (saving) return
    if (!isAgent || !userId) return

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login?redirect=/dashboard/post-item")
      setSaving(false)
      return
    }

    const complete = await ensureProfileComplete(user, router, `/dashboard/post-item${editId ? `?edit=${editId}` : ""}`)
    if (!complete) {
      setSaving(false)
      return
    }

    const { data: latestProfile, error: agentStatusError } = await supabase
      .from("profiles")
      .select("agent_status")
      .eq("id", user.id)
      .single()

    if (agentStatusError) {
      console.error("Unable to revalidate marketplace posting access:", agentStatusError)
      alert("Unable to verify your agent status. Please try again.")
      setSaving(false)
      return
    }

    if (latestProfile?.agent_status !== "approved") {
      setIsAgent(false)
      setAccessMessage("Only approved agents can post marketplace items.")
      alert("Only approved agents can post marketplace items.")
      setSaving(false)
      return
    }

    const shouldReplaceImages = images.length > 0
    const uploadedUrls = shouldReplaceImages ? [] : [...existingImages]

    for (const [index, file] of images.entries()) {
      const cleanName = file.name.replace(/\s+/g, "-").replace(/[^\w.-]/g, "")
      const uniqueId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
      const fileName = `market/${uniqueId}-${cleanName}`

      const { error } = await supabase.storage
        .from("market-images")
        .upload(fileName, file)

      if (error) {
        console.error(`Image upload failed for ${file.name}:`, error)
        continue
      }

      const { data: publicUrlData } = supabase.storage
        .from("market-images")
        .getPublicUrl(fileName)

      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl)
      } else {
        console.error(`Public URL generation failed for ${file.name}`)
      }
    }

    if (editId) {
      const updatePayload = {
        title,
        description,
        price: Number(price),
        location,
        whatsapp_number: whatsappNumber,
        images: Array.isArray(uploadedUrls) ? uploadedUrls : [],
        updated_at: new Date().toISOString()
      }

      console.log("UPDATE PAYLOAD:", updatePayload)

      const { error } = await supabase
        .from("market_items")
        .update(updatePayload)
        .eq("id", editId)
        .eq("user_id", userId)

      if (error) {
        console.error("UPDATE ERROR:", error)
        alert(error.message || "Failed to update item")
        setSaving(false)
        return
      }
    } else {
      const currentUserId = user.id

      if (!currentUserId) {
        alert("You must be logged in")
        setSaving(false)
        return
      }

      const { error } = await supabase.from("market_items").insert({
        title: title,
        description: description,
        price: Number(price),
        location: location,
        whatsapp_number: whatsappNumber,
        images: uploadedUrls,
        user_id: currentUserId,
        is_active: true,
        updated_at: new Date().toISOString()
      })

      if (error) {
        console.error(error)
        alert(error.message)
        setSaving(false)
        return
      }

      alert("Item posted successfully")
    }

    setSaving(false)
    router.push("/dashboard")
  }

  if (loading) {
    return <FormPageSkeleton />
  }

  if (!isAgent) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">CASA Market</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Post Item</h1>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{accessMessage}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">CASA Market</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{editId ? "Edit Item" : "Post Item"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Add clear item details, pricing, images, and seller contact information for campus buyers.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Item Information</h2>
            <p className="mt-1 text-sm text-slate-500">Describe the item buyers will see in Campus Market.</p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Price & Location</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Price</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Location</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  required
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Images</h2>
            <p className="mt-1 text-sm text-slate-500">Upload item photos. Existing images remain unless you select replacements.</p>

            {existingImages.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-2">
                {existingImages.map((img) => (
                  <img key={img} src={img} alt="Existing" className="h-24 w-full rounded-xl object-cover" />
                ))}
              </div>
            )}

            <label className="mt-5 block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <span className="text-sm font-semibold text-slate-700">Item images</span>
              <span className="mt-1 block text-xs text-slate-500">Select one or more images from your device.</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImages(Array.from(e.target.files || []))}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
              />
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Contact/Seller Information</h2>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-700">WhatsApp number</span>
              <input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="WhatsApp number (e.g. 2348012345678)"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                required
              />
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Additional Details</h2>
            <p className="mt-1 text-sm text-slate-500">Review your item information before posting.</p>
          </section>

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : editId ? "Update Item" : "Post Item"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
