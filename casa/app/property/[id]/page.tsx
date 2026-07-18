import type { Metadata } from "next"
import PropertyDetailClient from "./PropertyDetailClient"
import { supabase } from "@/lib/supabaseClient"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://casa.example"
const baseUrl = siteUrl.replace(/\/$/, "")

type PropertyPageParams = {
  params: Promise<{ id: string }>
}

async function getPropertyData(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null
  return data
}

export async function generateMetadata({ params }: PropertyPageParams): Promise<Metadata> {
  const { id } = await params
  const property = await getPropertyData(id)

  if (!property) {
    return {
      title: "Property not found | CASA",
      description: "The requested property listing could not be found.",
    }
  }

  const priceText = `NGN ${property.price.toLocaleString()} ${property.rent_period || "per month"}`
  const locationText = property.location || "UNN"
  const description = property.description
    ? `${priceText} in ${locationText}. ${property.description}`
    : `Verified accommodation for ${priceText} in ${locationText}.`

  const galleryImages = Array.isArray(property.images)
    ? property.images.filter((image: unknown): image is string => typeof image === "string" && image.trim().length > 0)
    : []
  const imageUrl = typeof property.image === "string" && property.image.trim().length > 0
    ? property.image
    : galleryImages[0] || "/placeholders/property-placeholder.svg"

  const resolvedImage = (() => {
    try {
      return new URL(imageUrl, baseUrl).toString()
    } catch {
      return imageUrl
    }
  })()

  return {
    title: `${property.title} | CASA`,
    description,
    openGraph: {
      title: `${property.title} | CASA`,
      description,
      url: `${baseUrl}/property/${property.id}`,
      images: [resolvedImage],
      type: "website",
      siteName: "CASA",
    },
    twitter: {
      card: "summary_large_image",
      title: `${property.title} | CASA`,
      description,
      images: [resolvedImage],
    },
    alternates: {
      canonical: `${baseUrl}/property/${property.id}`,
    },
  }
}

export default async function PropertyPage({ params }: PropertyPageParams) {
  const { id } = await params
  const property = await getPropertyData(id)

  return <PropertyDetailClient propertyId={id} initialProperty={property} />
}
