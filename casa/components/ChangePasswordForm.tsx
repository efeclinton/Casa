"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"
import {
  isAuthSessionError,
  isIncorrectCurrentPasswordError,
  logSafeAuthError,
} from "@/lib/authError"

type ChangePasswordFormProps = {
  user: User
}

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  visible: boolean
  autoComplete: "current-password" | "new-password"
  onChange: (value: string) => void
  onToggle: () => void
}

const loginWithProfileReturn = "/login?redirect=%2Fprofile&reason=session-expired"

type PasswordAccess = "email" | "google" | "unsupported"

const getPasswordAccess = (user: User): PasswordAccess => {
  const identities = user.identities

  if (Array.isArray(identities) && identities.length > 0) {
    const providers = identities.map((identity) => identity.provider)
    if (providers.includes("email")) return "email"
    if (providers.every((provider) => provider === "google")) return "google"
    return "unsupported"
  }

  const metadataProviders = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.filter((provider): provider is string => typeof provider === "string")
    : []
  const fallbackProviders = [user.app_metadata?.provider, ...metadataProviders]

  if (fallbackProviders.includes("email")) return "email"
  if (fallbackProviders.includes("google")) return "google"
  return "unsupported"
}

function PasswordField({
  id,
  label,
  value,
  visible,
  autoComplete,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 inline-flex min-w-16 items-center justify-center px-3 text-xs font-semibold text-slate-600 hover:text-emerald-700"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  )
}

export default function ChangePasswordForm({ user }: ChangePasswordFormProps) {
  const router = useRouter()
  const [currentPasswordInput, setCurrentPasswordInput] = useState("")
  const [newPasswordInput, setNewPasswordInput] = useState("")
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordAccess, setPasswordAccess] = useState<PasswordAccess>(() => getPasswordAccess(user))
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const clearFeedback = () => {
    setErrorMessage("")
    setSuccessMessage("")
  }

  const clearPasswordFields = () => {
    setCurrentPasswordInput("")
    setNewPasswordInput("")
    setConfirmPasswordInput("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return

    clearFeedback()

    const currentPassword = currentPasswordInput
    const newPassword = newPasswordInput
    const confirmPassword = confirmPasswordInput

    if (!currentPassword) {
      setErrorMessage("Enter your current password.")
      return
    }

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

    if (newPassword === currentPassword) {
      setErrorMessage("Choose a password different from your current password.")
      return
    }

    setSaving(true)

    try {
      const {
        data: { user: authenticatedUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        logSafeAuthError("Password change authentication check failed", userError)

        if (isAuthSessionError(userError)) {
          router.push(loginWithProfileReturn)
          return
        }

        setErrorMessage("We could not change your password. Please try again.")
        return
      }

      if (!authenticatedUser) {
        router.push(loginWithProfileReturn)
        return
      }

      const currentPasswordAccess = getPasswordAccess(authenticatedUser)
      if (currentPasswordAccess !== "email") {
        clearPasswordFields()
        setPasswordAccess(currentPasswordAccess)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        current_password: currentPassword,
        password: newPassword,
      })

      if (updateError) {
        logSafeAuthError("Password update failed", updateError)

        if (isAuthSessionError(updateError)) {
          router.push(loginWithProfileReturn)
          return
        }

        setErrorMessage(
          isIncorrectCurrentPasswordError(updateError)
            ? "The current password is incorrect."
            : "We could not change your password. Please try again.",
        )
        return
      }

      clearPasswordFields()
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setSuccessMessage("Your password has been changed successfully.")
    } catch (error: unknown) {
      logSafeAuthError("Unexpected password change failure", error)
      setErrorMessage("We could not change your password. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="Security" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Security</p>
      <h2 className="mt-2 text-xl font-semibold">Change Password</h2>
      <p className="mt-1 text-sm text-slate-500">Update the password you use to sign in to CASA.</p>

      {passwordAccess !== "email" ? (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {passwordAccess === "google"
            ? "You signed in with Google. Your password is managed through your Google account."
            : "This account does not use an email/password sign-in. Manage your password through your sign-in provider."}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <PasswordField
            id="current-password"
            label="Current password"
            value={currentPasswordInput}
            visible={showCurrentPassword}
            autoComplete="current-password"
            onChange={(value) => {
              setCurrentPasswordInput(value)
              clearFeedback()
            }}
            onToggle={() => setShowCurrentPassword((visible) => !visible)}
          />
          <PasswordField
            id="new-password"
            label="New password"
            value={newPasswordInput}
            visible={showNewPassword}
            autoComplete="new-password"
            onChange={(value) => {
              setNewPasswordInput(value)
              clearFeedback()
            }}
            onToggle={() => setShowNewPassword((visible) => !visible)}
          />
          <PasswordField
            id="confirm-new-password"
            label="Confirm new password"
            value={confirmPasswordInput}
            visible={showConfirmPassword}
            autoComplete="new-password"
            onChange={(value) => {
              setConfirmPasswordInput(value)
              clearFeedback()
            }}
            onToggle={() => setShowConfirmPassword((visible) => !visible)}
          />

          {errorMessage && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {saving ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      )}
    </section>
  )
}
