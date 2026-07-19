"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { getSafeRedirectPath } from "../../lib/profileCompletion"

export default function SignupPage() {

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = getSafeRedirectPath(searchParams.get("redirect"))

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (loading) return

    const nextFullName = fullName.trim()
    const nextPhone = phone.trim()
    const nextEmail = email.trim()

    if (!nextFullName || !nextPhone || !nextEmail || !password) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: nextEmail,
        password,
        options: {
          data: {
            full_name: nextFullName,
            phone: nextPhone,
          },
        },
      })

      if (error) {
        console.error("Signup failed:", {
          code: error.code,
          message: error.message,
        })
        alert(error.message)
        setLoading(false)
        return
      }

      if (!data.user && !data.session?.user) {
        alert("Account creation could not be confirmed. Please try again.")
        setLoading(false)
        return
      }

      setLoading(false)
      alert("Account created successfully")

      router.push(`/login?redirect=${encodeURIComponent(redirect)}`)
    } catch (unexpectedError) {
      const message = unexpectedError instanceof Error ? unexpectedError.message : "Unable to create account. Please try again."
      console.error("Unexpected signup failure:", { message })
      alert(message)
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto p-10">

      <h1 className="text-3xl font-bold mb-2">
        Create Account
      </h1>

      <p className="text-gray-500 mb-6">
        Join Casa to find or list properties
      </p>

      <form onSubmit={handleSignup} className="space-y-4">

        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border p-3 rounded"
          required
        />

        <input
          type="text"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border p-3 rounded"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-3 rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

      </form>

      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-green-600">
          Login
        </Link>
      </p>

    </main>
  )
}
