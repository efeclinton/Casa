const ALLOWED_LISTING_TYPES = ["rent", "sale", "campus"] as const
const ALLOWED_TOUR_DOMAINS = ["momento360.com", "panoraven.com", "kuula.co"]

type ListingType = (typeof ALLOWED_LISTING_TYPES)[number]

type PropertyFormInput = {
  title: string
  price: string
  location: string
  phone: string
  rentPeriod: string
  listingType: string
  school: string
  description: string
  tourLinks: string[]
}

type ValidatedPropertyForm = {
  title: string
  price: number
  location: string
  phone: string
  rentPeriod: string | null
  listingType: ListingType
  school: string | null
  description: string
  tourLinks: string[]
}

type ValidationResult =
  | { valid: true; values: ValidatedPropertyForm }
  | { valid: false; message: string }

export function validateVirtualTourLinks(links: string[]) {
  const trimmedLinks = links.map((link) => link.trim()).filter(Boolean)

  for (const link of trimmedLinks) {
    let parsedUrl: URL

    try {
      parsedUrl = new URL(link)
    } catch {
      return { valid: false as const, message: "Enter a valid Panoraven, Momento360, or Kuula tour URL." }
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return { valid: false as const, message: "Tour links must use HTTP or HTTPS." }
    }

    const hostname = parsedUrl.hostname.toLowerCase()
    const isAllowedHostname = ALLOWED_TOUR_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )

    if (!isAllowedHostname) {
      return { valid: false as const, message: "Tour links must come from Panoraven, Momento360, or Kuula." }
    }
  }

  return { valid: true as const, links: trimmedLinks }
}

export function validatePropertyForm(input: PropertyFormInput): ValidationResult {
  const title = input.title.trim()
  const priceText = input.price.trim()
  const location = input.location.trim()
  const phone = input.phone.trim()
  const rentPeriod = input.rentPeriod.trim()
  const school = input.school.trim()
  const description = input.description.trim()

  if (!title) {
    return { valid: false, message: "Property title is required." }
  }

  if (Array.from(title.replace(/\s/g, "")).length < 3) {
    return { valid: false, message: "Property title must contain at least 3 visible characters." }
  }

  const numericPrice = Number(priceText)
  if (!priceText || !Number.isFinite(numericPrice) || numericPrice <= 0) {
    return { valid: false, message: "Price must be a valid number greater than zero." }
  }

  if (!location) {
    return { valid: false, message: "Property location is required." }
  }

  if (!ALLOWED_LISTING_TYPES.includes(input.listingType as ListingType)) {
    return { valid: false, message: "Listing type must be Rent, Sale, or Campus." }
  }

  if (!phone) {
    return { valid: false, message: "Phone/contact number is required." }
  }

  const phoneDigits = phone.replace(/\D/g, "")
  if (phoneDigits.length < 11) {
    return { valid: false, message: "Enter a valid phone number with at least 11 digits." }
  }

  if (!description) {
    return { valid: false, message: "Property description is required." }
  }

  const listingType = input.listingType as ListingType
  if (listingType === "rent" && !rentPeriod) {
    return { valid: false, message: "Rent period is required for Rent listings." }
  }

  if (listingType === "campus" && !rentPeriod) {
    return { valid: false, message: "Rent period is required for Campus Stay listings." }
  }

  if (listingType === "campus" && !school) {
    return { valid: false, message: "School is required for Campus Stay listings." }
  }

  const tourValidation = validateVirtualTourLinks(input.tourLinks)
  if (!tourValidation.valid) {
    return { valid: false, message: tourValidation.message }
  }

  return {
    valid: true,
    values: {
      title,
      price: numericPrice,
      location,
      phone,
      rentPeriod: listingType === "sale" ? null : rentPeriod,
      listingType,
      school: listingType === "campus" ? school : null,
      description,
      tourLinks: tourValidation.links,
    },
  }
}
