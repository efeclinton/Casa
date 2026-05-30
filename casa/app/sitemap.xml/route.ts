import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://casa.example"
const baseUrl = siteUrl.replace(/\/$/, "")

export async function GET() {
  const [propertiesResponse, marketResponse] = await Promise.all([
    supabase
      .from("properties")
      .select("id")
      .eq("is_active", true)
      .order("updated_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("market_items")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ])

  const properties = propertiesResponse.data || []
  const marketItems = marketResponse.data || []

  const urls = [
    `${baseUrl}/`,
    `${baseUrl}/properties`,
    `${baseUrl}/market`,
    `${baseUrl}/search`,
    `${baseUrl}/campus`,
  ]

  const propertyUrls = properties.map((property: { id: string }) => `${baseUrl}/property/${property.id}`)
  const marketUrls = marketItems.map((item: { id: string }) => `${baseUrl}/market/${item.id}`)

  const allUrls = [...urls, ...propertyUrls, ...marketUrls]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls
    .map(
      (url) =>
        `  <url>\n    <loc>${url}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
    )
    .join("\n")}\n</urlset>`

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  })
}
