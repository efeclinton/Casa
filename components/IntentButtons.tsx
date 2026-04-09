"use client"

import Link from "next/link"

export default function IntentButtons() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">

      {/* Buy Property */}
      <div className="relative">
        <button className="w-full flex flex-col items-center justify-center text-center p-4 min-h-[100px] rounded-xl bg-green-600 text-white text-base font-semibold whitespace-normal leading-[1.2] shadow hover:bg-green-700 transition-all duration-150 active:scale-95">
          Buy Property
        </button>

        <span className="absolute top-2 left-2 z-20 bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full font-semibold shadow">
          Coming Soon
        </span>
      </div>

      {/* Rent Property */}
      <div className="relative">
        <button className="w-full flex flex-col items-center justify-center text-center p-4 min-h-[100px] rounded-xl bg-green-600 text-white text-base font-semibold whitespace-normal leading-[1.2] shadow hover:bg-green-700 transition-all duration-150 active:scale-95">
          Rent Property
        </button>

        <span className="absolute top-2 left-2 z-20 bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full font-semibold shadow">
          Coming Soon
        </span>
      </div>

      {/* Campus Accommodation */}
      <div className="relative">
        <Link href="/campus" className="w-full flex flex-col items-center justify-center text-center p-4 min-h-[100px] rounded-xl bg-green-600 text-white text-base font-semibold whitespace-normal leading-[1.2] shadow hover:bg-green-700 transition-all duration-150 active:scale-95">
          Campus Stay
        </Link>
      </div>

    </div>
  )
}