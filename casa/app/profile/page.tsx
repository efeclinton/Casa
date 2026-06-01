"use client"

import { useState, useEffect } from "react"
import { supabase, getOptimizedAvatarUrl } from "../../lib/supabaseClient"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import { getProfileEmail, getSafeRedirectPath } from "../../lib/profileCompletion"

type Profile = {
  id?: string
  full_name?: string
  email?: string
  phone?: string
  avatar_url?: string
  agent_status?: string
  verification_status?: string
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
  const [phoneNumberInput, setPhoneNumberInput] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [listingsCount, setListingsCount] = useState<number>(0)

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

      setProfile(data)
      setFullNameInput(data?.full_name || "")
      setPhoneNumberInput(data?.phone || "")

      // Fetch listings count if user is an agent
      if (data?.agent_status !== "none") {
        const { count } = await supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id)

        setListingsCount(count || 0)
      }

      setLoading(false)
    }

    fetchData()
  }, [router])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6 sm:p-10">
        <div className="text-center">Loading...</div>
      </main>
    )
  }

  const role = profile?.agent_status === "none" ? "User" : "Agent"

  const getStatusBadgeClass = () => {
    if (profile?.agent_status === "approved") return "bg-green-100 text-green-700"
    if (profile?.agent_status === "suspended") return "bg-yellow-100 text-yellow-700"
    if (profile?.agent_status === "banned") return "bg-red-100 text-red-700"
    return "bg-gray-100 text-gray-700"
  }

  const getStatusMessage = () => {
    if (profile?.agent_status === "pending") return "Your application is under review"
    if (profile?.agent_status === "approved") return "Your account is active."
    if (profile?.agent_status === "rejected") return "Your application was rejected"
    if (profile?.agent_status === "banned") return "Your account has been banned by admin."
    if (profile?.agent_status === "suspended") return "Your account is temporarily suspended."
    return ""
  }

  const shouldShowVerification =
    profile?.agent_status && profile.agent_status !== "none"

  const getVerificationContent = () => {
    if (profile?.verification_status === "verified") {
      return {
        title: "Verified Agent",
        description: "Identity confirmed by CASA",
        className: "border-blue-200 bg-blue-50 text-blue-800",
      }
    }

    if (profile?.verification_status === "rejected") {
      return {
        title: "Verification rejected",
        description: "Please contact CASA support or update your verification details.",
        className: "border-red-200 bg-red-50 text-red-800",
      }
    }

    return {
      title: "Verification pending",
      description: "Your verification is under review.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    }
  }

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
      const fileName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const filePath = `avatars/${user.id}/${timestamp}-${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = data.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl })
      setSelectedFile(null)
      setPreviewUrl(null)

      alert("Profile photo updated")

    } catch (error: unknown) {
      console.error('Upload error:', error)
      alert('Failed to upload photo: ' + (error instanceof Error ? error.message : "Unknown error"))
    }

    setUploading(false)
  }

  const startEditingProfile = () => {
    setFullNameInput(profile?.full_name || "")
    setPhoneNumberInput(profile?.phone || "")
    setIsEditing(true)
  }

  const cancelEditingProfile = () => {
    setFullNameInput(profile?.full_name || "")
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
    const phone = phoneNumberInput.trim()
    const email = getProfileEmail(profile, currentUser)

    if (!full_name || !phone || !email) {
      alert("Please provide your full name, phone number, and email.")
      setSavingProfile(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name,
        phone,
        email,
      })
      .eq("id", currentUser.id)

    if (error) {
      alert("Failed to update profile: " + error.message)
      setSavingProfile(false)
      return
    }

    setProfile((prev) => ({
      ...prev,
      full_name,
      phone,
      email,
    }))
    setIsEditing(false)
    setSavingProfile(false)
    alert("Profile updated successfully")
    if (redirect !== "/") router.push(redirect)
  }

  const isProfileIncomplete = !profile?.full_name || !profile?.phone || !getProfileEmail(profile, user)
  const profileActionText = isProfileIncomplete ? "Complete Profile" : "Edit Profile"
  const userDisplayName =
    `${user?.user_metadata?.first_name || ""} ${user?.user_metadata?.last_name || ""}`.trim() || "User"

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:p-10">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      {isProfileIncomplete && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-semibold">Complete your profile to continue using CASA.</p>
          <p className="mt-1 text-sm">Full name, phone number, and email are required.</p>
        </div>
      )}

      <section className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Profile Info</h2>
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-4">
          <div className="flex flex-col items-center space-y-2">
            {(previewUrl || profile?.avatar_url) ? (
              <div className="relative w-24 h-24">
                <Image
                  src={previewUrl || getOptimizedAvatarUrl(profile?.avatar_url || null, userDisplayName)}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="rounded-full object-cover border-2 border-gray-300"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNFNUU3RUIiLz4KPHN2ZyB4PSIzNiIgeT0iMzYiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0E0QUYiIHN0cm9rZS13aWR0aD0iMS41Ij4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0QzE0IDUuMSAxMy4xIDYgMTIgNkMxMC45IDYgMTAgNS4xIDEwIDRDMTAgMi45IDEwLjkgMiAxMiAyWk0xMiAxNEM5LjggMTQgOCA5LjggOCA3QzggNS4yIDkuMiA0IDEyIDRDMTQuOCA0IDE2IDUuMiAxNiA3QzE2IDkuOCAxNC44IDE0IDEyIDE0WiIvPgo8L3N2Zz4KPC9zdmc+"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center border-2 border-gray-300">
                <span className="text-gray-600 text-3xl">👤</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer text-sm"
            >
              {profile?.avatar_url ? "Change Photo" : "Upload Photo"}
            </label>
            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
              >
                {uploading ? "Uploading..." : "Save Photo"}
              </button>
            )}
          </div>
          <div className="flex-1 space-y-2">
            {isEditing ? (
              <>
                <div>
                  <strong>Full Name:</strong>
                  <input
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    className="mt-1 w-full border rounded px-3 py-2"
                    placeholder="Enter full name"
                  />
                </div>
                <p><strong>Email:</strong> {getProfileEmail(profile, user)}</p>
                <div>
                  <strong>Phone Number:</strong>
                  <input
                    type="text"
                    value={phoneNumberInput}
                    onChange={(e) => setPhoneNumberInput(e.target.value)}
                    className="mt-1 w-full border rounded px-3 py-2"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {savingProfile ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEditingProfile}
                    disabled={savingProfile}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p><strong>Full Name:</strong> {profile?.full_name || "Not provided"}</p>
                <p><strong>Email:</strong> {getProfileEmail(profile, user) || "Not provided"}</p>
                <p><strong>Phone Number:</strong> {profile?.phone || "Not provided"}</p>
                <button
                  onClick={startEditingProfile}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {profileActionText}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Account Status</h2>
        <div className="space-y-2">
          <p><strong>Role:</strong> {role}</p>
          <p>
            <strong>Agent Status:</strong>{" "}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadgeClass()}`}>
              {profile?.agent_status}
            </span>
          </p>
        </div>

        {role === "User" && (
          <Link
            href="/become-agent"
            className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Apply to become an agent
          </Link>
        )}

        {getStatusMessage() && (
          <p className="mt-4 text-lg text-gray-700">{getStatusMessage()}</p>
        )}
      </section>

      {shouldShowVerification && (
        <section className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Verification</h2>
          {(() => {
            const verification = getVerificationContent()

            return (
              <div className={`rounded-xl border p-4 ${verification.className}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{verification.title}</p>
                    <p className="mt-1 text-sm">{verification.description}</p>
                  </div>
                  {profile?.verification_status === "verified" && (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.57a1 1 0 0 1-1.42.003L3.29 9.72a1 1 0 1 1 1.42-1.406l3.79 3.836 6.79-6.854a1 1 0 0 1 1.414-.006Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verified Agent
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
        </section>
      )}

      {role === "Agent" && (
        <section className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">My Listings</h2>
          <div className="space-y-4">
            <p className="text-lg">
              You have <span className="font-bold text-xl">{listingsCount}</span> {listingsCount === 1 ? 'listing' : 'listings'}
            </p>
            {listingsCount === 0 && (
              <p className="text-gray-600">You have no listings yet</p>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              View My Listings
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
