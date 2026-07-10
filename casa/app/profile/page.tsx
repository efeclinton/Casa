"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import { getProfileEmail, getSafeRedirectPath } from "../../lib/profileCompletion"
import { getAgentDisplayName } from "../../lib/agentDisplay"
import { ProfilePageSkeleton } from "../../components/LoadingSkeletons"
import Avatar from "../../components/Avatar"
import PropertyThumbnail from "../../components/PropertyThumbnail"

type Profile = {
  id?: string
  full_name?: string
  business_name?: string | null
  email?: string
  phone?: string
  avatar_url?: string
  agent_status?: string
  verification_status?: string
  referral_code?: string | null
}

type SavedListing = {
  savedId: string
  propertyId: string
  property: {
    title?: string
    price?: number
    location?: string
    image?: string | null
    images?: string[] | null
  } | null
}

const formatPrice = (price?: number) =>
  typeof price === "number" ? `₦${Number(price).toLocaleString()}` : "Price not set"

const normalizeStatus = (status?: string) => status || "none"

const getReferralNameSegment = (fullName?: string) => {
  const [firstName] = (fullName || "").trim().split(/\s+/)
  const clean = (firstName || "AGENT").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  return clean || "AGENT"
}

const generateReferralCodeCandidate = (fullName?: string) => {
  const digits = Math.floor(1000 + Math.random() * 9000)
  return `CASA-${getReferralNameSegment(fullName)}-${digits}`
}

export default function ProfilePage() {

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = getSafeRedirectPath(searchParams.get("redirect"))
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [fullNameInput, setFullNameInput] = useState("")
  const [businessNameInput, setBusinessNameInput] = useState("")
  const [phoneNumberInput, setPhoneNumberInput] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [propertyListingsCount, setPropertyListingsCount] = useState<number>(0)
  const [marketItemsCount, setMarketItemsCount] = useState<number>(0)
  const [savedListings, setSavedListings] = useState<SavedListing[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setUser(user)

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      let nextProfile = data

      if (data?.agent_status === "approved" && !data?.referral_code) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const referralCode = generateReferralCodeCandidate(data?.full_name)
          const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("referral_code", referralCode)
            .maybeSingle()

          if (existing) continue

          const { data: updatedProfile, error: referralError } = await supabase
            .from("profiles")
            .update({ referral_code: referralCode })
            .eq("id", user.id)
            .select("*")
            .single()

          if (!referralError && updatedProfile) {
            nextProfile = updatedProfile
          }
          break
        }
      }

      setProfile(nextProfile)
      setFullNameInput(data?.full_name || "")
      setBusinessNameInput(data?.business_name || "")
      setPhoneNumberInput(data?.phone || "")

      const savedPromise = supabase
        .from("saved_listings")
        .select("id, property_id, properties(*)")
        .eq("user_id", user.id)

      if (nextProfile?.agent_status === "approved") {
        const [{ count: propertiesCount }, { count: marketCount }, { data: savedData, error: savedError }] = await Promise.all([
          supabase
            .from("properties")
            .select("*", { count: "exact", head: true })
            .or(`owner_id.eq.${user.id},agent_id.eq.${user.id}`),
          supabase
            .from("market_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          savedPromise,
        ])

        setPropertyListingsCount(propertiesCount || 0)
        setMarketItemsCount(marketCount || 0)

        if (!savedError) {
          setSavedListings(structureSavedListings(savedData || []))
        }
      } else {
        const { data: savedData, error: savedError } = await savedPromise
        if (!savedError) {
          setSavedListings(structureSavedListings(savedData || []))
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [router])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const structureSavedListings = (items: Array<{
    id: string
    property_id: string
    properties: SavedListing["property"] | SavedListing["property"][]
  }>) => items.map((item) => ({
    savedId: item.id,
    propertyId: item.property_id,
    property: Array.isArray(item.properties)
      ? item.properties[0] || null
      : item.properties,
  }))

  if (loading) {
    return <ProfilePageSkeleton />
  }

  const agentStatus = normalizeStatus(profile?.agent_status)
  const role = agentStatus === "none" ? "User" : "Agent"
  const isApprovedAgent = agentStatus === "approved"
  const email = getProfileEmail(profile, user)
  const profileActionText = !profile?.full_name || !profile?.phone || !email ? "Complete Profile" : "Edit Profile"
  const isProfileIncomplete = !profile?.full_name || !profile?.phone || !email
  const userDisplayName =
    `${user?.user_metadata?.first_name || ""} ${user?.user_metadata?.last_name || ""}`.trim() || "User"
  const publicDisplayName = isApprovedAgent
    ? getAgentDisplayName(profile)
    : profile?.full_name || userDisplayName
  const referralLink = profile?.referral_code && typeof window !== "undefined"
    ? `${window.location.origin}/agent-referral?code=${encodeURIComponent(profile.referral_code)}`
    : ""

  const getStatusBadgeClass = () => {
    if (agentStatus === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700"
    if (agentStatus === "suspended") return "border-amber-200 bg-amber-50 text-amber-700"
    if (agentStatus === "banned" || agentStatus === "rejected") return "border-red-200 bg-red-50 text-red-700"
    if (agentStatus === "pending") return "border-blue-200 bg-blue-50 text-blue-700"
    return "border-slate-200 bg-slate-100 text-slate-700"
  }

  const getStatusMessage = () => {
    if (agentStatus === "pending") return "Your application is under review"
    if (agentStatus === "approved") return "Your account is active."
    if (agentStatus === "rejected") return "Your application was rejected"
    if (agentStatus === "banned") return "Your account has been banned by admin."
    if (agentStatus === "suspended") return "Your account is temporarily suspended."
    return ""
  }

  const shouldShowVerification = agentStatus !== "none"

  const getVerificationContent = () => {
    if (profile?.verification_status === "verified") {
      return {
        title: "Verified Agent",
        description: "Identity confirmed by CASA",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
        badgeClassName: "border-emerald-200 bg-white text-emerald-700",
      }
    }

    if (profile?.verification_status === "rejected") {
      return {
        title: "Verification rejected",
        description: "Please contact CASA support or update your verification details.",
        className: "border-red-200 bg-red-50 text-red-800",
        badgeClassName: "border-red-200 bg-white text-red-700",
      }
    }

    return {
      title: "Verification pending",
      description: "Your verification is under review.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      badgeClassName: "border-amber-200 bg-white text-amber-700",
    }
  }

  const verification = getVerificationContent()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) return

    setUploading(true)

    try {
      const timestamp = Date.now()
      const fileName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, "_")
      const filePath = `avatars/${user.id}/${timestamp}-${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

      const publicUrl = data.publicUrl

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setProfile({ ...profile, avatar_url: publicUrl })
      setSelectedFile(null)
      setPreviewUrl(null)

      alert("Profile photo updated")

    } catch (error: unknown) {
      console.error("Upload error:", error)
      alert("Failed to upload photo: " + (error instanceof Error ? error.message : "Unknown error"))
    }

    setUploading(false)
  }

  const startEditingProfile = () => {
    setFullNameInput(profile?.full_name || "")
    setBusinessNameInput(profile?.business_name || "")
    setPhoneNumberInput(profile?.phone || "")
    setIsEditing(true)
  }

  const cancelEditingProfile = () => {
    setFullNameInput(profile?.full_name || "")
    setBusinessNameInput(profile?.business_name || "")
    setPhoneNumberInput(profile?.phone || "")
    setIsEditing(false)
  }

  const saveProfile = async () => {
    setSavingProfile(true)

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      alert("You must be logged in to update your profile")
      setSavingProfile(false)
      return
    }

    const full_name = fullNameInput.trim()
    const business_name = businessNameInput.trim()
    const phone = phoneNumberInput.trim()
    const email = getProfileEmail(profile, currentUser)

    if (!full_name || !phone || !email) {
      alert("Please provide your full name, phone number, and email.")
      setSavingProfile(false)
      return
    }

    const updates: {
      full_name: string
      phone: string
      email: string
      business_name?: string | null
    } = {
      full_name,
      phone,
      email,
    }

    if (isApprovedAgent) {
      updates.business_name = business_name || null
    }

    let businessNameSaved = isApprovedAgent
    let { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", currentUser.id)

    if (error && isApprovedAgent && error.message?.toLowerCase().includes("business_name")) {
      const fallbackUpdate = await supabase
        .from("profiles")
        .update({
          full_name,
          phone,
          email,
        })
        .eq("id", currentUser.id)

      error = fallbackUpdate.error
      businessNameSaved = false
    }

    if (error) {
      alert("Failed to update profile: " + error.message)
      setSavingProfile(false)
      return
    }

    setProfile((prev) => ({
      ...prev,
      full_name,
      ...(businessNameSaved ? { business_name: business_name || null } : {}),
      phone,
      email,
    }))
    setIsEditing(false)
    setSavingProfile(false)
    alert("Profile updated successfully")
    if (redirect !== "/") router.push(redirect)
  }

  const copyText = async (value: string, label: string) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      alert(`${label} copied`)
    } catch {
      alert(`Copy failed. ${label}: ${value}`)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-24 w-24">
                  <Avatar
                    avatarUrl={previewUrl || profile?.avatar_url}
                    businessName={profile?.business_name}
                    fullName={profile?.full_name || userDisplayName}
                    email={email}
                    alt={`${publicDisplayName} avatar`}
                    size={96}
                    className="border-white shadow-sm"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {publicDisplayName || "Complete your profile"}
                    </h1>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass()}`}>
                      {role}
                    </span>
                    {shouldShowVerification && (
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${verification.badgeClassName}`}>
                        {verification.title}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{email || "Email not provided"}</p>
                  {isApprovedAgent && profile?.full_name && (
                    <p className="mt-1 text-sm text-slate-500">Account holder: {profile.full_name}</p>
                  )}
                  {profile?.phone && <p className="mt-1 text-sm text-slate-500">{profile.phone}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  onClick={startEditingProfile}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  {profileActionText}
                </button>
              </div>
            </div>
          </div>
        </section>

        {isProfileIncomplete && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
            <p className="font-semibold">Complete your profile to continue using CASA.</p>
            <p className="mt-1 text-sm">Full name, phone number, and email are required.</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Profile Photo</h2>
              <p className="mt-1 text-sm text-slate-500">Keep your account identity current.</p>
              <div className="mt-5 flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {profile?.avatar_url ? "Change Photo" : "Upload Photo"}
                </label>
                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? "Uploading..." : "Save Photo"}
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Account Status</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                  <span className="text-sm text-slate-500">Role</span>
                  <span className="font-semibold">{role}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                  <span className="text-sm text-slate-500">Agent status</span>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass()}`}>
                    {agentStatus}
                  </span>
                </div>
              </div>
              {getStatusMessage() && (
                <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">{getStatusMessage()}</p>
              )}
            </section>

            {shouldShowVerification && (
              <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${verification.className}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{verification.title}</h2>
                    <p className="mt-1 text-sm">{verification.description}</p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${verification.badgeClassName}`}>
                    {profile?.verification_status || "pending"}
                  </span>
                </div>
              </section>
            )}

            {isApprovedAgent && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold">Listings</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Properties Listed</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{propertyListingsCount}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Market Items Listed</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{marketItemsCount}</p>
                  </div>
                </div>

                {propertyListingsCount === 0 && marketItemsCount === 0 && (
                  <p className="mt-4 text-sm text-slate-500">You have no listings yet.</p>
                )}
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  View My Listings
                </button>
              </section>
            )}

            {isApprovedAgent && profile?.referral_code && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold">Invite an Agent</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Share this link with trusted agents you want to bring onto CASA.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mt-2 break-all text-sm font-semibold text-slate-800">{referralLink}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(referralLink, "Referral link")}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Copy Referral Link
                  </button>
                </div>
              </section>
            )}
          </aside>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Profile Details</h2>
                  <p className="mt-1 text-sm text-slate-500">Your public and contact information.</p>
                </div>
                {!isEditing && (
                  <button
                    onClick={startEditingProfile}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {profileActionText}
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Full name</span>
                    <input
                      type="text"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="Enter full name"
                    />
                  </label>
                  {isApprovedAgent && (
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Public business name</span>
                      <input
                        type="text"
                        value={businessNameInput}
                        onChange={(e) => setBusinessNameInput(e.target.value)}
                        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        placeholder="Enter public business name"
                      />
                      <span className="mt-2 block text-xs text-slate-500">
                        This is the name users will see on CASA.
                      </span>
                    </label>
                  )}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Email</span>
                    <input
                      type="email"
                      value={email || ""}
                      readOnly
                      className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Phone number</span>
                    <input
                      type="text"
                      value={phoneNumberInput}
                      onChange={(e) => setPhoneNumberInput(e.target.value)}
                      className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="Enter phone number"
                    />
                  </label>
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProfile ? "Saving..." : "Save Profile"}
                    </button>
                    <button
                      onClick={cancelEditingProfile}
                      disabled={savingProfile}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ...(isApprovedAgent
                      ? [
                          ["Account holder", profile?.full_name || "Not provided"],
                          ["Public business name", profile?.business_name || "Not provided"],
                        ]
                      : [["Full name", profile?.full_name || "Not provided"]]),
                    ["Email", email || "Not provided"],
                    ["Phone", profile?.phone || "Not provided"],
                    ["Role", role],
                    ["Account status", agentStatus],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                      <p className="mt-2 break-words font-semibold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Saved Listings</h2>
                  <p className="mt-1 text-sm text-slate-500">Properties you saved for later.</p>
                </div>
                <Link href="/saved-listings" className="text-sm font-semibold text-emerald-700 hover:underline">
                  View all
                </Link>
              </div>

              {savedListings.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No saved listings yet.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {savedListings.slice(0, 4).map((item) => {
                    if (!item.property) return null
                    return (
                      <Link
                        key={item.savedId}
                        href={`/property/${item.propertyId}`}
                        className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition md:hover:-translate-y-1 md:hover:shadow-lg"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                          <PropertyThumbnail
                            image={item.property.image}
                            images={item.property.images}
                            alt={item.property.title || "Saved listing"}
                            imageClassName="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="line-clamp-2 font-bold text-slate-950">{item.property.title || "Untitled listing"}</h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">{item.property.location || "Location not provided"}</p>
                          <p className="mt-3 text-lg font-bold text-slate-950">{formatPrice(item.property.price)}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
