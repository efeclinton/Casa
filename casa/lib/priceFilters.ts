export type PriceFilterValues = {
  minPrice?: number
  maxPrice?: number
}

export type PriceFilterValidation =
  | { valid: true; values: PriceFilterValues }
  | { valid: false; message: string }

const decimalNumberPattern = /^\+?(?:\d+(?:\.\d*)?|\.\d+)$/

const parseOptionalPrice = (
  value: string | undefined,
  label: "minimum" | "maximum"
): { valid: true; value?: number } | { valid: false; message: string } => {
  const normalized = value?.trim() || ""

  if (!normalized) return { valid: true }

  if (!decimalNumberPattern.test(normalized)) {
    return { valid: false, message: `Enter a valid ${label} price of zero or greater.` }
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { valid: false, message: `Enter a valid ${label} price of zero or greater.` }
  }

  return { valid: true, value: parsed }
}

export const validateOptionalPriceFilters = (
  minPrice?: string,
  maxPrice?: string
): PriceFilterValidation => {
  const minimum = parseOptionalPrice(minPrice, "minimum")
  if (!minimum.valid) return minimum

  const maximum = parseOptionalPrice(maxPrice, "maximum")
  if (!maximum.valid) return maximum

  if (
    minimum.value !== undefined &&
    maximum.value !== undefined &&
    minimum.value > maximum.value
  ) {
    return { valid: false, message: "Minimum price cannot be greater than maximum price." }
  }

  return {
    valid: true,
    values: {
      minPrice: minimum.value,
      maxPrice: maximum.value,
    },
  }
}
