"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SearchBar() {

  const router = useRouter()

  const [location, setLocation] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [rentPeriod, setRentPeriod] = useState("")

  const handleSearch = () => {

    const params = new URLSearchParams()

    if (location) params.append("location", location)
    if (minPrice) params.append("minPrice", minPrice)
    if (maxPrice) params.append("maxPrice", maxPrice)
    if (rentPeriod) params.append("rentPeriod", rentPeriod)

    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="space-y-3">

      <input
        type="text"
        placeholder="Search location..."
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 min-h-10 text-sm sm:text-base text-black placeholder-gray-500"
      />

      {/* Popular area chips */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Popular areas</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["Hilltop", "Odenigwe", "Odim", "Behind Flat", "Town"].map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setLocation(area)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                location === area
                  ? "bg-black text-white border-black"
                  : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <input
          type="number"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 min-h-10 text-sm sm:text-base text-black placeholder-gray-500"
        />

        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 min-h-10 text-sm sm:text-base text-black placeholder-gray-500"
        />

      </div>

      <select
        value={rentPeriod}
        onChange={(e) => setRentPeriod(e.target.value)}
        className="w-full border rounded-lg px-4 py-2.5 min-h-10 text-sm sm:text-base"
      >
        <option value="">Rent period</option>
        <option value="year">Per Year</option>
        <option value="month">Per Month</option>
      </select>

      <button
        onClick={handleSearch}
        className="w-full bg-black text-white py-2.5 min-h-10 rounded-lg text-sm sm:text-base"
      >
        Search
      </button>

    </div>
  )
}
