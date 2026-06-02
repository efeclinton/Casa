"use client"

import Link from "next/link"
import { formatUpdatedAtLabel } from "@/lib/activity"
import VerifiedAgentBadge from "./VerifiedAgentBadge"

interface PropertyCardProps {
  image?: string
  price: number
  title: string
  location: string
  rent_period: string
  id: string
  updatedAt?: string | null
  inquiryCount?: number
  agentVerificationStatus?: string | null
  isActive?: boolean | null
}

export default function PropertyCard({
  image,
  price,
  title,
  location,
  rent_period,
  id,
  updatedAt,
  agentVerificationStatus,
  isActive,
}: PropertyCardProps) {
  const formattedPrice = `₦${Number(price || 0).toLocaleString()}${rent_period ? `/${rent_period}` : ""}`

  const fallbackImage =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80"

  const updatedText = formatUpdatedAtLabel(updatedAt)
  const categoryLabel = rent_period?.toLowerCase().includes("year") ? "Campus" : "Listing"
  const isVerified = agentVerificationStatus === "verified"
  const statusLabel = isActive === false ? "Inactive" : "Available"

  return (
    <Link
      href={`/property/${id}`}
      className="group block w-full flex-shrink-0 sm:w-[320px] sm:min-w-[320px] sm:max-w-[320px]"
    >
      <div className="h-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition md:group-hover:-translate-y-1 md:group-hover:shadow-[0_20px_55px_rgba(15,23,42,0.14)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-slate-100">
          <img
            src={image || fallbackImage}
            alt={title}
            className="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.03]"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = fallbackImage
            }}
          />
          {isVerified && (
            <div className="absolute left-3 top-3">
              <VerifiedAgentBadge status={agentVerificationStatus} className="border-white/70 bg-white/95 shadow-sm backdrop-blur" />
            </div>
          )}
        </div>

        <div className="flex min-h-[230px] flex-col p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{categoryLabel}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isActive === false ? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-700"
            }`}>
              {statusLabel}
            </span>
          </div>

          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-950">{title}</h3>
          <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-500">{location}</p>
          <p className="mt-3 text-xl font-bold text-slate-950">{formattedPrice}</p>
          {updatedText && <p className="mt-2 text-xs font-medium text-slate-400">{updatedText}</p>}

          <div className="mt-auto pt-5">
            <span className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition md:group-hover:bg-emerald-700">
              View Details
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
