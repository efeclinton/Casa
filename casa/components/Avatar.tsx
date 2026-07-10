"use client"

import { useState } from "react"

type AvatarProps = {
  avatarUrl?: string | null
  businessName?: string | null
  fullName?: string | null
  email?: string | null
  size: number
  alt?: string
  className?: string
}

export function getAvatarInitials({
  businessName,
  fullName,
  email,
}: Pick<AvatarProps, "businessName" | "fullName" | "email">) {
  const source = businessName?.trim() || fullName?.trim() || email?.trim() || "C"
  const nameParts = source
    .replace(/@.*$/, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)

  if (nameParts.length === 0) return "C"
  if (nameParts.length === 1) return nameParts[0].slice(0, 2).toUpperCase()

  return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
}

export default function Avatar({
  avatarUrl,
  businessName,
  fullName,
  email,
  size,
  alt,
  className = "",
}: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const initials = getAvatarInitials({ businessName, fullName, email })
  const showImage = Boolean(avatarUrl && avatarUrl !== failedUrl)

  return (
    <span
      className={`inline-flex flex-none items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-100 font-bold text-emerald-800 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.28)) }}
      aria-label={showImage ? undefined : alt || `${initials} avatar`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl || ""}
          alt={alt || `${initials} avatar`}
          className="h-full w-full rounded-full object-cover"
          onError={() => setFailedUrl(avatarUrl || null)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  )
}
