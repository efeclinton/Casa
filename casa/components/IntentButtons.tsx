"use client"

import Link from "next/link"

export default function IntentButtons() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-4">

      {/* Buy Property */}
      <div className="relative">
        <button className="w-full py-3 rounded-full bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition">
          Buy Property
        </button>

        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-semibold shadow">
          Coming Soon
        </span>
      </div>


      {/* Rent Property */}
      <div className="relative">
        <button className="w-full py-3 rounded-full bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition">
          Rent Property
        </button>

        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-semibold shadow">
          Coming Soon
        </span>
      </div>


      {/* Campus Accommodation */}
      <Link href="/campus">
        <button className="w-full py-3 rounded-full bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition">
          Campus Stay
        </button>
      </Link>

    </div>
  )
}