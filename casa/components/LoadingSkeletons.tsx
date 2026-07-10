import PropertyCardSkeleton from "./PropertyCardSkeleton"

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading listings" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function FormPageSkeleton({ maxWidth = "max-w-3xl" }: { maxWidth?: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10" aria-label="Loading form" role="status">
      <div className={`mx-auto ${maxWidth} space-y-6`}>
        <section className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-4 h-9 w-3/5" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
        </section>
        {[0, 1, 2].map((section) => (
          <section key={section} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SkeletonBlock className="h-6 w-40" />
            <div className="mt-5 space-y-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-12 w-full" />
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

export function DetailPageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <main className={`mx-auto w-full px-4 py-6 sm:py-8 ${compact ? "max-w-4xl" : "max-w-6xl"}`} aria-label="Loading details" role="status">
      <div className={`grid gap-6 ${compact ? "" : "lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"}`}>
        <div className="space-y-5">
          <SkeletonBlock className="aspect-[16/10] w-full rounded-2xl sm:aspect-[16/9]" />
          <section className="animate-pulse space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SkeletonBlock className="h-8 w-3/4" />
            <SkeletonBlock className="h-7 w-36" />
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
          </section>
        </div>
        {!compact && (
          <aside className="animate-pulse space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-5 w-3/4" />
                <SkeletonBlock className="h-4 w-1/2" />
              </div>
            </div>
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </aside>
        )}
      </div>
    </main>
  )
}

export function ProfilePageSkeleton() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:p-10" aria-label="Loading profile" role="status">
      <section className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <SkeletonBlock className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-8 w-56 max-w-full" />
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-4 w-64 max-w-full" />
          </div>
          <SkeletonBlock className="h-11 w-full sm:w-36" />
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <SkeletonBlock key={item} className="h-24 rounded-2xl" />)}
      </div>
      <PropertyGridSkeleton count={3} />
    </main>
  )
}

export function DashboardSkeleton() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8" aria-label="Loading dashboard" role="status">
      <SkeletonBlock className="mb-6 h-8 w-44" />
      <div className="mb-6 flex gap-2">
        {[0, 1, 2].map((item) => <SkeletonBlock key={item} className="h-10 w-20" />)}
      </div>
      <PropertyGridSkeleton count={6} />
      <SkeletonBlock className="mb-6 mt-10 h-8 w-36" />
      <PropertyGridSkeleton count={3} />
    </main>
  )
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:p-10" aria-label="Loading notifications" role="status">
      <SkeletonBlock className="mb-6 h-8 w-48" />
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex gap-4">
              <SkeletonBlock className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-3">
                <SkeletonBlock className="h-5 w-2/5" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-3 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

export function ListRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-label="Loading results" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-4">
            <SkeletonBlock className="h-20 w-24 flex-none rounded-xl" />
            <div className="flex-1 space-y-3">
              <SkeletonBlock className="h-5 w-2/5" />
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-4 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function UserDetailsSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading user details" role="status">
      <section className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex gap-5">
          <SkeletonBlock className="h-24 w-24 flex-none rounded-3xl" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-7 w-1/2" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-4 w-2/5" />
          </div>
        </div>
      </section>
      {[0, 1, 2].map((item) => <SkeletonBlock key={item} className="h-40 rounded-3xl" />)}
    </div>
  )
}
