import Link from "next/link"

export default function BecomeAgentPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">CASA Agent Network</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Agent applications are currently referral-only.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          CASA is onboarding agents through trusted referrals for now.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Back to Home
        </Link>
      </section>
    </main>
  )
}
