"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { formatUpdatedAtLabel } from "@/lib/activity"
import MarketItemImage from "@/components/MarketItemImage"

type MarketItemCardProps = {
  id: string
  title: string
  price: number
  location?: string | null
  image?: string | null
  updatedAt?: string | null
  isActive?: boolean | null
  className?: string
  children?: ReactNode
}

export default function MarketItemCard({
  id,
  title,
  price,
  location,
  image,
  updatedAt,
  isActive,
  className = "",
  children,
}: MarketItemCardProps) {
  const updatedText = formatUpdatedAtLabel(updatedAt)
  const statusLabel = isActive === false ? "Inactive" : "Available"

  return (
    <Link href={`/market/${id}`} className={`group block h-full ${className}`}>
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition md:group-hover:-translate-y-1 md:group-hover:shadow-[0_20px_55px_rgba(15,23,42,0.14)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-slate-100">
          <MarketItemImage
            image={image}
            alt={title || "Marketplace item"}
            className="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.03]"
          />
          <div className="absolute left-3 top-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur ${
              isActive === false ? "bg-white/95 text-slate-600" : "bg-emerald-50/95 text-emerald-700"
            }`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="flex min-h-[220px] flex-1 flex-col p-4 sm:p-5">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-950">{title || "Untitled item"}</h3>
          <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-500">{location || "Location not provided"}</p>
          <p className="mt-3 text-xl font-bold text-slate-950">₦{Number(price || 0).toLocaleString()}</p>
          {updatedText && <p className="mt-2 text-xs font-medium text-slate-400">{updatedText}</p>}

          <div className="mt-auto pt-5">
            <span className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition md:group-hover:bg-emerald-700">
              View Details
            </span>
            {children && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">{children}</div>}
          </div>
        </div>
      </div>
    </Link>
  )
}
