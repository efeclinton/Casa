"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../../lib/supabaseClient"
import {
  getCompletionPath,
  getSafeRedirectPath,
  isProfileComplete,
  loadCurrentProfile,
} from "../../../lib/profileCompletion"
import { FormPageSkeleton } from "../../../components/LoadingSkeletons"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState("")
  const [retryAttempt, setRetryAttempt] = useState(0)

  useEffect(() => {
    let active = true

    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!session) {
          router.replace("/login")
          return
        }

        const redirectPath = getSafeRedirectPath(localStorage.getItem("redirectAfterLogin") || searchParams.get("redirect") || "/")
        const profile = await loadCurrentProfile(session.user)

        if (!isProfileComplete(profile, session.user)) {
          localStorage.removeItem("redirectAfterLogin")
          router.replace(getCompletionPath(redirectPath))
          return
        }

        localStorage.removeItem("redirectAfterLogin")
        router.replace(redirectPath)
      } catch (error) {
        console.error("OAuth callback profile loading failed", {
          code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined,
          message: error instanceof Error ? error.message : "Unknown error",
        })
        if (active) {
          setErrorMessage("We could not finish signing you in because your profile could not be loaded. Please try again.")
        }
      }
    }

    void handleCallback()

    return () => {
      active = false
    }
  }, [retryAttempt, router, searchParams])

  if (errorMessage) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-950">Sign-in could not be completed</h1>
        <p className="mt-3 text-sm text-slate-600" role="alert">{errorMessage}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setErrorMessage("")
              setRetryAttempt((attempt) => attempt + 1)
            }}
            className="rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white"
          >
            Retry
          </button>
          <Link href="/login" className="rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700">
            Return to login
          </Link>
        </div>
      </main>
    )
  }

  return <FormPageSkeleton maxWidth="max-w-md" />
}
