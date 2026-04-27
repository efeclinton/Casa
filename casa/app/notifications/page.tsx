"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

type Notification = {
  id: string
  title?: string
  message?: string
  created_at?: string
  read?: boolean
}

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const loadNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Failed to load notifications", error)
        setNotifications([])
      } else {
        setNotifications(data || [])
      }

      setLoading(false)
    }

    loadNotifications()
  }, [router])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification || notification.read) {
      return
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id)

    if (error) {
      console.error("Failed to mark notification as read", error)
      return
    }

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id
          ? { ...item, read: true }
          : item
      )
    )

    window.dispatchEvent(new Event("notifications-updated"))
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-10">
        <p>Loading notifications...</p>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              className="w-full text-left border rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{notification.title}</p>
                  <p className="mt-1">{notification.message}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    {notification.created_at
                      ? new Date(notification.created_at).toLocaleString()
                      : ""}
                  </p>
                </div>

                <span className="text-sm">
                  {notification.read ? "Read" : "Unread"}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </main>
  )
}
