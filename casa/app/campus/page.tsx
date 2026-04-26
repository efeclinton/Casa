"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import PropertyCard from "../../components/PropertyCard"
import { getListingScore } from "../../lib/ranking"

export default function CampusPage() {

  const [properties, setProperties] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])

  const [location, setLocation] = useState("")
  const [price, setPrice] = useState("")
  const [period, setPeriod] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    loadListings()
  }, [])

  const normalize = (text: any) =>
    (text || "")
      .toString()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()

  // ✅ LOAD ONLY CAMPUS LISTINGS (EXACT MATCH)
  const loadListings = async () => {

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      // Only load campus listings (case-insensitive, allows "campus" or "Campus stay")
      .ilike("listing_type", "%campus%")

    console.log("[loadListings] raw data:", data)
    console.log("[loadListings] listing_type values:", data?.map(d => d.listing_type))

    if (error) {
      console.log("Supabase error:", error)
      return
    }

    const ranked = (data || [])
      .map((p: any) => ({
        ...p,
        score: getListingScore(p)
      }))
      .sort((a, b) => b.score - a.score)

    console.log("[loadListings] ranked properties:", ranked)

    setProperties(ranked)
    setFiltered(ranked)
  }

  // ✅ APPLY FILTERS
  const applyFilters = () => {

    setIsSearching(true)

    console.log("[applyFilters] current properties:", properties)

    let results = [...properties]

    // 🔒 Safety check (never allow non-campus)
    results = results.filter(p =>
      normalize(p.listing_type).includes("campus")
    )

    const search = normalize(location)
    console.log("[applyFilters] SEARCH TERM:", search)

    if (search) {
      results = results.filter(p => {

        const combined = normalize(`
          ${p.title}
          ${p.location}
          ${p.school}
          ${p.description}
        `)

        console.log({
          title: p.title,
          location: p.location,
          school: p.school,
          combined
        })

        return combined.includes(search)
      })
    }

    if (price) {
      const maxPrice = Number(price)

      results = results.filter(p =>
        Number(p.price) <= maxPrice
      )
    }

    if (period) {
      results = results.filter(p =>
        normalize(p.rent_period) === normalize(period)
      )
    }

    console.log("[applyFilters] FILTERED RESULTS:", results)

    setFiltered(results)
    setIsSearching(false)
  }

  // ✅ QUICK FILTER
  const quickFilter = (value: string) => {

    const search = normalize(value)

    setLocation(value)

    let results = properties.filter(p =>
      normalize(p.listing_type).includes("campus")
    )

    results = results.filter(p => {

      const combined = normalize(`
        ${p.title}
        ${p.location}
        ${p.school}
        ${p.description}
      `)

      return combined.includes(search)
    })

    setFiltered(results)
  }

  const resetFilters = () => {
    setLocation("")
    setPrice("")
    setPeriod("")
    setFiltered(properties)
  }

  return (

    <main>

      

      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">
          Campus Accommodation
        </h1>

        <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
          Find verified off-campus housing near universities
        </p>

        {/* Filters */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">

          <input
            type="text"
            placeholder="Search location or school (e.g. Hilltop, UNIBEN)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="number"
            placeholder="Max price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full border p-3 rounded"
          >
            <option value="">Rent Period</option>
            <option value="year">Per Year</option>
            <option value="month">Per Month</option>
          </select>

          <button
            onClick={applyFilters}
            disabled={isSearching}
            className="w-full h-10 sm:h-11 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? "Searching..." : "Apply Filters"}
          </button>

        </div>

        {/* Quick Filters */}

        <div className="mb-8">

          <p className="font-semibold mb-2">
            Popular Locations
          </p>

          <div className="flex gap-2 sm:gap-3 flex-wrap">

            {["Hilltop", "Ekosodin", "GRA", "Sabo"].map((loc) => (
              <button
                key={loc}
                onClick={() => quickFilter(loc)}
                className="px-4 py-2.5 border rounded-full hover:bg-gray-100 text-sm sm:text-base"
              >
                {loc}
              </button>
            ))}

            <button
              onClick={resetFilters}
              className="px-4 py-2.5 border rounded-full hover:bg-gray-100 text-sm sm:text-base"
            >
              Show All
            </button>

          </div>

        </div>

        {/* Listings */}

        {filtered.length ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

            {filtered.map(property => (
              <PropertyCard
                key={property.id}
                id={property.id}
                image={property.image}
                price={property.price}
                title={property.title}
                location={property.location}
                rent_period={property.rent_period}
              />
            ))}

          </div>

        ) : (

          <p className="text-gray-500">
            No listings match your filters
          </p>

        )}

      </section>

    </main>
  )
}
