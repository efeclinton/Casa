"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

export default function FeaturedPropertiesCarousel({ children }: { children: ReactNode }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrowState = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const maxScrollLeft = container.scrollWidth - container.clientWidth
    setCanScrollLeft(container.scrollLeft > 1)
    setCanScrollRight(container.scrollLeft < maxScrollLeft - 1)
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateArrowState()

    const resizeObserver = new ResizeObserver(updateArrowState)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [children, updateArrowState])

  const scrollByCard = (direction: "left" | "right") => {
    const container = scrollContainerRef.current
    const firstCard = container?.firstElementChild
    if (!container || !firstCard) return

    const cardWidth = firstCard.getBoundingClientRect().width
    const gap = Number.parseFloat(window.getComputedStyle(container).columnGap) || 0
    const distance = cardWidth + gap

    container.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByCard("left")}
          aria-label="Scroll featured properties left"
          className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-emerald-100 bg-white/90 text-emerald-700 shadow-md backdrop-blur-sm transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:left-2 sm:h-10 sm:w-10"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 sm:h-5 sm:w-5">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByCard("right")}
          aria-label="Scroll featured properties right"
          className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-emerald-100 bg-white/90 text-emerald-700 shadow-md backdrop-blur-sm transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:right-2 sm:h-10 sm:w-10"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 sm:h-5 sm:w-5">
            <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={updateArrowState}
        className="scrollbar-none flex gap-4 overflow-x-auto scroll-smooth pb-4 md:gap-6"
      >
        {children}
      </div>
    </div>
  )
}
