const requireValue = (name: string, value: string | undefined) => {
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value.trim()
}

const validateSupabaseUrl = (value: string | undefined) => {
  const urlValue = requireValue("NEXT_PUBLIC_SUPABASE_URL", value)

  let parsedUrl: URL
  try {
    parsedUrl = new URL(urlValue)
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL")
  }

  const isLocalHttp =
    parsedUrl.protocol === "http:" &&
    (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1")

  if (parsedUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL")
  }

  return urlValue
}

export const supabaseUrl = validateSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
export const supabaseAnonKey = requireValue(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
