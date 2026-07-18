import type { Metadata } from "next"
import HeroSection from "../components/HeroSection"
import MarketItemCard from "../components/MarketItemCard"
import PropertyCard from "../components/PropertyCard"
import Link from "next/link"
import { supabase } from "../lib/supabaseClient"
import { getListingAgentId, loadVerificationStatuses } from "../lib/verification"
import FeaturedPropertiesCarousel from "../components/FeaturedPropertiesCarousel"

type Property = {
  id: string
  image?: string
  images?: string[] | null
  price: number
  title: string
  location: string
  rent_period: string
  is_active?: boolean
  updated_at?: string | null
  inquiry_count?: number | null
  agent_id?: string | null
  owner_id?: string | null
}

type MarketItem = {
  id: string
  images?: string[]
  title: string
  price: number
  location?: string
  is_active?: boolean | null
  updated_at?: string | null
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
}

export default async function Home() {
  // Try the RPC first (keeps existing ranking behavior),
  // then fall back to direct table query if the function fails.
  const { data: rpcProperties, error } = await supabase
    .rpc("get_featured_properties")

  let properties = (rpcProperties || [])
    .filter((property: Property) => property.is_active === true)
    .sort((a: Property, b: Property) =>
      new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    )

  if (error) {
    console.error("Error loading featured properties:", error)

    const { data: fallbackProperties, error: fallbackError } = await supabase
      .from("properties")
      .select("id,image,images,price,title,location,rent_period,is_active,updated_at,inquiry_count,agent_id,owner_id")
      .eq("is_active", true)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(6)

    if (fallbackError) {
      console.error("Fallback featured properties query failed:", fallbackError)
    } else {
      properties = (fallbackProperties || []).filter((property: Property) => property.is_active === true)
    }
  }

  const verificationStatuses = await loadVerificationStatuses(properties || [])

  const { data: marketData, error: marketError } = await supabase
    .from("market_items")
    .select("id, images, title, price, location, is_active, updated_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6)

  if (marketError) {
    console.error("Homepage market fetch error:", marketError)
  }

  const marketItems: MarketItem[] = Array.isArray(marketData) ? marketData : []

  return (
    <main className="w-full overflow-x-hidden">
      <h1 className="sr-only">CASA - verified student accommodation and campus market items near UNN</h1>

      <HeroSection />

      <section className="mx-auto mt-2 w-full max-w-[1440px] px-4 py-6 sm:mt-4 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <h2 className="text-lg font-semibold sm:text-xl lg:text-2xl">
            Featured Properties
          </h2>
          <Link href="/properties">
            <span className="cursor-pointer whitespace-nowrap text-sm text-green-600 hover:underline sm:text-base">
              View all
            </span>
          </Link>
        </div>

        {properties && properties.length > 0 ? (
          <FeaturedPropertiesCarousel>
            {properties.map((property: Property) => (
              <div key={property.id} className="w-[320px] min-w-[260px] max-w-[340px] flex-shrink-0 md:w-auto">
                <PropertyCard
                  image={property.image}
                  images={property.images}
                  price={property.price}
                  title={property.title}
                  location={property.location}
                  rent_period={property.rent_period}
                  updatedAt={property.updated_at}
                  inquiryCount={property.inquiry_count ?? 0}
                  agentVerificationStatus={verificationStatuses[getListingAgentId(property) || ""]}
                  isActive={property.is_active}
                  id={property.id}
                />
              </div>
            ))}
          </FeaturedPropertiesCarousel>
        ) : (
          <p className="text-gray-500">
            No featured listings yet.
          </p>
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6 sm:pb-8">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <h2 className="text-lg font-semibold sm:text-xl lg:text-2xl">Campus Market</h2>
          <Link href="/market" className="font-medium text-green-700 hover:underline">
            View all
          </Link>
        </div>

        {marketItems.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scroll-smooth pb-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
            {marketItems.map((item) => {
              const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null

              return (
                <MarketItemCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  location={item.location}
                  image={imageUrl}
                  updatedAt={item.updated_at}
                  isActive={item.is_active}
                  className="w-[320px] min-w-[260px] max-w-[340px] flex-shrink-0 lg:w-auto"
                />
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
