export type InquiryActivity = {
  headline: string
  description: string
  isHighInterest: boolean
}

export function formatUpdatedAtLabel(timestamp?: string | null) {
  if (!timestamp) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 1) return "Updated just now"
  if (minutes < 60) return "Updated today"

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return "Updated today"

  const days = Math.floor(hours / 24)
  if (days === 1) return "Updated yesterday"
  if (days < 7) return `Updated ${days} days ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `Updated ${weeks} week${weeks === 1 ? "" : "s"} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `Updated ${months} month${months === 1 ? "" : "s"} ago`

  const years = Math.floor(days / 365)
  return `Updated ${years} year${years === 1 ? "" : "s"} ago`
}

export function formatUpdatedAtFullDate(timestamp?: string | null) {
  if (!timestamp) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export function getInquiryActivity(inquiryCount: number): InquiryActivity | null {
  if (!inquiryCount || inquiryCount <= 0) return null

  if (inquiryCount <= 5) {
    return {
      headline: "Recently receiving inquiries",
      description: "A few people have shown interest in this accommodation recently.",
      isHighInterest: false,
    }
  }

  if (inquiryCount <= 15) {
    return {
      headline: `${inquiryCount} people have inquired about this accommodation`,
      description: "The landlord is seeing steady demand for this listing.",
      isHighInterest: false,
    }
  }

  return {
    headline: "High interest property",
    description: `${inquiryCount} people have contacted the landlord recently`,
    isHighInterest: true,
  }
}
