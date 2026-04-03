"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import Image from "next/image"

export default function EditProperty() {

  const { id } = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [rentPeriod, setRentPeriod] = useState("")

  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])

  const [videos, setVideos] = useState<File[]>([])
  const [existingVideos, setExistingVideos] = useState<string[]>([])

  useEffect(() => {

    const fetchProperty = async () => {

      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single()

      if (!data) {
        router.push("/dashboard")
        return
      }

      setTitle(data.title)
      setPrice(String(data.price))
      setLocation(data.location)
      setPhone(data.phone)
      setRentPeriod(data.rent_period)

      setExistingImages(data.images || [])
      setExistingVideos(data.videos || [])

      setLoading(false)
    }

    fetchProperty()

  }, [id, router])

  const removeImage = (img: string) => {
    setExistingImages(prev => prev.filter(i => i !== img))
  }

  const removeVideo = (video: string) => {
    setExistingVideos(prev => prev.filter(v => v !== video))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault()

    if (saving) return

    setSaving(true)
    setMessage("")

    try {

      const imageUrls = [...existingImages]
      const videoUrls = [...existingVideos]

      // Upload new images
      if (images.length > 0) {

        for (const file of images) {

          const fileName = `${Date.now()}-${Math.random()}-${file.name}`

          const { error } = await supabase.storage
            .from("property-images")
            .upload(fileName, file)

          if (error) throw error

          const url =
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${fileName}`

          imageUrls.push(url)
        }
      }

      // Upload new videos
      if (videos.length > 0) {

        for (const file of videos) {

  const cleanName = file.name
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "")

  const fileName = `${Date.now()}-${cleanName}`

  const { error } = await supabase.storage
    .from("property-videos")
    .upload(fileName, file)

          if (error) throw error

          const url =
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-videos/${fileName}`

          videoUrls.push(url)
        }
      }

      const { error } = await supabase
        .from("properties")
        .update({
          title,
          price: Number(price),
          location,
          phone,
          rent_period: rentPeriod,
          image: imageUrls.length > 0 ? imageUrls[0] : null,
          images: imageUrls,
          videos: videoUrls
        })
        .eq("id", id)

      if (error) throw error

      setMessage("Property updated successfully")

      setTimeout(() => {
        router.replace("/dashboard")
      }, 1200)

    } catch (err) {

      console.error(err)
      setMessage("Something went wrong. Please try again.")

    }

    setSaving(false)
  }

  if (loading) {
    return <p className="p-10">Loading...</p>
  }

  return (

    <main>

      

      <section className="max-w-xl mx-auto p-10">

        <h1 className="text-3xl font-bold mb-6">
          Edit Property
        </h1>

        {message && (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="text"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="number"
            value={price}
            onChange={(e)=>setPrice(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="text"
            value={location}
            onChange={(e)=>setLocation(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <select
            value={rentPeriod}
            onChange={(e)=>setRentPeriod(e.target.value)}
            className="w-full border p-3 rounded"
          >
            <option value="year">Per Year</option>
            <option value="month">Per Month</option>
          </select>

          <input
            type="text"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
            className="w-full border p-3 rounded"
          />

          {/* Existing Images */}

          <div>

            <p className="mb-2 font-medium">
              Current Images
            </p>

            <div className="grid grid-cols-3 gap-3">

              {existingImages.map((img, i)=>(
                <div key={i} className="relative">

                  <Image
                    src={img}
                    alt="Property image"
                    width={100}
                    height={96}
                    className="h-24 w-full object-cover rounded"
                  />

                  <button
                    type="button"
                    onClick={()=>removeImage(img)}
                    className="absolute top-1 right-1 bg-black text-white text-xs px-2 py-1 rounded"
                  >
                    ✕
                  </button>

                </div>
              ))}

            </div>

          </div>

          {/* Upload new images */}

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e)=>setImages(Array.from(e.target.files || []))}
            className="w-full border p-3 rounded"
          />

          {/* Existing Videos */}

          <div>

            <p className="mb-2 font-medium">
              Current Videos
            </p>

            <div className="space-y-4">

              {existingVideos.map((video, i)=>(
                <div key={i} className="relative">

                  <video
                    src={video}
                    controls
                    className="w-full rounded"
                  />

                  <button
                    type="button"
                    onClick={()=>removeVideo(video)}
                    className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded"
                  >
                    ✕
                  </button>

                </div>
              ))}

            </div>

          </div>

          {/* Upload new videos */}

          <input
            type="file"
            multiple
            accept="video/mp4,video/webm"
            onChange={(e)=>setVideos(Array.from(e.target.files || []))}
            className="w-full border p-3 rounded"
          />

          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update Property"}
          </button>

        </form>

      </section>

    </main>
  )
}