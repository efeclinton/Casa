import type { Metadata } from "next"
import PropertyDetailClient from "./PropertyDetailClient"
import { supabase } from "@/lib/supabaseClient"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://casa.example"
const baseUrl = siteUrl.replace(/\/$/, "")

async function getPropertyData(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("id,title,price,rent_period,location,image,images,description,is_active")
    .eq("id", id)
    .single()

  if (error || !data) return null
  return data
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const property = await getPropertyData(params.id)

  if (!property) {
    return {
      title: "Property not found | CASA",
      description: "The requested property listing could not be found.",
    }
  }

  const description =
    property.description ||
    `Verified accommodation at ${property.location || "UNN"} for ₦${property.price.toLocaleString()} ${property.rent_period || "per month"}.`

  const imageUrl = Array.isArray(property.images) && property.images.length > 0
    ? property.images[0]
    : property.image || "/favicon-v2.png"

  const resolvedImage = (() => {
    try {
      return new URL(imageUrl, baseUrl).toString()
    } catch {
      return imageUrl
    }
  })()

  return {
    title: `${property.title} | ₦${property.price.toLocaleString()} | CASA`,
    description,
    openGraph: {
      title: `${property.title} | ₦${property.price.toLocaleString()} | CASA`,
      description,
      url: `${baseUrl}/property/${property.id}`,
      images: [resolvedImage],
      type: "website",
      siteName: "CASA",
    },
    twitter: {
      card: "summary_large_image",
      title: `${property.title} | ₦${property.price.toLocaleString()} | CASA`,
      description,
      images: [resolvedImage],
    },
    alternates: {
      canonical: `${baseUrl}/property/${property.id}`,
    },
  }
}

export default function PropertyPage({ params }: { params: { id: string } }) {
  return <PropertyDetailClient propertyId={params.id} />
}
