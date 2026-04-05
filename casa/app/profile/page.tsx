"use client"

import { useState, useEffect } from "react"
import { supabase, getOptimizedAvatarUrl } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ProfilePage() {

  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
      <main className="max-w-2xl mx-auto p-10">
        <div className="text-center">Loading...</div>
      </main>
    )
  }

  const role = profile?.agent_status === "none" ? "User" : "Agent"

  const getStatusMessage = () => {
    if (profile?.agent_status === "pending") return "Your application is under review"
    if (profile?.agent_status === "approved") return "You are now an approved agent"
    if (profile?.agent_status === "rejected") return "Your application was rejected"
    return ""
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

    } catch (error: any) {
      console.error('Upload error:', error)
      alert('Failed to upload photo: ' + error.message)
    }

    setUploading(false)
  }

  return (
    <main className="max-w-2xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <section className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Profile Info</h2>
        <div className="flex items-start space-x-6 mb-4">
          <div className="flex flex-col items-center space-y-2">
            {(previewUrl || profile?.avatar_url) ? (
              <div className="relative w-24 h-24">
                <Image
                  src={previewUrl || getOptimizedAvatarUrl(profile?.avatar_url, user?.user_metadata?.first_name + ' ' + user?.user_metadata?.last_name)}
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
            <p><strong>Full Name:</strong> {profile?.full_name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Phone Number:</strong> {profile?.phone}</p>
          </div>
        </div>
      </section>

      <section className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Account Status</h2>
        <div className="space-y-2">
          <p><strong>Role:</strong> {role}</p>
          <p><strong>Agent Status:</strong> {profile?.agent_status}</p>
        </div>

        {role === "User" && (
          <a
            href="/become-agent"
            className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Apply to become an agent
          </a>
        )}

        {getStatusMessage() && (
          <p className="mt-4 text-lg text-gray-700">{getStatusMessage()}</p>
        )}
      </section>

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