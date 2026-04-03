export function getListingScore(property: any) {

  let score = 0

  /* ---------------- QUALITY SIGNALS ---------------- */

  // Virtual tour
  if (property.tour_images?.length > 0) {
    score += 40
  }

  // Images
  const imageCount = property.images?.length || 0

  if (imageCount >= 10) score += 30
  else if (imageCount >= 6) score += 20
  else if (imageCount >= 3) score += 10

  // Video
  if (property.videos?.length > 0) {
    score += 20
  }

  // Description quality
  const descLength = property.description?.length || 0

  if (descLength > 300) score += 20
  else if (descLength > 120) score += 10

  // Title quality
  if (property.title?.length > 20) {
    score += 5
  }

  /* ---------------- FRESHNESS ---------------- */

  if (property.created_at) {

    const daysOld =
      (Date.now() - new Date(property.created_at).getTime())
      / (1000 * 60 * 60 * 24)

    if (daysOld <= 3) score += 25
    else if (daysOld <= 7) score += 15
    else if (daysOld <= 14) score += 5

  }

  /* ---------------- ENGAGEMENT ---------------- */

  // Page clicks
  if (property.views) {
    score += Math.min(property.views * 0.5, 20)
  }

  // WhatsApp messages sent
  if (property.messages) {
    score += property.messages * 5
  }

  // Time spent on listing
  if (property.avg_time_on_page) {
    score += Math.min(property.avg_time_on_page / 10, 15)
  }

  return score

}