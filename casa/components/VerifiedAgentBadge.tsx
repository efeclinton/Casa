type VerifiedAgentBadgeProps = {
  status?: string | null
  showDescription?: boolean
  className?: string
}

export default function VerifiedAgentBadge({
  status,
  showDescription = false,
  className = "",
}: VerifiedAgentBadgeProps) {
  if (status !== "verified") return null

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.57a1 1 0 0 1-1.42.003L3.29 9.72a1 1 0 1 1 1.42-1.406l3.79 3.836 6.79-6.854a1 1 0 0 1 1.414-.006Z"
            clipRule="evenodd"
          />
        </svg>
        Verified Agent
      </span>
      {showDescription && (
        <p className="text-xs font-medium text-blue-700">
          Identity confirmed by CASA
        </p>
      )}
    </div>
  )
}
