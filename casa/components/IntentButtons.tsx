"use client"

import Link from "next/link"

export default function IntentButtons() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 md:flex md:justify-center md:gap-4">

      {/* Buy Property */}
      <div className="relative">
        <button className="w-full h-full pt-6 pb-4 px-4 rounded-xl bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition-all duration-150 active:scale-95">
          Buy Property
        </button>

        <span className="absolute top-2 left-2 z-20 bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full font-semibold shadow">
          Coming Soon
        </span>
      </div>

      {/* Rent Property */}
      <div className="relative">
        <button className="w-full h-full pt-6 pb-4 px-4 rounded-xl bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition-all duration-150 active:scale-95">
          Rent Property
        </button>

        <span className="absolute top-2 left-2 z-20 bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full font-semibold shadow">
          Coming Soon
        </span>
      </div>

      {/* Campus Accommodation */}
      <div className="relative col-span-2 md:col-auto">
        <Link href="/campus" className="block h-full">
          <button className="w-full h-full p-4 rounded-xl bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition-all duration-150 active:scale-95">
            Campus Stay
          </button>
        </Link>
      </div>

    </div>
  )
}