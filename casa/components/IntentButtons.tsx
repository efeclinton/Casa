"use client"

import Link from "next/link"

export default function IntentButtons() {
  return (
    <div className="flex flex-col gap-3 mt-4 md:flex-row md:justify-center md:items-center md:gap-4">

      {/* Buy Property */}
      <div className="relative w-full h-[56px] md:w-[180px] md:h-[70px] bg-green-600 rounded-lg flex items-center justify-center text-white font-semibold text-base md:text-sm leading-tight">
        <button className="w-full h-full flex items-center justify-center rounded-lg hover:bg-green-700 transition-all duration-150 active:scale-95">
          <span className="text-center leading-tight">
            Buy Property
          </span>
        </button>

        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[9px] md:text-[10px] px-2 py-[2px] rounded-full whitespace-nowrap">
          Coming Soon
        </span>
      </div>

      {/* Rent Property */}
      <div className="relative w-full h-[56px] md:w-[180px] md:h-[70px] bg-green-600 rounded-lg flex items-center justify-center text-white font-semibold text-base md:text-sm leading-tight">
        <button className="w-full h-full flex items-center justify-center rounded-lg hover:bg-green-700 transition-all duration-150 active:scale-95">
          <span className="text-center leading-tight">
            Rent Property
          </span>
        </button>

        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[9px] md:text-[10px] px-2 py-[2px] rounded-full whitespace-nowrap">
          Coming Soon
        </span>
      </div>

      {/* Campus Accommodation */}
      <div className="relative w-full h-[56px] md:w-[180px] md:h-[70px] bg-green-600 rounded-lg flex items-center justify-center text-white font-semibold text-base md:text-sm leading-tight">
        <Link href="/campus" className="w-full h-full flex items-center justify-center rounded-lg hover:bg-green-700 transition-all duration-150 active:scale-95">
          <span className="text-center leading-tight">
            Campus Stay
          </span>
        </Link>
      </div>

    </div>
  )
}