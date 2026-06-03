"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { ensureProfileComplete, getProfileEmail, getProfilePhone } from "../../lib/profileCompletion"

export default function BecomeAgentPage() {
  const router = useRouter()

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

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login?redirect=/become-agent")
        return
      }

      const complete = await ensureProfileComplete(user, router, "/become-agent")
      if (!complete) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .single()

      setForm((prev) => ({
        ...prev,
        full_name: profile?.full_name || prev.full_name,
        phone: getProfilePhone(profile) || prev.phone,
        email: getProfileEmail(profile, user) || prev.email,
      }))
    }

    void initialize()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    const complete = await ensureProfileComplete(user.user, router, "/become-agent")
    if (!complete) {
      setLoading(false)
      return
    }

    // Check if profile has avatar_url
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, full_name, email, phone")
      .eq("id", user.user.id)
      .single()

    const profileFullName = profile?.full_name || form.full_name.trim()
    const profilePhone = getProfilePhone(profile) || form.phone.trim()
    const profileEmail = getProfileEmail(profile, user.user) || form.email.trim()

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
        full_name: profileFullName,
        phone: profilePhone,
        email: profileEmail,
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

    } catch (err: unknown) {
      console.log(err)
      alert(err instanceof Error ? err.message : "Something went wrong")
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-6 sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">CASA Agent Network</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Become a CASA Agent
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              List verified accommodations and connect with serious students looking for housing.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Get discovered by students", "Reach renters actively searching for verified campus accommodation."],
            ["Build trust with verification", "Submit your identity details so students know who they are contacting."],
            ["Manage listings easily", "Create and manage property listings from your CASA dashboard."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 h-10 w-10 rounded-2xl bg-emerald-50" />
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Agent Application</h2>
            <p className="mt-2 text-sm text-slate-500">
              Complete the details below so CASA can review your application.
            </p>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Full name</span>
                  <input
                    name="full_name"
                    placeholder="Full Name"
                    value={form.full_name}
                    onChange={handleChange}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">NIN</span>
                  <input
                    name="nin"
                    placeholder="NIN"
                    value={form.nin}
                    onChange={handleChange}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Contact Details</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Phone</span>
                  <input
                    name="phone"
                    placeholder="Phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <input
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Identity Verification</h3>
              <p className="mt-1 text-sm text-slate-500">Upload the required documents for review.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                  <span className="text-sm font-semibold text-slate-700">Upload Government ID</span>
                  <span className="mt-1 block text-xs text-slate-500">{govId ? govId.name : "Choose a clear photo or scan."}</span>
                  <input
                    type="file"
                    onChange={(e)=>setGovId(e.target.files?.[0] || null)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  />
                </label>

                <label className="block rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                  <span className="text-sm font-semibold text-slate-700">Upload Selfie with ID</span>
                  <span className="mt-1 block text-xs text-slate-500">{selfie ? selfie.name : "Choose a photo holding your ID."}</span>
                  <input
                    type="file"
                    onChange={(e)=>setSelfie(e.target.files?.[0] || null)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Business / Experience Details</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Business name</span>
                  <input
                    name="business_name"
                    placeholder="Business Name"
                    value={form.business_name}
                    onChange={handleChange}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Years of experience</span>
                  <input
                    name="years_experience"
                    placeholder="Years of Experience"
                    value={form.years_experience}
                    onChange={handleChange}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Operating city</span>
                  <input
                    name="operating_city"
                    placeholder="Operating City"
                    value={form.operating_city}
                    onChange={handleChange}
                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              <label className="mt-4 block">
                <span className="text-sm font-semibold text-slate-700">Additional info</span>
                <textarea
                  name="additional_info"
                  placeholder="Additional Info"
                  value={form.additional_info}
                  onChange={handleChange}
                  className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </section>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="min-h-12 w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
