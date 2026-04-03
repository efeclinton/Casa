"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function ListProperty() {

  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [rentPeriod, setRentPeriod] = useState("")
  const [listingType, setListingType] = useState("rent")

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
        setLoading(false)
      }

    }

    checkUser()

  }, [router])


  /* TOUR LINK VALIDATION */

  const validateTourLinks = () => {

    const allowedDomains = [
      "momento360.com",
      "panoraven.com",
      "kuula.co"
    ]

    for (const link of tourLinks) {

      if (!link) continue

      const valid = allowedDomains.some(domain =>
        link.toLowerCase().includes(domain)
      )

      if (!valid) {
        alert("Tour links must come from Panoraven, Momento360, or Kuula.")
        return false
      }

    }

    return true
  }


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault()

    if (isSubmitting) return

    if (!validateTourLinks()) return

    setIsSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert("You must be logged in to list a property")
      router.push("/login")
      return
    }

    const ownerName =
      `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim()

    const ownerEmail = user.email || ""
    const ownerPhone = user.user_metadata?.phone || ""


    /* IMAGE UPLOAD */

    const imageUrls: string[] = []

    for (const file of images) {

      const cleanName = file.name
        .replace(/\s+/g, "-")
        .replace(/[^\w.-]/g, "")

      const fileName = `${Date.now()}-${cleanName}`

      const { error } = await supabase.storage
        .from("property-images")
        .upload(fileName, file)

      if (error) {
        alert("Image upload failed")
        setIsSubmitting(false)
        return
      }

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
        alert("Video upload failed")
        setIsSubmitting(false)
        return
      }

      const url =
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-videos/${fileName}`

      videoUrls.push(url)
    }


    /* INSERT PROPERTY */

    const { error } = await supabase
      .from("properties")
      .insert([
        {
          title,
          price: Number(price),
          location,
          rent_period: rentPeriod,
          listing_type: listingType,
          school,
          phone,
          description,

          image: imageUrls[0],
          images: imageUrls,
          videos: videoUrls,

          tour_images: tourLinks.filter(link => link !== ""),

          owner_id: user.id,
          owner_name: ownerName,
          owner_email: ownerEmail,
          owner_phone: ownerPhone
        }
      ])

    if (error) {

      alert("Error submitting property")
      console.log(error)
      setIsSubmitting(false)

    } else {

      alert("Property listed successfully")

      setTitle("")
      setPrice("")
      setLocation("")
      setPhone("")
      setRentPeriod("")
      setListingType("rent")
      setSchool("")
      setDescription("")
      setImages([])
      setVideos([])
      setTourLinks([""])

      router.push("/dashboard")
    }

  }


  if (loading) {
    return <p className="p-10">Checking login...</p>
  }


  return (

    <main className="max-w-xl mx-auto p-10">

      <h1 className="text-3xl font-bold mb-6">
        List a Property
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          type="text"
          placeholder="Property Title"
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
          className="w-full border p-3 rounded"
        />


        <select
          value={listingType}
          onChange={(e)=>setListingType(e.target.value)}
          className="w-full border p-3 rounded"
        >
          <option value="rent">For Rent</option>
          <option value="sale">For Sale</option>
          <option value="campus">Campus Stay</option>
        </select>


        {listingType === "campus" && (

          <select
            value={school}
            onChange={(e)=>setSchool(e.target.value)}
            className="w-full border p-3 rounded"
          >
            <option value="">Select School</option>

            {schools.map((s,index)=>(
              <option key={index} value={s}>
                {s}
              </option>
            ))}

          </select>

        )}


        {/* IMAGES */}

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


        {/* VIDEOS */}

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


        {/* VIRTUAL TOUR INSTRUCTIONS (UNCHANGED) */}

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
              className="w-full border p-3 rounded mb-2"
            />

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
        />


        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e)=>setLocation(e.target.value)}
          className="w-full border p-3 rounded"
        />


        <select
          value={rentPeriod}
          onChange={(e)=>setRentPeriod(e.target.value)}
          className="w-full border p-3 rounded"
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
        />


        <textarea
          placeholder="Describe the property..."
          value={description}
          onChange={(e)=>setDescription(e.target.value)}
          className="w-full border p-3 rounded h-32"
        />


        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-6 py-3 rounded-lg text-white ${
            isSubmitting ? "bg-gray-400" : "bg-green-600"
          }`}
        >
          {isSubmitting ? "Submitting..." : "Submit Property"}
        </button>

      </form>

    </main>

  )
}