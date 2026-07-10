"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { NotificationListSkeleton } from "../../components/LoadingSkeletons"

type Notification = {
  id: string
  title?: string
  message?: string
  created_at?: string
  read?: boolean
  type?: string
}

const formatNotificationDate = (timestamp?: string) => {
  if (!timestamp) return ""

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

const formatTypeLabel = (type?: string) => {
  if (!type) return ""
  return type.replace(/[_-]+/g, " ")
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
    return <NotificationListSkeleton />
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:p-10">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
          CASA
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-2 text-sm text-gray-500">
          Account updates, listing activity, and important messages appear here.
        </p>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">No notifications yet</p>
            <p className="mt-2 text-sm text-gray-500">
              You are all caught up. New CASA updates will show here.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
                notification.read
                  ? "border-gray-100 bg-white"
                  : "border-green-200 bg-green-50/70"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                    notification.read ? "bg-gray-300" : "bg-green-600"
                  }`}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-950">
                        {notification.title || "Notification"}
                      </p>
                      {notification.message && (
                        <p className="mt-1 text-sm leading-6 text-gray-600">
                          {notification.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {notification.type && (
                        <span className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-gray-600">
                          {formatTypeLabel(notification.type)}
                        </span>
                      )}
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          notification.read
                            ? "bg-gray-100 text-gray-600"
                            : "bg-green-600 text-white"
                        }`}
                      >
                        {notification.read ? "Read" : "Unread"}
                      </span>
                    </div>
                  </div>

                  {notification.created_at && (
                    <p className="mt-3 text-xs font-medium text-gray-500">
                      {formatNotificationDate(notification.created_at)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </main>
  )
}
