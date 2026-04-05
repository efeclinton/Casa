"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function SignupPage() {

  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: any) => {
    e.preventDefault()

    if (loading) return

    if (!fullName || !phone || !email || !password) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    // Insert into profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user?.id,
        full_name: fullName,
        phone: phone,
        agent_status: 'none'
      })

    if (profileError) {
      alert('Error creating profile: ' + profileError.message)
      setLoading(false)
      return
    }

    alert("Account created successfully")

    router.push("/login")
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
        />

        <input
          type="text"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border p-3 rounded"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-3 rounded"
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
        <a href="/login" className="text-green-600">
          Login
        </a>
      </p>

    </main>
  )
}