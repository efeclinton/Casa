import type { User } from "@supabase/supabase-js"
import { supabase } from "./supabaseClient"

type RouterLike = {
  push: (href: string) => void
  replace?: (href: string) => void
}

export type CompletionProfile = {
  id?: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
}

export const getSafeRedirectPath = (redirect?: string | null) => {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) return "/"
  return redirect
}

export const getCurrentPath = () => {
  if (typeof window === "undefined") return "/"
  return `${window.location.pathname}${window.location.search}`
}

export const getProfileEmail = (profile?: CompletionProfile | null, user?: User | null) =>
  (profile?.email || user?.email || "").trim()

export const getProfilePhone = (profile?: CompletionProfile | null) =>
  (profile?.phone || "").trim()

export const isProfileComplete = (profile?: CompletionProfile | null, user?: User | null) =>
  Boolean(profile?.full_name?.trim() && getProfilePhone(profile) && getProfileEmail(profile, user))

export const getCompletionPath = (redirect?: string | null) =>
  `/complete-profile?redirect=${encodeURIComponent(getSafeRedirectPath(redirect || getCurrentPath()))}`

export const loadCurrentProfile = async (user: User) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("id", user.id)
    .single()

  if (!error && data) {
    const metadataName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim()
    const metadataPhone = user.user_metadata?.phone || ""
    const patch: Partial<CompletionProfile> = {}

    if (!data.email && user.email) patch.email = user.email
    if (!data.full_name && metadataName) patch.full_name = metadataName
    if (!data.phone && metadataPhone) patch.phone = metadataPhone

    if (Object.keys(patch).length > 0) {
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select("id, full_name, email, phone")
        .single()

      return (updatedProfile || { ...data, ...patch }) as CompletionProfile
    }

    return data as CompletionProfile
  }

  const metadataName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim()

  const fallbackProfile = {
    id: user.id,
    full_name: metadataName || null,
    email: user.email || null,
    phone: user.user_metadata?.phone || null,
    agent_status: "none",
  }

  const { data: createdProfile } = await supabase
    .from("profiles")
    .upsert(fallbackProfile, { onConflict: "id" })
    .select("id, full_name, email, phone")
    .single()

  return (createdProfile || fallbackProfile) as CompletionProfile
}

export const ensureProfileComplete = async (
  user: User,
  router: RouterLike,
  redirect?: string | null
) => {
  const profile = await loadCurrentProfile(user)

  if (isProfileComplete(profile, user)) return true

  router.push(getCompletionPath(redirect || getCurrentPath()))
  return false
}
