"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"
import {
  getCompletionPath,
  getSafeRedirectPath,
  isProfileComplete,
  loadCurrentProfile,
} from "../../../lib/profileCompletion"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const redirectPath = getSafeRedirectPath(localStorage.getItem("redirectAfterLogin") || searchParams.get("redirect") || "/")
        localStorage.removeItem("redirectAfterLogin")
        const profile = await loadCurrentProfile(session.user)

        if (!isProfileComplete(profile, session.user)) {
          router.replace(getCompletionPath(redirectPath))
          return
        }

        router.replace(redirectPath)
      } else {
        router.replace("/login")
      }
    }

    handleCallback()
  }, [router, searchParams])

  return <p className="p-10">Signing you in...</p>
}
