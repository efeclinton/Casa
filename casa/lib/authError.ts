type SafeAuthError = {
  code?: string
  message?: string
  name?: string
  status?: number
}

export const getSafeAuthError = (error: unknown): SafeAuthError => {
  if (!error || typeof error !== "object") return {}
  return error as SafeAuthError
}

export const logSafeAuthError = (operation: string, error: unknown) => {
  const safeError = getSafeAuthError(error)

  console.error(operation, {
    code: safeError.code || "unknown",
    message: safeError.message || "Unknown authentication error",
    status: safeError.status || "unknown",
  })
}

export const isAuthNetworkError = (error: unknown) => {
  const safeError = getSafeAuthError(error)
  const errorText = `${safeError.name || ""} ${safeError.message || ""}`.toLowerCase()
  return errorText.includes("fetch") || errorText.includes("network") || errorText.includes("retryable")
}

export const isAuthSessionError = (error: unknown) => {
  const safeError = getSafeAuthError(error)
  return (
    safeError.status === 401 ||
    safeError.code === "session_not_found" ||
    safeError.code === "session_expired" ||
    safeError.code === "jwt_expired"
  )
}

export const isIncorrectCurrentPasswordError = (error: unknown) => {
  const safeError = getSafeAuthError(error)
  return safeError.code === "reauthentication_not_valid" || safeError.code === "invalid_credentials"
}

export const isAuthRateLimitError = (error: unknown) => {
  const safeError = getSafeAuthError(error)
  return (
    safeError.status === 429 ||
    safeError.code === "over_request_rate_limit" ||
    safeError.code === "over_email_send_rate_limit"
  )
}
