"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabaseClient"

export default function BecomeAgentPage() {

  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    nin: "",
    business_name: "",
    years_experience: "",
    operating_city: "",
    additional_info: ""
  })

  const [govId, setGovId] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const getFileExtension = (fileName: string) => {
    const parts = fileName.split(".")
    if (parts.length < 2) return ""
    return parts.pop()?.toLowerCase() || ""
  }

  // Store file by path so DB keeps a stable storage key.
  const uploadFile = async (file: File, path: string) => {
    const { error } = await supabase.storage
      .from("agent-documents")
      .upload(path, file)

    if (error) {
      throw new Error(error.message || "Upload failed")
    }

    // ✅ Return ONLY file path (not public URL)
    return path
  }

  const handleSubmit = async () => {
    setLoading(true)

    const { data: user } = await supabase.auth.getUser()

    if (!user?.user) {
      alert("Not logged in")
      setLoading(false)
      return
    }

    // Check if profile has avatar_url
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.user.id)
      .single()

    if (!profile?.avatar_url) {
      alert("Please upload a profile photo before applying as an agent")
      setLoading(false)
      return
    }

    if (!govId || !selfie) {
      alert("Please upload required documents")
      setLoading(false)
      return
    }

    try {
      const timestamp = Date.now()
      const govExt = getFileExtension(govId.name)
      const selfieExt = getFileExtension(selfie.name)
      const govPath = `gov-${user.user.id}-${timestamp}${govExt ? `.${govExt}` : ""}`
      const selfiePath = `selfie-${user.user.id}-${timestamp}${selfieExt ? `.${selfieExt}` : ""}`

      const uploadedGovPath = await uploadFile(
        govId,
        govPath
      )

      const uploadedSelfiePath = await uploadFile(
        selfie,
        selfiePath
      )

      const { error: applicationError } = await supabase
      .from("agent_applications")
      .insert({
        user_id: user.user.id,
        ...form,
        government_id_url: uploadedGovPath,
        selfie_with_id_url: uploadedSelfiePath
      })

      if (applicationError) {
        throw new Error(applicationError.message || "Failed to save application")
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ agent_status: "pending" })
        .eq("id", user.user.id)

      if (profileError) {
        throw new Error(profileError.message || "Failed to update profile")
      }

      alert("Application submitted successfully")

      // Optional reset
      setForm({
        full_name: "",
        phone: "",
        email: "",
        nin: "",
        business_name: "",
        years_experience: "",
        operating_city: "",
        additional_info: ""
      })
      setGovId(null)
      setSelfie(null)

    } catch (err: any) {
      console.log(err)
      alert(err?.message || "Something went wrong")
    }

    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto p-6">

      <h1 className="text-2xl font-bold mb-4">
        Become an Agent
      </h1>

      <input name="full_name" placeholder="Full Name" value={form.full_name} onChange={handleChange} className="border p-2 w-full mb-2"/>
      <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} className="border p-2 w-full mb-2"/>
      <input name="email" placeholder="Email" value={form.email} onChange={handleChange} className="border p-2 w-full mb-2"/>
      <input name="nin" placeholder="NIN" value={form.nin} onChange={handleChange} className="border p-2 w-full mb-2"/>
      <input name="business_name" placeholder="Business Name" value={form.business_name} onChange={handleChange} className="border p-2 w-full mb-2"/>
      <input name="years_experience" placeholder="Years of Experience" value={form.years_experience} onChange={handleChange} className="border p-2 w-full mb-2"/>
      <input name="operating_city" placeholder="Operating City" value={form.operating_city} onChange={handleChange} className="border p-2 w-full mb-2"/>

      <textarea name="additional_info" placeholder="Additional Info" value={form.additional_info} onChange={handleChange} className="border p-2 w-full mb-2"/>

      <p className="mt-3">Upload Government ID</p>
      <input type="file" onChange={(e)=>setGovId(e.target.files?.[0] || null)} />

      <p className="mt-3">Upload Selfie with ID</p>
      <input type="file" onChange={(e)=>setSelfie(e.target.files?.[0] || null)} />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-black text-white p-3 w-full mt-4"
      >
        {loading ? "Submitting..." : "Submit Application"}
      </button>

    </div>
  )
}