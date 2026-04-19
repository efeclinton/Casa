"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const getSafeRedirectPath = () => {
      const redirect = searchParams.get("redirect") || "/"
      return redirect.startsWith("/") ? redirect : "/"
    }

    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(getSafeRedirectPath())
      } else {
        router.replace("/login")
      }
    }

    handleCallback()
  }, [router, searchParams])

  return <p className="p-10">Signing you in...</p>
}
