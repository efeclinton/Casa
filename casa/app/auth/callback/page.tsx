"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace("/")
      } else {
        router.replace("/login")
      }
    }

    handleCallback()
  }, [router])

  return <p className="p-10">Signing you in...</p>
}
