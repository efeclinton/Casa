"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"
import { isAuthNetworkError, isAuthSessionError, logSafeAuthError } from "@/lib/authError"

const hasRecoveryAuthenticationMethod = (authenticationMethods: unknown) => {
  if (!Array.isArray(authenticationMethods)) return false

  return authenticationMethods.some((authenticationMethod) => {
    if (authenticationMethod === "recovery") return true
    if (!authenticationMethod || typeof authenticationMethod !== "object") return false
    return "method" in authenticationMethod && authenticationMethod.method === "recovery"
  })
}

const hasRecoveryUrlError = () => {
  const url = new URL(window.location.href)
  const hashParameters = new URLSearchParams(url.hash.replace(/^#/, ""))

  return [url.searchParams, hashParameters].some(
    (parameters) =>
      parameters.has("error") ||
      parameters.has("error_code") ||
      parameters.has("error_description"),
  )
}

const verifyRecoverySession = async (session?: Session | null) => {
  let currentSession = session

  if (!currentSession) {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) {
      return { valid: false as const, error }
    }
    currentSession = data.session
  }

  const { data, error } = await supabase.auth.getClaims(currentSession.access_token)
  if (error || !data) {
    return { valid: false as const, error }
  }

  const valid =
    data.claims.sub === currentSession.user.id &&
    hasRecoveryAuthenticationMethod(data.claims.amr)

  return { valid, error: null }
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [newPasswordInput, setNewPasswordInput] = useState("")
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [returningToLogin, setReturningToLogin] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [sessionErrorMessage, setSessionErrorMessage] = useState("")
  const [resetSucceeded, setResetSucceeded] = useState(false)
  const [recoverySessionSignedOut, setRecoverySessionSignedOut] = useState(false)

  useEffect(() => {
    let active = true
    let latestValidation = 0

    const confirmRecoverySession = async (session?: Session | null) => {
      const validation = ++latestValidation

      if (hasRecoveryUrlError()) {
        if (active && validation === latestValidation) {
          setHasRecoverySession(false)
          setSessionErrorMessage("")
          setCheckingSession(false)
        }
        return
      }

      const result = await verifyRecoverySession(session)

      if (!active || validation !== latestValidation) return

      if (result.error) {
        logSafeAuthError("Password recovery session verification failed", result.error)
      }

      setHasRecoverySession(result.valid)
      setSessionErrorMessage(
        result.error && isAuthNetworkError(result.error)
          ? "We could not confirm this password-reset link. Please check your connection and try again."
          : "",
      )
      setCheckingSession(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return

      if (event === "PASSWORD_RECOVERY" && session) {
        void confirmRecoverySession(session)
        return
      }

      if (event === "SIGNED_OUT") {
        setHasRecoverySession(false)
        setCheckingSession(false)
      }
    })

    void confirmRecoverySession()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const clearFeedback = () => {
    setErrorMessage("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !hasRecoverySession) return

    clearFeedback()

    const newPassword = newPasswordInput
    const confirmPassword = confirmPasswordInput

    if (!newPassword) {
      setErrorMessage("Enter a new password.")
      return
    }

    if (!confirmPassword) {
      setErrorMessage("Confirm your new password.")
      return
    }

    if (newPassword.length < 8) {
      setErrorMessage("Your new password must contain at least 8 characters.")
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("The new passwords do not match.")
      return
    }

    setSubmitting(true)

    try {
      const recoveryVerification = await verifyRecoverySession()

      if (!recoveryVerification.valid) {
        if (recoveryVerification.error) {
          logSafeAuthError(
            "Password recovery submit authentication check failed",
            recoveryVerification.error,
          )
        }
        setHasRecoverySession(false)
        setSessionErrorMessage(
          recoveryVerification.error && isAuthNetworkError(recoveryVerification.error)
            ? "We could not complete this request. Please try again."
            : "This password-reset link is invalid or has expired.",
        )
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        logSafeAuthError("Recovered password update failed", error)

        if (isAuthSessionError(error)) {
          setHasRecoverySession(false)
          setSessionErrorMessage("This password-reset link is invalid or has expired.")
          return
        }

        setErrorMessage("We could not complete this request. Please try again.")
        return
      }

      setNewPasswordInput("")
      setConfirmPasswordInput("")
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      window.history.replaceState(window.history.state, "", "/update-password")

      try {
        const { error: signOutError } = await supabase.auth.signOut({ scope: "local" })
        if (signOutError) {
          logSafeAuthError("Recovery session sign out after reset failed", signOutError)
          setErrorMessage(
            "Your password was reset, but we could not end the recovery session. Return to login to try again.",
          )
        } else {
          setRecoverySessionSignedOut(true)
        }
      } catch (signOutError: unknown) {
        logSafeAuthError("Unexpected recovery session sign out after reset failure", signOutError)
        setErrorMessage(
          "Your password was reset, but we could not end the recovery session. Return to login to try again.",
        )
      }

      setResetSucceeded(true)
    } catch (error: unknown) {
      logSafeAuthError("Unexpected recovered password update failure", error)
      setErrorMessage("We could not complete this request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReturnToLogin = async () => {
    if (returningToLogin) return

    setReturningToLogin(true)
    setErrorMessage("")

    try {
      if (recoverySessionSignedOut) {
        router.replace("/login")
        return
      }

      const { error } = await supabase.auth.signOut({ scope: "local" })

      if (error) {
        logSafeAuthError("Recovery session sign out failed", error)
        setErrorMessage("We could not complete this request. Please try again.")
        return
      }

      setRecoverySessionSignedOut(true)
      router.replace("/login")
    } catch (error: unknown) {
      logSafeAuthError("Unexpected recovery session sign out failure", error)
      setErrorMessage("We could not complete this request. Please try again.")
    } finally {
      setReturningToLogin(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-950">
          Casa
        </Link>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-8">
          {checkingSession ? (
            <div role="status" className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <span
                aria-hidden="true"
                className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600"
              />
              <p className="text-sm text-slate-600">Confirming your password-reset link...</p>
            </div>
          ) : resetSucceeded ? (
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Password reset complete</h1>
              <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Your password has been reset successfully.
              </p>

              {errorMessage && (
                <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleReturnToLogin}
                disabled={returningToLogin}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {returningToLogin && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                )}
                {returningToLogin ? "Returning..." : "Return to Login"}
              </button>
            </div>
          ) : !hasRecoverySession ? (
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {sessionErrorMessage || "This password-reset link is invalid or has expired."}
              </p>
              <Link
                href="/forgot-password"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Enter a new password for your CASA account.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label htmlFor="recovery-new-password" className="block text-sm font-semibold text-slate-700">
                    New password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="recovery-new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPasswordInput}
                      onChange={(event) => {
                        setNewPasswordInput(event.target.value)
                        clearFeedback()
                      }}
                      autoComplete="new-password"
                      required
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((visible) => !visible)}
                      aria-label={`${showNewPassword ? "Hide" : "Show"} new password`}
                      aria-pressed={showNewPassword}
                      className="absolute inset-y-0 right-0 inline-flex min-w-16 items-center justify-center px-3 text-xs font-semibold text-slate-600 hover:text-emerald-700"
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="recovery-confirm-password" className="block text-sm font-semibold text-slate-700">
                    Confirm new password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="recovery-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPasswordInput}
                      onChange={(event) => {
                        setConfirmPasswordInput(event.target.value)
                        clearFeedback()
                      }}
                      autoComplete="new-password"
                      required
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      aria-label={`${showConfirmPassword ? "Hide" : "Show"} password confirmation`}
                      aria-pressed={showConfirmPassword}
                      className="absolute inset-y-0 right-0 inline-flex min-w-16 items-center justify-center px-3 text-xs font-semibold text-slate-600 hover:text-emerald-700"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                  )}
                  {submitting ? "Resetting Password..." : "Reset Password"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
