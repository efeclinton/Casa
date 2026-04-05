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

  console.log("Rendering property ID:", id)

  const formattedPrice = `₦${Math.round(price / 1000)}k / ${rent_period}`

  const fallbackImage =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&auto=format&fit=crop&q=80"

  return (
    <Link
      href={`/property/${id}`}
      onClick={() => console.log("Clicked property ID:", id)}
    >

      <div className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition cursor-pointer">

        <img
          src={image || fallbackImage}
          alt={title}
          className="w-full h-[220px] object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackImage
          }}
        />

        <div className="p-4">

          <p className="text-xl font-semibold">
            {formattedPrice}
          </p>

          <h3 className="text-lg mt-2">
            {title}
          </h3>

          <p className="text-gray-500">
            {location}
          </p>

          <p className="text-green-600 text-sm font-medium mt-2">
            View details →
          </p>

        </div>

      </div>

    </Link>
  )
}