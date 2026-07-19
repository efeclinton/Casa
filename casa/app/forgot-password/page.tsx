"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { isAuthNetworkError, isAuthRateLimitError, logSafeAuthError } from "@/lib/authError"

const neutralSuccessMessage = "If an account exists for that email, a password-reset link has been sent."

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export default function ForgotPasswordPage() {
  const [emailInput, setEmailInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setErrorMessage("")
    setSuccessMessage("")

    const email = emailInput.trim()

    if (!email) {
      setErrorMessage("Enter your email address.")
      return
    }

    if (!isValidEmail(email)) {
      setErrorMessage("Enter a valid email address.")
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) {
        logSafeAuthError("Password reset email request failed", error)

        if (isAuthNetworkError(error) || isAuthRateLimitError(error)) {
          setErrorMessage("We could not complete this request. Please try again.")
          return
        }
      }

      setEmailInput("")
      setSuccessMessage(neutralSuccessMessage)
    } catch (error: unknown) {
      logSafeAuthError("Unexpected password reset email failure", error)
      setErrorMessage("We could not complete this request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-950">
          Casa
        </Link>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter your CASA account email and we’ll send you a secure password-reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                value={emailInput}
                onChange={(event) => {
                  setEmailInput(event.target.value)
                  setErrorMessage("")
                  setSuccessMessage("")
                }}
                autoComplete="email"
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                {successMessage}
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
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <Link href="/login" className="mt-5 inline-flex text-sm font-semibold text-emerald-700 hover:underline">
            Back to Login
          </Link>
        </section>
      </div>
    </main>
  )
}
