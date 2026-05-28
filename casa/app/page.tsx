import type { Metadata } from "next"
import HeroSection from "../components/HeroSection"
import PropertyCard from "../components/PropertyCard"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "../lib/supabaseClient"

type Property = {
  id: string
  image?: string
  price: number
  title: string
  location: string
  rent_period: string
  is_active?: boolean
}

type MarketItem = {
  id: string
  images?: string[]
  title: string
  price: number
  location?: string
}

export const metadata: Metadata = {
  title: "CASA | Verified student accommodation near UNN",
  description:
    "Discover verified student accommodation near UNN and the latest campus market items in one trusted platform.",
  openGraph: {
    title: "CASA | Verified student accommodation near UNN",
    description:
      "Discover verified student accommodation near UNN and the latest campus market items in one trusted platform.",
    url: "/",
    siteName: "CASA",
    type: "website",
    images: [
      {
        url: "/favicon-v2.png",
        width: 1200,
        height: 630,
        alt: "CASA homepage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CASA | Verified student accommodation near UNN",
    description:
      "Discover verified student accommodation near UNN and the latest campus market items in one trusted platform.",
  },
};

export default async function Home() {

  // Try the RPC first (keeps existing ranking behavior),
  // then fall back to direct table query if the function fails.
  const { data: rpcProperties, error } = await supabase
    .rpc("get_featured_properties")

  let properties = (rpcProperties || []).filter((property: Property) => property.is_active === true)

  if (error) {
    console.error("Error loading featured properties:", error)

    const { data: fallbackProperties, error: fallbackError } = await supabase
      .from("properties")
      .select("id,image,price,title,location,rent_period")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(6)

    if (fallbackError) {
      console.error("Fallback featured properties query failed:", fallbackError)
    } else {
      properties = fallbackProperties
    }
  }

  const { data: marketData, error: marketError } = await supabase
    .from("market_items")
    .select("id, images, title, price, location")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6)

  if (marketError) {
    console.error("Homepage market fetch error:", marketError)
  }

  const marketItems: MarketItem[] = Array.isArray(marketData) ? marketData : []

  return (
    <main className="w-full overflow-x-hidden">
      <h1 className="sr-only">CASA – verified student accommodation and campus market items near UNN</h1>

      

      <HeroSection />

      <section className="w-full max-w-[1440px] mx-auto px-4 py-6 sm:py-8 mt-2 sm:mt-4">

        <div className="flex justify-between items-center gap-3 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">
            Featured Properties
          </h2>
          <Link href="/properties">
            <span className="text-sm sm:text-base text-green-600 cursor-pointer hover:underline whitespace-nowrap">
              View all →
            </span>
          </Link>
        </div>

        {properties && properties.length > 0 ? (

          <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6 lg:gap-6 xl:gap-6 md:overflow-visible scroll-smooth justify-items-center">

            {properties.map((property: Property) => (

              <div key={property.id} className="min-w-[260px] max-w-[340px] w-[320px] flex-shrink-0 md:w-auto">
                  <PropertyCard
                  image={property.image}
                  price={property.price}
                  title={property.title}
                  location={property.location}
                  rent_period={property.rent_period}
                  id={property.id}
                />
              </div>

            ))}

          </div>

        ) : (

          <p className="text-gray-500">
            No featured listings yet.
          </p>

        )}

      </section>

      <section className="w-full max-w-6xl mx-auto px-4 pb-6 sm:pb-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">Campus Market</h2>
          <Link href="/market" className="text-green-700 font-medium hover:underline">
            View all
          </Link>
        </div>

        {marketItems.length > 0 ? (
          <div className="flex overflow-x-auto gap-4 pb-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible scroll-smooth">
            {marketItems.map((item) => {
              const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null

              return (
                <Link
                  key={item.id}
                  href={`/market/${item.id}`}
                  className="w-[200px] flex-shrink-0 lg:w-auto bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
                >
                  {imageUrl ? (
                    <div className="relative w-full h-40">
                      <Image
                        src={imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                  <div className="p-3 sm:p-4 space-y-1 flex flex-col justify-between flex-1">
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{item.title}</h3>
                    <p className="text-green-700 font-medium text-sm sm:text-base">₦{Number(item.price).toLocaleString()}</p>
                    <p className="text-gray-500 text-sm line-clamp-2">{item.location}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500">No market items yet.</p>
        )}
      </section>

    </main>
  )
}
