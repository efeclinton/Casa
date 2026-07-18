"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import { ensureProfileComplete } from "../../lib/profileCompletion"
import { FormPageSkeleton } from "../../components/LoadingSkeletons"
import { validatePropertyForm } from "../../lib/propertyFormValidation"
import { cleanupUploadedPaths } from "../../lib/storageCleanup"

export default function ListProperty() {

  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [loadedAgentStatus, setLoadedAgentStatus] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [rentPeriod, setRentPeriod] = useState("")
  const [listingType, setListingType] = useState("campus")

  const [school, setSchool] = useState("")
  const [description, setDescription] = useState("")

  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [tourLinks, setTourLinks] = useState<string[]>([""])

  const [isSubmitting, setIsSubmitting] = useState(false)

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

    const checkUser = async () => {

      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.push("/login")
      } else {
        const complete = await ensureProfileComplete(data.session.user, router, "/list-property")
        if (!complete) return

        const { data: profile } = await supabase
          .from("profiles")
          .select("agent_status")
          .eq("id", data.session.user.id)
          .single()

        setLoadedAgentStatus(profile?.agent_status || null)
        setLoading(false)
      }

    }

    checkUser()

  }, [router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault()

    if (isSubmitting) return

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
      setIsSubmitting(false)
      alert(validation.message)
      return
    }

    const formValues = validation.values

    setIsSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert("You must be logged in to list a property")
      setIsSubmitting(false)
      router.push("/login")
      return
    }

    const complete = await ensureProfileComplete(user, router, "/list-property")
    if (!complete) {
      setIsSubmitting(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agent_status, full_name, email, phone")
      .eq("id", user.id)
      .single()

    if (profileError) {
      alert("Unable to verify account status")
      setIsSubmitting(false)
      return
    }

    const agentStatus = profile?.agent_status || null

    if (agentStatus !== "approved") {
      alert("Only approved agents can create listings.")
      setIsSubmitting(false)
      return
    }

    const ownerName = profile.full_name || ""
    const ownerEmail = profile.email || user.email || ""
    const ownerPhone = profile.phone || ""

    const newTitle = formValues.title
    const newLocation = formValues.location

    const { data: existing, error: duplicateError } = await supabase
      .from("properties")
      .select("id, title")
      .ilike("title", newTitle)
      .eq("location", newLocation)

    if (duplicateError) {
      console.error("Duplicate property check failed:", duplicateError)
      alert(`Unable to check for duplicate listings: ${duplicateError.message || "Please try again."}`)
      setIsSubmitting(false)
      return
    }

    const isDuplicate = (existing?.length || 0) > 0

    if (isDuplicate) {
      const proceed = confirm("This listing may already exist. Do you want to continue?")
      if (!proceed) {
        setIsSubmitting(false)
        return
      }
    }

    /* IMAGE UPLOAD */

    const imageUrls: string[] = []
    const newlyUploadedImagePaths: string[] = []
    const newlyUploadedVideoPaths: string[] = []

    for (const file of images) {

      const cleanName = file.name
        .replace(/\s+/g, "-")
        .replace(/[^\w.-]/g, "")

      const fileName = `${Date.now()}-${cleanName}`

      const { error } = await supabase.storage
        .from("property-images")
        .upload(fileName, file)

      if (error) {
        console.error("Property image upload failed:", error)
        await Promise.all([
          cleanupUploadedPaths("property-images", newlyUploadedImagePaths, "property creation image"),
          cleanupUploadedPaths("property-videos", newlyUploadedVideoPaths, "property creation video"),
        ])
        alert(`Image upload failed: ${error.message || "Please try again."}`)
        setIsSubmitting(false)
        return
      }

      newlyUploadedImagePaths.push(fileName)

      const url =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${fileName}`

      imageUrls.push(url)
    }


    /* VIDEO UPLOAD */

    const videoUrls: string[] = []

    for (const file of videos) {

      const cleanName = file.name
        .replace(/\s+/g, "-")
        .replace(/[^\w.-]/g, "")

      const fileName = `${Date.now()}-${cleanName}`

      const { error } = await supabase.storage
        .from("property-videos")
        .upload(fileName, file)

      if (error) {
        console.error("Property video upload failed:", error)
        await Promise.all([
          cleanupUploadedPaths("property-images", newlyUploadedImagePaths, "property creation image"),
          cleanupUploadedPaths("property-videos", newlyUploadedVideoPaths, "property creation video"),
        ])
        alert(`Video upload failed: ${error.message || "Please try again."}`)
        setIsSubmitting(false)
        return
      }

      newlyUploadedVideoPaths.push(fileName)

      const url =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-videos/${fileName}`

      videoUrls.push(url)
    }


    /* INSERT PROPERTY */

    const { error } = await supabase
      .from("properties")
      .insert([
        {
          updated_at: new Date().toISOString(),
          title: formValues.title,
          price: formValues.price,
          location: formValues.location,
          rent_period: formValues.rentPeriod,
          listing_type: "campus",
          school: formValues.school,
          phone: formValues.phone,
          description: formValues.description,

          image: imageUrls[0],
          images: imageUrls,
          videos: videoUrls,

          tour_images: formValues.tourLinks,

          owner_id: user.id,
          agent_id: user.id,
          owner_name: ownerName,
          owner_email: ownerEmail,
          owner_phone: ownerPhone,
          ...(isDuplicate ? { is_duplicate: true } : {})
        }
      ])

    if (error) {
      console.error("Property insert failed:", error)
      await Promise.all([
        cleanupUploadedPaths("property-images", newlyUploadedImagePaths, "property creation image"),
        cleanupUploadedPaths("property-videos", newlyUploadedVideoPaths, "property creation video"),
      ])
      alert(`Error submitting property: ${error.message || "Please try again."}`)
      setIsSubmitting(false)

    } else {

      alert("Property listed successfully")

      setTitle("")
      setPrice("")
      setLocation("")
      setPhone("")
      setRentPeriod("")
      setListingType("campus")
      setSchool("")
      setDescription("")
      setImages([])
      setVideos([])
      setTourLinks([""])

      router.push("/dashboard")
    }

  }


  if (loading) {
    return <FormPageSkeleton maxWidth="max-w-4xl" />
  }

  if (loadedAgentStatus !== "approved") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">CASA Listings</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            List a Property
          </h1>

          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You cannot create listings because your account is currently restricted.
          </p>
        </section>
      </main>
    )
  }


  return (

    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">CASA Listings</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            List a Property
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Create a polished property listing with clear pricing, media, location, and contact details.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <p className="mt-1 text-sm text-slate-500">Start with the listing title and category details.</p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Property title</span>
                <input
                  type="text"
                  placeholder="Property Title"
                  value={title}
                  onChange={(e)=>setTitle(e.target.value)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  minLength={3}
                  required
                />
              </label>

              {false && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Listing type</span>
                <select
                  value={listingType}
                  onChange={(e) => {
                    const nextListingType = e.target.value
                    setListingType(nextListingType)
                    if (nextListingType !== "campus") setSchool("")
                    if (nextListingType === "sale") setRentPeriod("")
                  }}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  required
                >
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                  <option value="campus">Campus Stay</option>
                </select>
              </label>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">School</span>
                <select
                  value={school}
                  onChange={(e)=>setSchool(e.target.value)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  required
                >
                  <option value="">Select School</option>

                  {schools.map((s,index)=>(
                    <option key={index} value={s}>
                      {s}
                    </option>
                  ))}

                </select>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Pricing & Rent Details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Price</span>
                <input
                  type="number"
                  placeholder="Price (e.g. 300000)"
                  value={price}
                  onChange={(e)=>setPrice(e.target.value)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  min="0.01"
                  step="any"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Rent period</span>
                <select
                  value={rentPeriod}
                  onChange={(e)=>setRentPeriod(e.target.value)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  required
                >
                  <option value="">Select Rent Period</option>
                  <option value="year">Per Year</option>
                  <option value="month">Per Month</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Location</h2>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-700">Property location</span>
              <input
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e)=>setLocation(e.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                required
              />
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Media Uploads</h2>
            <p className="mt-1 text-sm text-slate-500">Add images, videos, and optional virtual tours.</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <span className="text-sm font-semibold text-slate-700">Upload Property Images</span>
                <span className="mt-1 block text-xs text-slate-500">Up to 10 images.</span>
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
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                />
              </label>

              <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <span className="text-sm font-semibold text-slate-700">Upload Property Videos</span>
                <span className="mt-1 block text-xs text-slate-500">Up to 3 videos.</span>
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
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                Add a 360 Virtual Tour (Optional)
              </p>

              <p className="mt-2 text-sm text-slate-600">
                A virtual tour helps renters explore the property before visiting.
              </p>

              <div className="mt-4 space-y-1 text-sm text-slate-600">
                <p><strong>How to create a tour:</strong></p>
                <p>1. Install <strong>360 Photo Cam</strong> from Play Store or App Store</p>
                <p>2. Stand in the middle of the room and take a 360 photo</p>
                <p>3. Upload the photo to <strong>Panoraven</strong> or <strong>Momento360</strong></p>
                <p>4. Copy the share link</p>
                <p>5. Paste the link below</p>
              </div>

              <div className="mt-4 space-y-2">
                {tourLinks.map((link,index)=>(
                  <input
                    key={index}
                    type="text"
                    placeholder="Paste Panoraven or Momento360 tour link"
                    value={link}
                    onChange={(e)=>{

                      const updated = [...tourLinks]
                      updated[index] = e.target.value
                      setTourLinks(updated)

                    }}
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={()=>setTourLinks([...tourLinks,""])}
                className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                + Add another tour
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Contact/Agent Information</h2>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-700">Whatsapp Number</span>
              <input
                type="text"
                placeholder="Whatsapp Number"
                value={phone}
                onChange={(e)=>setPhone(e.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                inputMode="tel"
                required
              />
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Additional Details</h2>
            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-700">Description</span>
              <textarea
                placeholder="Describe the property..."
                value={description}
                onChange={(e)=>setDescription(e.target.value)}
                className="mt-2 h-36 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                required
              />
            </label>
          </section>

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`min-h-12 w-full rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition sm:w-auto ${
                isSubmitting ? "bg-slate-400" : "bg-slate-950 hover:bg-emerald-700"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit Property"}
            </button>
          </div>
        </form>
      </div>
    </main>

  )
}
