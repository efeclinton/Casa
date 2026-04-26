"use client"

"use client"

import Link from "next/link"

interface PropertyCardProps {
  image: string;
  price: number;
  title: string;
  location: string;
  rent_period: string;
  id: string;
}

export default function PropertyCard({
  image,
  price,
  title,
  location,
  rent_period,
  id
}: PropertyCardProps) {

  const formattedPrice = `₦${Math.round(price / 1000)}k / ${rent_period}`

  const fallbackImage =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80"

  return (
    <Link href={`/property/${id}`} className="h-full">

      <div className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition cursor-pointer h-full flex flex-col">

        <img
          src={image || fallbackImage}
          alt={title}
          className="w-full h-48 sm:h-52 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackImage
          }}
        />

        <div className="p-4 flex flex-col justify-between flex-1">
          <div>

            <p className="text-lg sm:text-xl font-semibold">
              {formattedPrice}
            </p>

            <h3 className="text-base sm:text-lg mt-2 line-clamp-2 min-h-[3rem]">
              {title}
            </h3>

            <p className="text-sm sm:text-base text-gray-500 line-clamp-2">
              {location}
            </p>
          </div>

          <p className="text-green-600 text-sm font-medium mt-3">
            View details →
          </p>

        </div>

      </div>

    </Link>
  )
}
