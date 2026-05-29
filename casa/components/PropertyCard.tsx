"use client"

import Link from "next/link"
import { formatUpdatedAtLabel } from "@/lib/activity"

interface PropertyCardProps {
  image?: string
  price: number
  title: string
  location: string
  rent_period: string
  id: string
  updatedAt?: string | null
  inquiryCount?: number
}

export default function PropertyCard({
  image,
  price,
  title,
  location,
  rent_period,
  id,
  updatedAt,
  inquiryCount,
}: PropertyCardProps) {
  const formattedPrice = `₦${Math.round(price / 1000)}k / ${rent_period}`

  const fallbackImage =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80"

  const updatedText = formatUpdatedAtLabel(updatedAt)
  const isPopular = Boolean(inquiryCount && inquiryCount > 15)

  return (
    <Link
      href={`/property/${id}`}
      className="block w-full sm:w-[320px] sm:min-w-[320px] sm:max-w-[320px] flex-shrink-0"
    >
      <div className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition cursor-pointer h-full">
        <img
          src={image || fallbackImage}
          alt={title}
          className="w-full h-48 sm:h-52 object-cover"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = fallbackImage
          }}
        />

        <div className="p-4 flex flex-col justify-between flex-1">
          <div>
            <p className="text-lg sm:text-xl font-semibold">{formattedPrice}</p>

            {(updatedText || isPopular) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {updatedText && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                    <span aria-hidden="true">🕒</span>
                    {updatedText}
                  </span>
                )}
                {isPopular && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 font-semibold">
                    Popular
                  </span>
                )}
              </div>
            )}

            <h3 className="text-base sm:text-lg mt-3 line-clamp-2 min-h-[3rem]">{title}</h3>

            <p className="text-sm sm:text-base text-gray-500 line-clamp-2">{location}</p>
          </div>

          <p className="text-green-600 text-sm font-medium mt-3">View details →</p>
        </div>
      </div>
    </Link>
  )
}
