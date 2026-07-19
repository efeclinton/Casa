"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import Image from "next/image"
import { FormPageSkeleton } from "../../../components/LoadingSkeletons"
import { validatePropertyForm } from "../../../lib/propertyFormValidation"
import { cleanupUploadedPaths } from "../../../lib/storageCleanup"
import { ensureProfileComplete } from "../../../lib/profileCompletion"

export default function EditProperty() {

  const { id } = useParams()
  const router = useRouter()
  const propertyId = typeof id === "string" ? id : ""

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [accessError, setAccessError] = useState("")

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [rentPeriod, setRentPeriod] = useState("")
  const [listingType, setListingType] = useState("campus")
  const [school, setSchool] = useState("")
  const [description, setDescription] = useState("")

  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])

  const [videos, setVideos] = useState<File[]>([])
  const [existingVideos, setExistingVideos] = useState<string[]>([])
  const [tourLinks, setTourLinks] = useState<string[]>([""])

  const schools = [
    "University of Benin (UNIBEN)",
    "University of Nigeria Nsukka (UNN)",
    "University of Nigeria Enugu Campus (UNEC)",
    "University of Ibadan (UI)",
    "Obafemi Awolowo University (OAU)",
    "University of Lagos (UNILAG)",
    "Lagos State University (LASU)",
    "Ahmadu Bello University (ABU)",
    "Federal University of Technology Owerri (FUTO)",
    "Covenant University",
    "Babcock University"
  ]

  useEffect(() => {
    let active = true

    const fetchProperty = async () => {
      try {
        if (!propertyId) {
          if (active) {
            setAccessError("The property could not be found.")
            setLoading(false)
          }
          return
        }

        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError) {
          console.error("Property edit authentication failed", { code: authError.code, message: authError.message })
          if (active) {
            setAccessError("Unable to confirm your account. Please try again.")
            setLoading(false)
          }
          return
        }

        const user = authData.user
        if (!user) {
          router.replace(`/login?redirect=${encodeURIComponent(`/edit-property/${propertyId}`)}`)
          return
        }

        const complete = await ensureProfileComplete(user, router, `/edit-property/${propertyId}`)
        if (!complete) return

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("agent_status")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          console.error("Property edit agent-status check failed", { code: profileError.code, message: profileError.message })
          if (active) {
            setAccessError("Unable to confirm your agent status. Please try again.")
            setLoading(false)
          }
          return
        }

        if (profile?.agent_status !== "approved") {
          if (active) {
            setAccessError("Only approved agents can edit properties.")
            setLoading(false)
          }
          return
        }

        const { data, error: propertyError } = await supabase
          .from("properties")
          .select("id, owner_id, agent_id, title, price, location, phone, rent_period, school, description, image, images, videos, tour_images")
          .eq("id", propertyId)
          .or(`owner_id.eq.${user.id},agent_id.eq.${user.id}`)
          .maybeSingle()

        if (propertyError) {
          console.error("Property edit fetch failed", { code: propertyError.code, message: propertyError.message })
          if (active) {
            setAccessError("Unable to load this property. Please try again.")
            setLoading(false)
          }
          return
        }

        if (!data || (data.owner_id !== user.id && data.agent_id !== user.id)) {
          if (active) {
            setAccessError("You are not authorized to edit this property.")
            setLoading(false)
          }
          return
        }

        if (!active) return

        setTitle(data.title || "")
        setPrice(String(data.price ?? ""))
        setLocation(data.location || "")
        setPhone(data.phone || "")
        setRentPeriod(data.rent_period || "")
        setListingType("campus")
        setSchool(data.school || "")
        setDescription(data.description || "")

        setExistingImages(data.images || (data.image ? [data.image] : []))
        setExistingVideos(data.videos || [])
        setTourLinks(data.tour_images?.length ? data.tour_images : [""])

        setLoading(false)
      } catch (error) {
        console.error("Unexpected property edit loading failure", {
          message: error instanceof Error ? error.message : "Unknown error",
        })
        if (active) {
          setAccessError("Unable to load this property. Please try again.")
          setLoading(false)
        }
      }
    }

    void fetchProperty()

    return () => {
      active = false
    }
  }, [propertyId, router])

  const removeImage = (img: string) => {
    setExistingImages(prev => prev.filter(i => i !== img))
  }

  const removeVideo = (video: string) => {
    setExistingVideos(prev => prev.filter(v => v !== video))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault()

    if (saving) return

    const validation = validatePropertyForm({
      title,
      price,
      location,
      phone,
      rentPeriod,
      listingType: "campus",
      school,
      description,
      tourLinks,
    })

    if (!validation.valid) {
      setSaving(false)
      setMessage(validation.message)
      return
    }

    const formValues = validation.values

    setSaving(true)
    setMessage("")

    const newlyUploadedImagePaths: string[] = []
    const newlyUploadedVideoPaths: string[] = []

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error("Property update authentication failed", { code: authError.code, message: authError.message })
        throw new Error("Unable to confirm your account. Please try again.")
      }

      const currentUser = authData.user
      if (!currentUser) {
        router.replace(`/login?redirect=${encodeURIComponent(`/edit-property/${propertyId}`)}`)
        throw new Error("You must be signed in to update this property.")
      }

      const { data: latestProfile, error: profileError } = await supabase
        .from("profiles")
        .select("agent_status")
        .eq("id", currentUser.id)
        .maybeSingle()

      if (profileError) {
        console.error("Property update agent-status check failed", { code: profileError.code, message: profileError.message })
        throw new Error("Unable to confirm your agent status. Please try again.")
      }

      if (latestProfile?.agent_status !== "approved") {
        throw new Error("Only approved agents can edit properties.")
      }

      const { data: ownedProperty, error: ownershipError } = await supabase
        .from("properties")
        .select("id, owner_id, agent_id")
        .eq("id", propertyId)
        .or(`owner_id.eq.${currentUser.id},agent_id.eq.${currentUser.id}`)
        .maybeSingle()

      if (ownershipError) {
        console.error("Property update ownership check failed", { code: ownershipError.code, message: ownershipError.message })
        throw new Error("Unable to confirm property ownership. Please try again.")
      }

      if (!ownedProperty || (ownedProperty.owner_id !== currentUser.id && ownedProperty.agent_id !== currentUser.id)) {
        throw new Error("You are not authorized to update this property.")
      }

      const imageUrls = [...existingImages]
      const videoUrls = [...existingVideos]

      // Upload new images
      if (images.length > 0) {

        for (const file of images) {

          const cleanName = file.name
            .replace(/\s+/g, "-")
            .replace(/[^\w.-]/g, "")

          const fileName = `${Date.now()}-${cleanName}`

          const { error } = await supabase.storage
            .from("property-images")
            .upload(fileName, file)

          if (error) throw error

          newlyUploadedImagePaths.push(fileName)

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

          newlyUploadedVideoPaths.push(fileName)

          const url =
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-videos/${fileName}`

          videoUrls.push(url)
        }
      }

      const { data: updatedProperty, error } = await supabase
        .from("properties")
        .update({
          updated_at: new Date().toISOString(),
          title: formValues.title,
          price: formValues.price,
          location: formValues.location,
          phone: formValues.phone,
          rent_period: formValues.rentPeriod,
          listing_type: "campus",
          school: formValues.school,
          description: formValues.description,
          tour_images: formValues.tourLinks,
          image: imageUrls.length > 0 ? imageUrls[0] : null,
          images: imageUrls,
          videos: videoUrls
        })
        .eq("id", propertyId)
        .or(`owner_id.eq.${currentUser.id},agent_id.eq.${currentUser.id}`)
        .select("id")
        .maybeSingle()

      if (error) throw error
      if (!updatedProperty) {
        throw new Error("The property could not be updated. It may no longer exist or you may not have permission.")
      }

      setMessage("Property updated successfully")

      setTimeout(() => {
        router.replace("/dashboard")
      }, 1200)

    } catch (err) {

      console.error("Property edit failed:", err)
      await Promise.all([
        cleanupUploadedPaths("property-images", newlyUploadedImagePaths, "property edit image"),
        cleanupUploadedPaths("property-videos", newlyUploadedVideoPaths, "property edit video"),
      ])
      const errorMessage = typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
        ? err.message
        : "Please try again."
      setMessage(`Failed to update property: ${errorMessage}`)

    }

    setSaving(false)
  }

  if (loading) {
    return <FormPageSkeleton maxWidth="max-w-xl" />
  }

  if (accessError) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-bold">Unable to edit property</h1>
        <p className="mt-3 text-sm text-red-700" role="alert">{accessError}</p>
        <button
          type="button"
          onClick={() => router.replace("/dashboard")}
          className="mt-6 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white"
        >
          Return to dashboard
        </button>
      </main>
    )
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
            placeholder="Property Title"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            className="w-full border p-3 rounded"
            minLength={3}
            required
          />

          {false && (
          <label className="block">
            <span className="mb-1 block font-medium">Listing type</span>
            <select
              value={listingType}
              onChange={(e) => {
                const nextListingType = e.target.value
                setListingType(nextListingType)
                if (nextListingType !== "campus") setSchool("")
                if (nextListingType === "sale") setRentPeriod("")
              }}
              className="w-full border p-3 rounded"
              required
            >
              <option value="rent">For Rent</option>
              <option value="sale">For Sale</option>
              <option value="campus">Campus Stay</option>
            </select>
          </label>
          )}

          <select
            value={school}
            onChange={(e)=>setSchool(e.target.value)}
            className="w-full border p-3 rounded"
            required
          >
            <option value="">Select School</option>

            {schools.map((s,index)=>(
              <option key={index} value={s}>
                {s}
              </option>
            ))}
          </select>

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

          <div>

            <p className="font-medium mb-1">Upload Property Images</p>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e)=>{

                const files = Array.from(e.target.files || [])

                if(files.length > 10){
                  alert("Maximum 10 images allowed")
                  return
                }

                setImages(files)

              }}
              className="w-full border p-3 rounded"
            />

          </div>

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

          <div>

            <p className="font-medium mb-1">Upload Property Videos</p>

            <input
              type="file"
              multiple
              accept="video/mp4,video/webm"
              onChange={(e)=>{

                const files = Array.from(e.target.files || [])

                if(files.length > 3){
                  alert("Maximum 3 videos allowed")
                  return
                }

                setVideos(files)

              }}
              className="w-full border p-3 rounded"
            />

          </div>

          {/* VIRTUAL TOUR INSTRUCTIONS */}

          <div className="border p-4 rounded-lg bg-gray-50">

            <p className="font-semibold mb-2">
              Add a 360° Virtual Tour (Optional)
            </p>

            <p className="text-sm text-gray-700 mb-3">
              A virtual tour helps renters explore the property before visiting.
            </p>

            <div className="text-sm text-gray-600 space-y-1 mb-4">

              <p><strong>How to create a tour:</strong></p>

              <p>1. Install <strong>360 Photo Cam</strong> from Play Store or App Store</p>
              <p>2. Stand in the middle of the room and take a 360 photo</p>
              <p>3. Upload the photo to <strong>Panoraven</strong> or <strong>Momento360</strong></p>
              <p>4. Copy the share link</p>
              <p>5. Paste the link below</p>

            </div>

            {tourLinks.map((link,index)=>(

              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Paste Panoraven or Momento360 tour link"
                  value={link}
                  onChange={(e)=>{

                    const updated = [...tourLinks]
                    updated[index] = e.target.value
                    setTourLinks(updated)

                  }}
                  className="w-full border p-3 rounded"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (tourLinks.length === 1) {
                      setTourLinks([""])
                      return
                    }
                    setTourLinks(tourLinks.filter((_, i) => i !== index))
                  }}
                  className="bg-black text-white text-xs px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>

            ))}

            <button
              type="button"
              onClick={()=>setTourLinks([...tourLinks,""])}
              className="text-green-600 text-sm"
            >
              + Add another tour
            </button>

          </div>

          <input
            type="number"
            placeholder="Price (e.g. 300000)"
            value={price}
            onChange={(e)=>setPrice(e.target.value)}
            className="w-full border p-3 rounded"
            min="0.01"
            step="any"
            required
          />

          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e)=>setLocation(e.target.value)}
            className="w-full border p-3 rounded"
            required
          />

          <select
            value={rentPeriod}
            onChange={(e)=>setRentPeriod(e.target.value)}
            className="w-full border p-3 rounded"
            required
          >
            <option value="">Select Rent Period</option>
            <option value="year">Per Year</option>
            <option value="month">Per Month</option>
          </select>

          <input
            type="text"
            placeholder="Whatsapp Number"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
            className="w-full border p-3 rounded"
            inputMode="tel"
            required
          />

          <textarea
            placeholder="Describe the property..."
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            className="w-full border p-3 rounded h-32"
            required
          />

          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-3 rounded-lg text-white ${
              saving ? "bg-gray-400" : "bg-green-600"
            }`}
          >
            {saving ? "Updating..." : "Update Property"}
          </button>

        </form>

      </section>

    </main>
  )
}
