"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import {
  getProfileEmail,
  getProfilePhone,
  getSafeRedirectPath,
  loadCurrentProfile,
} from "../../lib/profileCompletion"
import type { User } from "@supabase/supabase-js"

export default function CompleteProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = getSafeRedirectPath(searchParams.get("redirect") || "/dashboard")

  const [user, setUser] = useState<User | null>(null)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) {
        router.replace(`/login?redirect=${encodeURIComponent(`/complete-profile?redirect=${encodeURIComponent(redirect)}`)}`)
        return
      }

      const profile = await loadCurrentProfile(currentUser)

      setUser(currentUser)
      setFullName(profile.full_name || "")
      setPhone(getProfilePhone(profile))
      setEmail(getProfileEmail(profile, currentUser))
      setLoading(false)
    }

    void load()
  }, [redirect, router])

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || saving) return

    const nextFullName = fullName.trim()
    const nextPhone = phone.trim()
    const nextEmail = (email || user.email || "").trim()

    if (!nextFullName || !nextPhone || !nextEmail) {
      alert("Please provide your full name, phone number, and email.")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nextFullName,
        phone: nextPhone,
        email: nextEmail,
      })
      .eq("id", user.id)

    setSaving(false)

    if (error) {
      alert("Failed to save profile: " + error.message)
      return
    }

    router.replace(redirect)
  }

  if (loading) {
    return <main className="max-w-md mx-auto px-4 py-10">Loading profile...</main>
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Complete Profile</h1>
      <p className="text-gray-600 mb-6">
        Complete your profile to continue using CASA.
      </p>

      <form onSubmit={saveProfile} className="space-y-4 bg-white rounded-xl shadow p-5">
        <div>
          <label className="block text-sm font-semibold mb-1">Full name</label>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full border p-3 rounded-lg"
            placeholder="Enter your full name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Phone number</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full border p-3 rounded-lg"
            placeholder="Enter your phone number"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Email</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="w-full border p-3 rounded-lg bg-gray-50"
            placeholder="Email"
            required
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save and Continue"}
        </button>
      </form>
    </main>
  )
}
