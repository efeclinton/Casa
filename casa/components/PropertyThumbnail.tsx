"use client"

import { useState } from "react"

type PropertyThumbnailProps = {
  image?: string | null
  images?: Array<string | null | undefined> | null
  alt: string
  imageClassName?: string
}

export default function PropertyThumbnail({
  image,
  images,
  alt,
  imageClassName = "h-full w-full object-cover",
}: PropertyThumbnailProps) {
  const [failedUrls, setFailedUrls] = useState<string[]>([])
  const candidates = [image, ...(images || [])]
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    .filter((url, index, urls) => urls.indexOf(url) === index)
  const activeImage = candidates.find((url) => !failedUrls.includes(url))

  if (!activeImage) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F7F7F7]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/placeholders/property-placeholder.svg"
          alt=""
          aria-hidden="true"
          className="h-[35%] w-[35%] object-contain"
        />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={activeImage}
      alt={alt}
      className={imageClassName}
      onError={() => setFailedUrls((current) => current.includes(activeImage) ? current : [...current, activeImage])}
    />
  )
}
