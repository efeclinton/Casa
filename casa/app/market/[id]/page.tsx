import type { Metadata } from "next"
import MarketItemDetailClient from "./MarketItemDetailClient"
import { supabase } from "@/lib/supabaseClient"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://casa.example"
const baseUrl = siteUrl.replace(/\/$/, "")

async function getMarketItemData(id: string) {
  const { data, error } = await supabase
    .from("market_items")
    .select("id,title,description,price,location,images")
    .eq("id", id)
    .single()

  if (error || !data) return null
  return data
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getMarketItemData(params.id)

  if (!item) {
    return {
      title: "Item not found | CASA",
      description: "The requested market item could not be found.",
    }
  }

  const description =
    item.description ||
    `Verified campus market item available at ${item.location || "UNN"} for ₦${item.price.toLocaleString()}.`

  const imageUrl = Array.isArray(item.images) && item.images.length > 0
    ? item.images[0]
    : "/favicon-v2.png"

  const resolvedImage = (() => {
    try {
      return new URL(imageUrl, baseUrl).toString()
    } catch {
      return imageUrl
    }
  })()

  return {
    title: `${item.title} | ₦${item.price.toLocaleString()} | CASA`,
    description,
    openGraph: {
      title: `${item.title} | ₦${item.price.toLocaleString()} | CASA`,
      description,
      url: `${baseUrl}/market/${item.id}`,
      images: [resolvedImage],
      type: "website",
      siteName: "CASA",
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.title} | ₦${item.price.toLocaleString()} | CASA`,
      description,
      images: [resolvedImage],
    },
    alternates: {
      canonical: `${baseUrl}/market/${item.id}`,
    },
  }
}

export default function MarketItemPage({ params }: { params: { id: string } }) {
  return <MarketItemDetailClient itemId={params.id} />
}
