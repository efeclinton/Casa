"use client"

import { useState } from "react"

type MarketItemImageProps = {
  image?: string | null
  alt: string
  className?: string
}

export default function MarketItemImage({ image, alt, className = "" }: MarketItemImageProps) {
  const imageUrl = typeof image === "string" ? image.trim() : ""

  return <MarketItemImageContent key={imageUrl} imageUrl={imageUrl} alt={alt} className={className} />
}

type MarketItemImageContentProps = {
  imageUrl: string
  alt: string
  className: string
}

function MarketItemImageContent({ imageUrl, alt, className }: MarketItemImageContentProps) {
  const [imageFailed, setImageFailed] = useState(false)

  if (!imageUrl || imageFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100">
        <img
          src="/placeholders/property-placeholder.svg"
          alt=""
          aria-hidden="true"
          className="h-16 w-16 object-contain opacity-60"
        />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setImageFailed(true)}
    />
  )
}
