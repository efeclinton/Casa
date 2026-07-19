"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { getCompletionPath, getSafeRedirectPath, isProfileComplete, loadCurrentProfile } from "@/lib/profileCompletion"

export default function LoginPage() {

  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"))
  const sessionExpired = searchParams.get("reason") === "session-expired"

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert(error.message)
      return
    }

    const user = data.user

    if (user) {
      try {
        const profile = await loadCurrentProfile(user)
        if (!isProfileComplete(profile, user)) {
          router.push(getCompletionPath(redirectPath))
          return
        }
      } catch {
        alert("Unable to load your profile. Please try again.")
        return
      }
    }

    router.push(redirectPath)
  }

  const handleGoogleLogin = async () => {
    const redirect = encodeURIComponent(redirectPath)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`
      }
    })

    if (error) {
      alert(error.message)
    }
  }

  return (
    <main className="max-w-md mx-auto p-10">

      <h1 className="text-3xl font-bold mb-6">
        Login
      </h1>

      <form onSubmit={handleLogin} className="space-y-4">

        {sessionExpired && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Your session has expired. Please sign in again.
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full border p-3 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full border p-3 rounded"
        />

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-green-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-3 rounded"
        >
          Login
        </button>

      </form>

      <button
        onClick={handleGoogleLogin}
        className="w-full mt-4 flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-3 hover:bg-gray-50 transition"
      >
        <img
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          alt="Google"
          className="w-5 h-5"
        />
        Continue with Google
      </button>

      <p className="mt-4 text-sm">
        Don&apos;t have an account? <Link href={`/signup?redirect=${encodeURIComponent(redirectPath)}`} className="text-green-600">Sign up</Link>
      </p>

    </main>
  )
}
