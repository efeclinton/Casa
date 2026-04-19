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
<<<<<<< HEAD
        const redirectPath = localStorage.getItem("redirectAfterLogin")

        if (redirectPath) {
          localStorage.removeItem("redirectAfterLogin")
          window.location.href = redirectPath
        } else {
          window.location.href = "/"
        }
=======
        router.replace(getSafeRedirectPath())
>>>>>>> a3c7fa3f2e4ace1276f3387c204e7577afe69dd8
      } else {
        router.replace("/login")
      }
    }

    handleCallback()
  }, [router, searchParams])

  return <p className="p-10">Signing you in...</p>
}
