import { NextResponse } from "next/server"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://casa.example"
const baseUrl = siteUrl.replace(/\/$/, "")

export function GET() {
  const content = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain",
    },
  })
}
