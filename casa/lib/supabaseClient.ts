import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Optimizes avatar URLs by adding Supabase image transformation parameters
 * @param avatarUrl - The original avatar URL from the database
 * @param fallbackName - Name to use for fallback avatar generation
 * @returns Optimized URL with transformations or fallback
 */
export const getOptimizedAvatarUrl = (avatarUrl: string | null, fallbackName?: string) => {
  if (!avatarUrl) {
    if (fallbackName) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=gray&color=white&size=100`
    }
    return "https://via.placeholder.com/100"
  }

  // Check if it's a Supabase storage URL and add transformations
  if (avatarUrl.includes('supabase')) {
    const separator = avatarUrl.includes('?') ? '&' : '?'
    return `${avatarUrl}${separator}width=100&height=100&quality=80`
  }

  return avatarUrl
}