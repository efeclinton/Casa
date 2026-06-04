"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"
import { getAgentDisplayName } from "../../lib/agentDisplay"

type VerificationStatus = "pending" | "verified" | "rejected"

type Property = {
  id: string
  title?: string
  location?: string
  price: number
  rent_period?: string
  listing_type?: string
  image?: string | null
  is_active?: boolean | null
  is_duplicate?: boolean | null
  agent_id?: string | null
  owner_id?: string | null
}

type AgentApplication = {
  id: string
  user_id: string
  full_name?: string
  email?: string
  phone?: string | null
  business_name?: string | null
  operating_city?: string | null
  years_experience?: string | null
  referral_code?: string | null
  referred_by?: string | null
  status?: string | null
  referrer?: {
    full_name?: string | null
    business_name?: string | null
    email?: string | null
  } | null
}

type RatingSummary = {
  agent_id: string
  avg_rating?: number
  review_count?: number
}

type Agent = {
  id: string
  full_name?: string | null
  business_name?: string | null
  email?: string | null
  phone?: string | null
  status?: string | null
  agent_status?: string | null
  verification_status?: VerificationStatus | null
  listing_count?: number
  contact_count?: number
  avgRating?: number
  reviewCount?: number
}

type UserProfile = {
  id: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
  status?: string | null
  agent_status?: string | null
  verification_status?: VerificationStatus | null
  last_login?: string | null
  last_sign_in_at?: string | null
  login_count?: number | null
}

type FlaggedListing = {
  property_id: string
  user_id?: string
  reason?: string
  properties?: {
    title?: string
    location?: string
  }
}

const fallbackImage =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80"

const verificationStyles: Record<VerificationStatus, string> = {
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
}

const statusClass = (status?: string | null) => {
  if (status === "active" || status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "suspended") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "banned" || status === "rejected") return "border-red-200 bg-red-50 text-red-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

const formatCurrency = (price?: number, period?: string) =>
  `₦${Math.round((price || 0) / 1000)}k${period ? ` / ${period}` : ""}`

const formatDate = (value?: string | null) => {
  if (!value) return "Not available"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.57a1 1 0 0 1-1.42.003L3.29 9.72a1 1 0 1 1 1.42-1.406l3.79 3.836 6.79-6.854a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

function VerificationBadge({ status }: { status?: VerificationStatus | null }) {
  const value = status || "pending"
  return (
    <Badge className={verificationStyles[value]}>
      {value === "verified" && <CheckIcon />}
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </Badge>
  )
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()

  const [query, setQuery] = useState("")
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([])
  const [normalUsers, setNormalUsers] = useState<UserProfile[]>([])
  const [userQuery, setUserQuery] = useState("")
  const [userFilter, setUserFilter] = useState<"all" | "active" | "missing" | "pending" | "approved" | "rejected">("all")
  const [properties, setProperties] = useState<Property[]>([])
  const [applications, setApplications] = useState<AgentApplication[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [agentListings, setAgentListings] = useState<Property[]>([])
  const [agentQuery, setAgentQuery] = useState("")
  const [minRating, setMinRating] = useState(0)
  const [verificationFilter, setVerificationFilter] = useState<"all" | VerificationStatus>("all")
  const [flagged, setFlagged] = useState<FlaggedListing[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [verificationMap, setVerificationMap] = useState<Record<string, VerificationStatus>>({})
  const [confirmChange, setConfirmChange] = useState<{
    agent: Agent
    status: VerificationStatus
  } | null>(null)

  const loadApplications = async () => {
    const { data, error } = await supabase
      .from("agent_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      alert("Failed to load agent applications")
      return
    }

    const rows = data || []
    const referrerIds = Array.from(new Set(rows.map((app) => app.referred_by).filter(Boolean) as string[]))

    if (!referrerIds.length) {
      setApplications(rows)
      return
    }

    const { data: referrers } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, email")
      .in("id", referrerIds)

    const referrerMap = new Map((referrers || []).map((profile) => [profile.id, profile]))

    setApplications(rows.map((app) => ({
      ...app,
      referrer: app.referred_by ? referrerMap.get(app.referred_by) || null : null,
    })))
  }

  const approveAgent = async (app: AgentApplication) => {
    if (!app?.id || !app?.user_id) {
      alert("Invalid application data")
      return
    }

    const profileUpdate = {
      role: "agent",
      agent_status: "approved",
      business_name: app.business_name || null,
    }

    let { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", app.user_id)
      .select()

    if (profileError && profileError.message?.toLowerCase().includes("business_name")) {
      const fallbackUpdate = await supabase
        .from("profiles")
        .update({
          role: "agent",
          agent_status: "approved",
        })
        .eq("id", app.user_id)
        .select()

      profileData = fallbackUpdate.data
      profileError = fallbackUpdate.error
    }

    if (profileError || !profileData?.length) {
      alert("Failed to approve agent profile")
      return
    }

    await supabase.from("agent_applications").update({ status: "approved" }).eq("id", app.id)
    await supabase.from("properties").update({ agent_id: app.user_id }).eq("owner_id", app.user_id)

    alert("Agent approved")
    void loadApplications()
    void loadUserManagement()
    void loadAllAgents()
  }

  const rejectAgent = async (app: AgentApplication) => {
    if (!app?.id || !app?.user_id) {
      alert("Invalid application data")
      return
    }

    await supabase.from("profiles").update({ agent_status: "rejected" }).eq("id", app.user_id)
    await supabase.from("agent_applications").update({ status: "rejected" }).eq("id", app.id)

    alert("Agent rejected")
    void loadUserManagement()
    void loadApplications()
  }

  const applyCategoryFilter = (data: Property[], type: string) => {
    if (type === "all") return data
    return data.filter((property) => property.listing_type === type)
  }

  const refreshVerificationMap = async (listings: Property[]) => {
    const ids = Array.from(new Set(listings.map((item) => item.agent_id || item.owner_id).filter(Boolean) as string[]))
    if (!ids.length) {
      setVerificationMap({})
      return
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, verification_status")
      .in("id", ids)

    const nextMap = (data || []).reduce<Record<string, VerificationStatus>>((acc, profile: { id: string; verification_status?: VerificationStatus }) => {
      acc[profile.id] = profile.verification_status || "pending"
      return acc
    }, {})

    setVerificationMap(nextMap)
  }

  const loadAllListings = async (type = categoryFilter) => {
    setLoading(true)

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false, nullsFirst: false })

    if (error) {
      alert("Failed to load listings")
    } else {
      const filtered = applyCategoryFilter(data || [], type)
      setProperties(filtered)
      void refreshVerificationMap(filtered)
    }

    setLoading(false)
  }

  const hydrateAgents = async (agentRows: Agent[]) => {
    const agentIds = agentRows.map((agent) => agent.id)

    const [{ data: propertiesData }, { data: ratings }, { data: contacts }] = await Promise.all([
      supabase.from("properties").select("agent_id, owner_id"),
      supabase.from("agent_rating_summary").select("*"),
      supabase.from("agent_contacts").select("agent_id"),
    ])

    const listingCounts: Record<string, number> = {}
    ;(propertiesData || []).forEach((property: { agent_id?: string | null; owner_id?: string | null }) => {
      const id = property.agent_id || property.owner_id
      if (id && agentIds.includes(id)) listingCounts[id] = (listingCounts[id] || 0) + 1
    })

    const contactCounts: Record<string, number> = {}
    ;(contacts || []).forEach((contact: { agent_id?: string | null }) => {
      if (contact.agent_id) contactCounts[contact.agent_id] = (contactCounts[contact.agent_id] || 0) + 1
    })

    const ratingMap: Record<string, RatingSummary> = {}
    ;(ratings || []).forEach((rating: RatingSummary) => {
      ratingMap[rating.agent_id] = rating
    })

    return agentRows.map((agent) => {
      const rating = ratingMap[agent.id]
      return {
        ...agent,
        verification_status: agent.verification_status || "pending",
        listing_count: listingCounts[agent.id] || 0,
        contact_count: contactCounts[agent.id] || 0,
        avgRating: rating?.avg_rating || 0,
        reviewCount: rating?.review_count || 0,
      }
    })
  }

  const loadUserManagement = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true, nullsFirst: false })

    if (error) {
      alert("Failed to load users: " + error.message)
      return
    }

    const profiles = (data || []) as UserProfile[]
    setAllProfiles(profiles)
    setNormalUsers(profiles.filter((profile) => profile.role === "user"))
  }

  const loadAllAgents = async () => {
    setLoadingAgents(true)

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or("role.eq.agent,agent_status.eq.approved")

    if (error) {
      alert("Failed to load agents: " + error.message)
      setLoadingAgents(false)
      return
    }

    setAgents(await hydrateAgents(data || []))
    setLoadingAgents(false)
  }

  const loadFlagged = async () => {
    const { data, error } = await supabase
      .from("flagged_properties")
      .select("property_id, user_id, reason, properties(*)")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to load flagged properties:", error)
      setFlagged([])
      return
    }

    setFlagged((data || []).map((flag) => ({
      ...flag,
      properties: Array.isArray(flag.properties) ? flag.properties[0] : flag.properties,
    })))
  }

  const updateAgentStatus = async (agentId: string, status: string) => {
    const nextAgentStatus = status === "active" ? "approved" : status

    const { error } = await supabase
      .from("profiles")
      .update({ status, agent_status: nextAgentStatus })
      .eq("id", agentId)

    if (error) {
      alert("Failed to update status")
      return
    }

    if (status === "banned" || status === "suspended" || status === "active") {
      const message =
        status === "banned"
          ? "Your account has been banned by admin."
          : status === "suspended"
            ? "Your account has been suspended."
            : "Your account has been reactivated."

      const type = status === "banned" ? "ban" : status === "suspended" ? "suspension" : "activation"

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: agentId,
          title: "Account Status Update",
          message,
          type,
        })

      if (notificationError) console.error("Failed to create notification", notificationError)
    }

    alert(`Agent ${status}`)
    void loadUserManagement()
    void loadAllAgents()
  }

  const searchAgents = async () => {
    if (!agentQuery) {
      alert("Enter search term")
      return
    }

    setLoadingAgents(true)
    const term = agentQuery.toLowerCase()

    try {
      const [{ data: nameMatches }, { data: businessMatches }, { data: emailMatches }, { data: phoneMatches }] = await Promise.all([
        supabase.from("profiles").select("*").or("role.eq.agent,agent_status.eq.approved").ilike("full_name", `%${term}%`),
        supabase.from("profiles").select("*").or("role.eq.agent,agent_status.eq.approved").ilike("business_name", `%${term}%`),
        supabase.from("profiles").select("*").or("role.eq.agent,agent_status.eq.approved").ilike("email", `%${term}%`),
        supabase.from("profiles").select("*").or("role.eq.agent,agent_status.eq.approved").ilike("phone", `%${term}%`),
      ])

      const combined = [...(nameMatches || []), ...(businessMatches || []), ...(emailMatches || []), ...(phoneMatches || [])]
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values())
      setAgents(await hydrateAgents(unique))
    } catch (err: unknown) {
      alert("Agent search failed: " + (err instanceof Error ? err.message : "Unknown error"))
    }

    setLoadingAgents(false)
  }

  const loadAgentListings = async (agent: Agent) => {
    setSelectedAgent(agent)

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .or(`agent_id.eq.${agent.id},owner_id.eq.${agent.id}`)

    if (error) {
      alert("Failed to load agent listings")
      return
    }

    setAgentListings(data || [])
  }

  const updateVerificationStatus = async () => {
    if (!confirmChange) return

    const { agent, status } = confirmChange
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: status })
      .eq("id", agent.id)

    if (error) {
      alert("Failed to update verification status")
      return
    }

    setAgents((prev) => prev.map((item) => item.id === agent.id ? { ...item, verification_status: status } : item))
    if (selectedAgent?.id === agent.id) setSelectedAgent({ ...selectedAgent, verification_status: status })
    setVerificationMap((prev) => ({ ...prev, [agent.id]: status }))
    void loadUserManagement()
    setConfirmChange(null)
  }

  const searchListings = async () => {
    if (!query) {
      alert("Enter search terms")
      return
    }

    setLoading(true)

    const terms = query.split(/[\s,]+/)
    let priceTerm: number | null = null
    const textTerms: string[] = []

    terms.forEach((term) => {
      const clean = term.toLowerCase()
      if (clean.includes("k")) {
        const num = parseInt(clean.replace("k", ""))
        if (!Number.isNaN(num)) {
          priceTerm = num * 1000
          return
        }
      }

      if (!Number.isNaN(Number(clean))) {
        priceTerm = Number(clean)
        return
      }

      textTerms.push(clean)
    })

    let queryBuilder = supabase.from("properties").select("*")

    if (textTerms.length > 0) {
      const orConditions = textTerms.map((term) =>
        `owner_name.ilike.%${term}%,location.ilike.%${term}%,owner_phone.ilike.%${term}%,owner_email.ilike.%${term}%`
      ).join(",")
      queryBuilder = queryBuilder.or(orConditions)
    }

    if (priceTerm) queryBuilder = queryBuilder.lte("price", priceTerm)

    const { data, error } = await queryBuilder

    if (error) {
      alert("Search failed")
    } else {
      const filtered = applyCategoryFilter(data || [], categoryFilter)
      setProperties(filtered)
      void refreshVerificationMap(filtered)
    }

    setLoading(false)
  }

  const deleteListing = async (property: Property) => {
    if (!confirm("Delete this listing?")) return

    await supabase.from("properties").delete().eq("id", property.id)
    setProperties((prev) => prev.filter((item) => item.id !== property.id))
  }

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "admin") {
        router.push("/")
        return
      }

      setCheckingAdmin(false)
      void loadUserManagement()
      void loadApplications()
      void loadAllListings("all")
      void loadAllAgents()
      void loadFlagged()
    }

    void checkAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const avg = agent.avgRating || 0
      const matchesRating = avg >= minRating
      const matchesVerification =
        verificationFilter === "all" || (agent.verification_status || "pending") === verificationFilter
      return matchesRating && matchesVerification
    })
  }, [agents, minRating, verificationFilter])

  const filteredUsers = useMemo(() => {
    const term = userQuery.trim().toLowerCase()

    return normalUsers.filter((user) => {
      const missingProfile = !user.full_name
      const matchesQuery =
        !term ||
        (user.full_name || "").toLowerCase().includes(term) ||
        (user.email || "").toLowerCase().includes(term) ||
        (user.phone || "").toLowerCase().includes(term)
      const matchesFilter =
        userFilter === "all" ||
        (userFilter === "active" && user.status === "active") ||
        (userFilter === "missing" && missingProfile) ||
        (userFilter === "pending" && user.agent_status === "pending") ||
        (userFilter === "approved" && user.agent_status === "approved") ||
        (userFilter === "rejected" && user.agent_status === "rejected")

      return matchesQuery && matchesFilter
    })
  }, [normalUsers, userFilter, userQuery])

  const metrics = [
    { label: "Total Users", value: allProfiles.length },
    { label: "Normal Users", value: allProfiles.filter((profile) => profile.role === "user").length },
    { label: "Agents", value: allProfiles.filter((profile) => profile.role === "agent" || profile.agent_status === "approved").length },
    { label: "Admins", value: allProfiles.filter((profile) => profile.role === "admin").length },
    { label: "Active Users", value: allProfiles.filter((profile) => profile.status === "active" || profile.agent_status === "approved").length },
    { label: "Pending Verification", value: allProfiles.filter((profile) => (profile.verification_status || "pending") === "pending").length },
  ]

  if (checkingAdmin) {
    return <p className="min-h-screen bg-slate-50 p-10 text-slate-700">Checking admin access...</p>
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">CASA Admin</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Admin Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Manage agents, listings, reports, and trust signals across the CASA marketplace.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-bold">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
            <SectionHeader title="Agent Applications" description="Review new agent requests without leaving the dashboard." />
            {applications.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No pending applications.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {applications.map((app) => (
                  <div key={app.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{app.business_name || app.full_name || "Unnamed applicant"}</p>
                      <Badge className={statusClass(app.status || "pending")}>{app.status || "pending"}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p><span className="font-semibold text-slate-900">Full name:</span> {app.full_name || "Not provided"}</p>
                      <p><span className="font-semibold text-slate-900">Business name:</span> {app.business_name || "Not provided"}</p>
                      <p><span className="font-semibold text-slate-900">Email:</span> {app.email || "Not provided"}</p>
                      <p><span className="font-semibold text-slate-900">Phone:</span> {app.phone || "Not provided"}</p>
                      <p><span className="font-semibold text-slate-900">Operating city:</span> {app.operating_city || "Not provided"}</p>
                      <p><span className="font-semibold text-slate-900">Experience:</span> {app.years_experience || "Not provided"}</p>
                      <p><span className="font-semibold text-slate-900">Referral code:</span> {app.referral_code || "None"}</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">Referred by</p>
                      <p>{getAgentDisplayName(app.referrer, "Not available")}</p>
                      {app.referrer?.full_name && <p className="mt-1 text-slate-500">Account holder: {app.referrer.full_name}</p>}
                      {app.referrer?.email && <p className="mt-1 text-slate-500">{app.referrer.email}</p>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => approveAgent(app)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                        Approve
                      </button>
                      <button onClick={() => rejectAgent(app)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {flagged.length > 0 && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
              <SectionHeader title="Flagged Listings" description="Listings reported by users for admin review." />
              <div className="grid gap-3 md:grid-cols-2">
                {flagged.map((flag) => (
                  <Link href={`/property/${flag.property_id}`} key={`${flag.property_id}-${flag.reason}`} className="rounded-2xl border border-red-100 bg-red-50/60 p-4 transition hover:shadow-md">
                    <p className="font-semibold">{flag.properties?.title || "Untitled listing"}</p>
                    <p className="mt-1 text-sm text-slate-500">{flag.properties?.location}</p>
                    <p className="mt-2 text-sm text-red-700">Reason: {flag.reason || "No reason provided"}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
            <SectionHeader title="Users" description="View normal CASA users, profile completeness, and account signals." />

            <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                type="text"
                placeholder="Search users by name, email, or phone"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              <select
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value as typeof userFilter)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
              >
                <option value="all">All users</option>
                <option value="active">Active users</option>
                <option value="missing">Missing profile info</option>
                <option value="pending">Pending application</option>
                <option value="approved">Approved application</option>
                <option value="rejected">Rejected application</option>
              </select>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No users match this view.</p>
            ) : (
              <div className="grid gap-4">
                {filteredUsers.map((user) => {
                  const isMissingProfile = !user.full_name
                  const lastLogin = user.last_login || user.last_sign_in_at

                  return (
                    <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold">{user.full_name || "No name"}</p>
                            <Badge className={statusClass(user.status)}>{user.status || "unknown"}</Badge>
                            <Badge className={statusClass(user.agent_status)}>{user.agent_status || "none"}</Badge>
                            <VerificationBadge status={user.verification_status} />
                          </div>
                          <div className="mt-2 grid gap-1 text-sm text-slate-500 sm:grid-cols-2">
                            <p className="truncate">{user.email || "No email on file"}</p>
                            <p>{user.phone || "No phone on file"}</p>
                          </div>
                          {isMissingProfile && (
                            <div className="mt-3 inline-flex rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                              Missing profile information
                            </div>
                          )}
                        </div>

                        <div className="grid gap-3 text-sm sm:grid-cols-2 xl:min-w-[320px]">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Last login</p>
                            <p className="font-semibold">{formatDate(lastLogin)}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Login count</p>
                            <p className="font-semibold">{user.login_count ?? "Not available"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
            <SectionHeader title="Agents" description="Manage agent access, verification, listings, contacts, and ratings." />

            <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
              <input
                type="text"
                placeholder="Search agents by business name, name, email, or phone"
                value={agentQuery}
                onChange={(event) => setAgentQuery(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              <select
                value={minRating}
                onChange={(event) => setMinRating(Number(event.target.value))}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
              >
                <option value={0}>All ratings</option>
                <option value={3}>3+ stars</option>
                <option value={4}>4+ stars</option>
              </select>
              <select
                value={verificationFilter}
                onChange={(event) => setVerificationFilter(event.target.value as "all" | VerificationStatus)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
              >
                <option value="all">All verification</option>
                <option value="verified">Verified agents</option>
                <option value="pending">Pending agents</option>
                <option value="rejected">Rejected agents</option>
              </select>
              <div className="flex gap-2">
                <button onClick={searchAgents} className="min-h-11 flex-1 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                  Search
                </button>
                <button onClick={loadAllAgents} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  View All
                </button>
              </div>
            </div>

            {loadingAgents && <p className="text-sm text-slate-500">Loading agents...</p>}

            <div className="grid gap-4">
              {filteredAgents.map((agent) => {
                const isMissingProfile = !agent.full_name
                const publicAgentName = getAgentDisplayName(agent, "No public name")
                return (
                  <div key={agent.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/agent/${agent.id}`} className="text-lg font-semibold hover:text-emerald-700">
                            {publicAgentName}
                          </Link>
                          <Badge className={statusClass(agent.status || agent.agent_status)}>{agent.status || agent.agent_status || "unknown"}</Badge>
                          <VerificationBadge status={agent.verification_status} />
                        </div>
                        <div className="mt-2 grid gap-1 text-sm text-slate-500 sm:grid-cols-2">
                          <p><span className="font-semibold text-slate-700">Full name:</span> {agent.full_name || "Not provided"}</p>
                          <p><span className="font-semibold text-slate-700">Business:</span> {agent.business_name || "Not provided"}</p>
                          <p>{agent.email || "No email on file"}</p>
                          <p>{agent.phone || "No phone on file"}</p>
                        </div>
                        {isMissingProfile && (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                            Missing profile information
                          </div>
                        )}
                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Listings</p>
                            <p className="font-semibold">{agent.listing_count || 0}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Contacts</p>
                            <p className="font-semibold">{agent.contact_count || 0}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Rating</p>
                            <p className="font-semibold">{(agent.avgRating || 0).toFixed(1)} / 5</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-slate-500">Reviews</p>
                            <p className="font-semibold">{agent.reviewCount || 0}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 xl:min-w-[360px] xl:items-end">
                        <button onClick={() => loadAgentListings(agent)} className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 xl:w-auto">
                          View Listings
                        </button>
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <button onClick={() => setConfirmChange({ agent, status: "verified" })} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                            Verify Agent
                          </button>
                          <button onClick={() => setConfirmChange({ agent, status: "rejected" })} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                            Reject Verification
                          </button>
                          <button onClick={() => setConfirmChange({ agent, status: "pending" })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Reset To Pending
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <button onClick={() => updateAgentStatus(agent.id, "suspended")} className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600">
                            Suspend
                          </button>
                          <button onClick={() => updateAgentStatus(agent.id, "banned")} className="rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800">
                            Ban
                          </button>
                          <button onClick={() => updateAgentStatus(agent.id, "active")} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                            Activate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {selectedAgent && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
              <SectionHeader title={`Listings by ${getAgentDisplayName(selectedAgent, selectedAgent.email || "selected agent")}`} />
              {agentListings.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No listings found.</p>
              ) : (
                <div className="grid gap-4">
                  {agentListings.map((property) => (
                    <div key={property.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-4">
                        <img src={property.image || fallbackImage} alt={property.title || "Listing"} className="h-20 w-24 rounded-xl object-cover" />
                        <div>
                          <p className="font-semibold">{property.title || "Untitled listing"}</p>
                          <p className="text-sm text-slate-500">{property.location || "No location"}</p>
                          <p className="mt-1 text-sm font-semibold">{formatCurrency(property.price, property.rent_period)}</p>
                          <VerificationBadge status={selectedAgent.verification_status} />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <a href={`/property/${property.id}`} target="_blank" className="text-sm font-semibold text-blue-700">
                          View
                        </a>
                        <button onClick={() => deleteListing(property)} className="text-sm font-semibold text-red-600">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
            <SectionHeader title="Listings" description="Review property listings with richer media, status, and verification context." />

            <div className="mb-4 flex flex-wrap gap-2">
              {["all", "rent", "sale", "campus"].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setCategoryFilter(type)
                    void loadAllListings(type)
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    categoryFilter === type
                      ? "bg-slate-950 text-white shadow-sm"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {type === "all" ? "All" : type === "rent" ? "For Rent" : type === "sale" ? "For Sale" : "Campus"}
                </button>
              ))}
            </div>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search listings by owner, location, phone, or price"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              <button onClick={searchListings} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                Search
              </button>
              <button onClick={() => loadAllListings(categoryFilter)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                View All
              </button>
            </div>

            {loading && <p className="text-sm text-slate-500">Loading listings...</p>}

            <div className="grid gap-4">
              {properties.map((property) => {
                const agentId = property.agent_id || property.owner_id || ""
                const verificationStatus = verificationMap[agentId]
                return (
                  <Link href={`/property/${property.id}`} key={property.id} className="block">
                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-4">
                        <img src={property.image || fallbackImage} alt={property.title || "Listing"} className="h-24 w-28 rounded-xl object-cover sm:h-20" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{property.title || "Untitled listing"}</p>
                            {verificationStatus && <VerificationBadge status={verificationStatus} />}
                            {property.is_duplicate && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Duplicate</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{property.location || "No location"}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm">
                            <Badge className={statusClass(property.is_active === false ? "inactive" : "active")}>
                              {property.is_active === false ? "Inactive" : "Active"}
                            </Badge>
                            <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                              {property.listing_type || "Uncategorized"}
                            </Badge>
                            <span className="font-semibold text-slate-950">{formatCurrency(property.price, property.rent_period)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 sm:justify-end">
                        <span className="text-sm font-semibold text-blue-700">View</span>
                        <button
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            void deleteListing(property)
                          }}
                          className="text-sm font-semibold text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>
      </section>

      {confirmChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">Confirm verification change</h2>
            <p className="mt-2 text-sm text-slate-500">
              Change {getAgentDisplayName(confirmChange.agent, confirmChange.agent.email || "this agent")} to{" "}
              <span className="font-semibold text-slate-900">{confirmChange.status}</span>?
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setConfirmChange(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={updateVerificationStatus} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
