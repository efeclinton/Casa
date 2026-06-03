"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../../lib/supabaseClient"
import { getProfileEmail, getProfilePhone } from "../../lib/profileCompletion"

type ReferrerProfile = {
  id: string
  full_name?: string | null
  email?: string | null
  referral_code?: string | null
}

type CurrentProfile = {
  id: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  agent_status?: string | null
}

type PendingApplication = {
  id: string
  status?: string | null
}

export default function AgentReferralPage() {
  const searchParams = useSearchParams()
  const code = (searchParams.get("code") || "").trim().toUpperCase()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<CurrentProfile | null>(null)
  const [referrer, setReferrer] = useState<ReferrerProfile | null>(null)
  const [pendingApplication, setPendingApplication] = useState<PendingApplication | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    business_name: "",
    years_experience: "",
    operating_city: "",
  })

  const redirectPath = `/agent-referral?code=${encodeURIComponent(code)}`

  useEffect(() => {
    const loadReferral = async () => {
      if (!code) {
        setErrorMessage("Invalid referral link.")
        setLoading(false)
        return
      }

      const { data: referrerData, error: referrerError } = await supabase
        .from("profiles")
        .select("id, full_name, email, referral_code")
        .eq("referral_code", code)
        .maybeSingle()

      if (referrerError || !referrerData) {
        setErrorMessage("This referral link is invalid or expired.")
        setLoading(false)
        return
      }

      setReferrer(referrerData)

      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const [{ data: profileData }, { data: applicationData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, email, phone, agent_status")
            .eq("id", user.id)
            .single(),
          supabase
            .from("agent_applications")
            .select("id, status")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .maybeSingle(),
        ])

        setProfile(profileData)
        setPendingApplication(applicationData)
        setForm((prev) => ({
          ...prev,
          full_name: profileData?.full_name || prev.full_name,
          phone: getProfilePhone(profileData) || prev.phone,
        }))
      }

      setLoading(false)
    }

    void loadReferral()
  }, [code])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !referrer || submitting) return

    const fullName = form.full_name.trim()
    const phone = form.phone.trim()
    const businessName = form.business_name.trim()
    const yearsExperience = form.years_experience.trim()
    const operatingCity = form.operating_city.trim()
    const email = getProfileEmail(profile, user) || user.email || ""

    if (!fullName || !phone || !businessName || !yearsExperience || !operatingCity) {
      alert("Please fill in all required fields.")
      return
    }

    setSubmitting(true)

    const { error } = await supabase
      .from("agent_applications")
      .insert({
        user_id: user.id,
        full_name: fullName,
        phone,
        email,
        business_name: businessName,
        years_experience: yearsExperience,
        operating_city: operatingCity,
        status: "pending",
        referred_by: referrer.id,
        referral_code: code,
        referral_source: "agent_referral",
      })

    if (error) {
      alert(error.message || "Failed to submit application")
      setSubmitting(false)
      return
    }

    await supabase
      .from("profiles")
      .update({ agent_status: "pending" })
      .eq("id", user.id)

    setPendingApplication({ id: "submitted", status: "pending" })
    setSubmitting(false)
    alert("Application submitted successfully")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
          Checking referral...
        </div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">CASA Referral</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{errorMessage}</h1>
          <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-emerald-700">
            Back to Home
          </Link>
        </section>
      </main>
    )
  }

  const referrerName = referrer?.full_name || "a verified CASA agent"

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">CASA Agent Referral</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              You&apos;ve been invited to become a CASA agent by {referrerName}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Complete a short application so CASA can review your agent access.
            </p>
          </div>
        </header>

        {!user ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Sign in to continue</h2>
            <p className="mt-2 text-sm text-slate-500">Your referral code will stay attached after login or signup.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-emerald-700">
                Login
              </Link>
              <Link href={`/signup?redirect=${encodeURIComponent(redirectPath)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sign up
              </Link>
            </div>
          </section>
        ) : profile?.agent_status === "approved" ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">You are already an approved CASA agent.</h2>
          </section>
        ) : pendingApplication ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold">Application under review</h2>
            <p className="mt-2 text-sm">You already have a pending agent application.</p>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold tracking-tight">Referral Application</h2>
            <p className="mt-2 text-sm text-slate-500">Referral code: <span className="font-semibold text-slate-900">{code}</span></p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Full name</span>
                  <input name="full_name" value={form.full_name} onChange={handleChange} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Phone</span>
                  <input name="phone" value={form.phone} onChange={handleChange} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Business name</span>
                  <input name="business_name" value={form.business_name} onChange={handleChange} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Years experience</span>
                  <input name="years_experience" value={form.years_experience} onChange={handleChange} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Operating city</span>
                  <input name="operating_city" value={form.operating_city} onChange={handleChange} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" required />
                </label>
              </div>

              <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}
