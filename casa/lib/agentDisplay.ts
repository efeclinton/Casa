export type AgentDisplayProfile = {
  business_name?: string | null
  full_name?: string | null
}

export const getAgentDisplayName = (
  profile?: AgentDisplayProfile | null,
  fallback = "CASA Agent"
) => {
  const businessName = profile?.business_name?.trim()
  if (businessName) return businessName

  const fullName = profile?.full_name?.trim()
  if (fullName) return fullName

  return fallback
}
