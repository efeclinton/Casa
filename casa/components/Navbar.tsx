"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "../lib/supabaseClient"

export default function Navbar() {

  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {

    const loadUserAndProfile = async (currentUser: any) => {
      setUser(currentUser)

      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single()

        setProfile(data)
      } else {
        setProfile(null)
      }
    }

    // Get initial user
    const getInitialUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      await loadUserAndProfile(session?.user ?? null)
    }

    getInitialUser()

    // Listen for auth state changes
    let subscription: any = null
    try {
      const result = supabase.auth.onAuthStateChange(
        (event, session) => {
          loadUserAndProfile(session?.user ?? null)
        }
      )
      subscription = result.data.subscription
    } catch (error) {
      console.error('Error setting up auth listener:', error)
    }

    // Clean up subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }

  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    location.reload()
  }

  return (

    <nav className="w-full bg-white shadow">

      <div className="max-w-6xl mx-auto flex justify-between items-center p-5">

        {/* Logo */}
        <Link href="/" className="text-2xl font-bold">
          Casa
        </Link>

        {/* Menu Icon */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-2xl"
        >
          ☰
        </button>

      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 w-72 bg-white p-6 z-50 shadow-lg transition-transform duration-300 translate-x-0">
            <button
              onClick={() => setMenuOpen(false)}
              className="text-xl mb-4"
            >
              ✕ Close
            </button>

            <div className="flex flex-col gap-4">
              <Link href="/">Home</Link>
              <Link href="#">Buy Property</Link>
              <Link href="#">Rent Property</Link>
              <Link href="/campus">Campus Stay</Link>
              <Link href="/saved-listings">Saved Listings</Link>

              {user && (
                <Link href="/profile">Profile</Link>
              )}

              {user && profile && profile.agent_status === "approved" && (
                <Link href="/list-property">Post Property</Link>
              )}

              {user && profile && profile.agent_status === "none" && (
                <Link href="/become-agent">Become an Agent</Link>
              )}

              {user && profile && profile.agent_status === "pending" && (
                <span className="text-yellow-600">Application Pending</span>
              )}

              {user && (
                <Link href="/dashboard">My Listings</Link>
              )}

              {!user && (
                <Link href="/login">Login</Link>
              )}

              {user && (
                <button
                  onClick={handleLogout}
                  className="text-left"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </>
      )}

    </nav>
  )
}