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
    <Link href={`/property/${id}`} className="block h-full">

      <div className="h-full bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition cursor-pointer flex flex-col">

        <img
          src={image || fallbackImage}
          alt={title}
          className="w-full h-44 sm:h-52 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackImage
          }}
        />

        <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1">

          <p className="text-base sm:text-lg lg:text-xl font-semibold">
            {formattedPrice}
          </p>

          <h3 className="text-sm sm:text-base lg:text-lg mt-1 line-clamp-2">
            {title}
          </h3>

          <p className="text-gray-500 text-sm sm:text-base line-clamp-2">
            {location}
          </p>

          <p className="text-green-600 text-sm font-medium mt-auto pt-2">
            View details →
          </p>

        </div>

      </div>

    </Link>
  )
}
