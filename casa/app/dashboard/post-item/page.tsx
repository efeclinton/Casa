"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

export default function PostItemPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAgent, setIsAgent] = useState(false)
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

      setUserId(user.id)

      const { data: profile } = await supabase
        .from("profiles")
        .select("role,agent_status")
        .eq("id", user.id)
        .single()

      const canPost = profile?.role === "agent" || profile?.agent_status === "approved"
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
        images: Array.isArray(uploadedUrls) ? uploadedUrls : []
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
      const user = await supabase.auth.getUser()
      const currentUserId = user.data.user?.id

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
        is_active: true
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
    return <main className="max-w-2xl mx-auto p-10">Loading...</main>
  }

  if (!isAgent) {
    return (
      <main className="max-w-2xl mx-auto p-10">
        <h1 className="text-2xl font-bold mb-2">Post Item</h1>
        <p className="text-gray-600">Only agents can post items in Campus Market.</p>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-6">{editId ? "Edit Item" : "Post Item"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full border p-3 rounded"
          required
        />

        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          className="w-full border p-3 rounded"
          required
        />

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="w-full border p-3 rounded"
          required
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full border p-3 rounded min-h-28"
          required
        />

        <input
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="WhatsApp number (e.g. 2348012345678)"
          className="w-full border p-3 rounded"
          required
        />

        {existingImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {existingImages.map((img) => (
              <img key={img} src={img} alt="Existing" className="w-full h-24 object-cover rounded" />
            ))}
          </div>
        )}

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(Array.from(e.target.files || []))}
          className="w-full border p-3 rounded"
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white py-3 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : editId ? "Update Item" : "Post Item"}
        </button>
      </form>
    </main>
  )
}
