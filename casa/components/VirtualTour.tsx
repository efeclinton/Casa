"use client"

export default function VirtualTour({ image }: { image: string }) {

  return (

    <div className="w-full h-[500px] rounded-xl overflow-hidden border">

      <iframe
        src={image}
        width="100%"
        height="100%"
        allowFullScreen
        loading="lazy"
        className="border-0"
      />

    </div>

  )

}