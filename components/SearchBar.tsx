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
        className="w-full border rounded-lg px-4 py-3"
      />

      <div className="grid grid-cols-2 gap-3">

        <input
          type="number"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="border rounded-lg px-4 py-3"
        />

        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="border rounded-lg px-4 py-3"
        />

      </div>

      <select
        value={rentPeriod}
        onChange={(e) => setRentPeriod(e.target.value)}
        className="w-full border rounded-lg px-4 py-3"
      >
        <option value="">Rent period</option>
        <option value="year">Per Year</option>
        <option value="month">Per Month</option>
      </select>

      <button
        onClick={handleSearch}
        className="w-full bg-black text-white py-3 rounded-lg"
      >
        Search
      </button>

    </div>
  )
}