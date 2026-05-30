import { supabase } from "./supabaseClient"

type ListingWithAgent = {
  agent_id?: string | null
  owner_id?: string | null
}

type VerificationProfile = {
  id: string
  verification_status?: string | null
}

export const getListingAgentId = (listing: ListingWithAgent) =>
  listing.agent_id || listing.owner_id || null

export const loadVerificationStatuses = async (listings: ListingWithAgent[]) => {
  const agentIds = Array.from(
    new Set(listings.map(getListingAgentId).filter(Boolean) as string[])
  )

  if (agentIds.length === 0) return {}

  const { data, error } = await supabase
    .from("profiles")
    .select("id, verification_status")
    .in("id", agentIds)

  if (error) {
    console.error("Unable to load verification statuses", error)
    return {}
  }

  return (data || []).reduce<Record<string, string | null>>((acc, profile: VerificationProfile) => {
    acc[profile.id] = profile.verification_status || "pending"
    return acc
  }, {})
}
