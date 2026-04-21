"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "../lib/supabaseClient"

const SHOW_INTENT_BUTTONS = false

export default function Navbar() {
  const pathname = usePathname()

  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)

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

        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", currentUser.id)
          .eq("read", false)

        setUnreadCount(count || 0)
      } else {
        setProfile(null)
        setUnreadCount(0)
      }
    }

    // Get initial user
    const getInitialUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      await loadUserAndProfile(session?.user ?? null)
    }

    getInitialUser()

    const handleNotificationsUpdated = () => {
      getInitialUser()
    }

    window.addEventListener("notifications-updated", handleNotificationsUpdated)

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
      window.removeEventListener("notifications-updated", handleNotificationsUpdated)

      if (subscription) {
        subscription.unsubscribe()
      }
    }

  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    location.reload()
  }

  return (

    <nav className="w-full bg-white shadow">

      <div className="max-w-6xl mx-auto h-16 px-5 flex justify-between items-center">

        {/* Logo */}
        <Link href="/" className="text-2xl font-bold">
          Casa
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <Link href="/notifications" className="relative text-2xl">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 flex items-center justify-center text-xs rounded-full bg-red-600 text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Menu Icon */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-2xl"
          >
            ☰
          </button>
        </div>

      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMenuOpen(false)}
          />

          <div className="fixed right-0 top-0 h-full w-64 bg-white z-50 shadow-lg p-6 transition-transform duration-300 translate-x-0">
            <button
              onClick={() => setMenuOpen(false)}
              className="text-xl mb-4"
            >
              ✕ Close
            </button>

            <div className="flex flex-col gap-4">
              <Link href="/">Home</Link>
              {SHOW_INTENT_BUTTONS && (
                <>
                  <Link href="#">Buy Property</Link>
                  <Link href="#">Rent Property</Link>
                  <Link href="/campus">Campus Stay</Link>
                </>
              )}
              <Link href="/market">Campus Market</Link>
              <Link href="/saved-listings">Saved Listings</Link>

              {user && (
                <Link href="/profile">Profile</Link>
              )}

              {user && (
                <Link href="/notifications">Notifications</Link>
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
