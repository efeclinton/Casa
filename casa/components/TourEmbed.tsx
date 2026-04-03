"use client"

import { useState } from "react"

export default function TourEmbed({ link }: { link: string }) {

  const [showTour, setShowTour] = useState(false)

  if (!link) return null

  return (

    <div className="mt-10">

      <h2 className="text-xl font-semibold mb-4">
        360° Virtual Tour
      </h2>

      {!showTour ? (

        <div className="bg-gray-100 p-10 rounded-xl text-center">

          <p className="mb-4 text-gray-600">
            Explore this property in an interactive 360° tour
          </p>

          <button
            onClick={() => setShowTour(true)}
            className="bg-black text-white px-6 py-3 rounded-lg"
          >
            ▶ View Virtual Tour
          </button>

        </div>

      ) : (

        <iframe
          src={link}
          width="100%"
          height="500"
          allowFullScreen
          className="rounded-xl border"
        />

      )}

    </div>

  )

}