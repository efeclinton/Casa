import { PropertyGridSkeleton } from "../components/LoadingSkeletons"

export default function Loading() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:p-10">
        <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <PropertyGridSkeleton />
      </section>
    </main>
  )
}
