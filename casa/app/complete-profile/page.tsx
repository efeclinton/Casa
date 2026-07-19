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
import { FormPageSkeleton } from "../../components/LoadingSkeletons"
import Link from "next/link"

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
  const [loadError, setLoadError] = useState("")
  const [retryAttempt, setRetryAttempt] = useState(0)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!currentUser) {
          router.replace(`/login?redirect=${encodeURIComponent(`/complete-profile?redirect=${encodeURIComponent(redirect)}`)}`)
          return
        }

        const profile = await loadCurrentProfile(currentUser)

        if (active) {
          setUser(currentUser)
          setFullName(profile.full_name || "")
          setPhone(getProfilePhone(profile))
          setEmail(getProfileEmail(profile, currentUser))
          setLoading(false)
        }
      } catch (error) {
        console.error("Complete profile loading failed", {
          code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined,
          message: error instanceof Error ? error.message : "Unknown error",
        })
        if (active) {
          setUser(null)
          setLoadError("Unable to load your profile. Please try again.")
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [redirect, retryAttempt, router])

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

    const { data: savedProfile, error } = await supabase
      .from("profiles")
      .update({
        full_name: nextFullName,
        phone: nextPhone,
        email: nextEmail,
      })
      .eq("id", user.id)
      .select("id, full_name, email, phone")
      .single()

    setSaving(false)

    if (error || !savedProfile) {
      console.error("Complete profile save failed", {
        code: error?.code,
        message: error?.message || "No profile row was returned",
      })
      alert(error ? `Failed to save profile: ${error.message}` : "The profile could not be saved. Please try again.")
      return
    }

    if (
      savedProfile.id !== user.id ||
      savedProfile.full_name !== nextFullName ||
      savedProfile.phone !== nextPhone ||
      savedProfile.email !== nextEmail
    ) {
      alert("The saved profile could not be confirmed. Please try again.")
      return
    }

    router.replace(redirect)
  }

  if (loading) {
    return <FormPageSkeleton maxWidth="max-w-md" />
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-3xl font-bold">Complete Profile</h1>
        <p className="mt-3 text-sm text-red-700" role="alert">{loadError}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setLoadError("")
              setLoading(true)
              setRetryAttempt((attempt) => attempt + 1)
            }}
            className="rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white"
          >
            Retry
          </button>
          <Link href="/login" className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700">
            Return to login
          </Link>
        </div>
      </main>
    )
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
