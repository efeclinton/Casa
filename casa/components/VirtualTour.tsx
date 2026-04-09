"use client"

export default function VirtualTour({ image }: { image: string }) {

  return (

    <div className="w-full aspect-square md:aspect-auto md:h-[500px] rounded-xl overflow-hidden border">

      <iframe
        src={image}
        width="100%"
        height="100%"
        allowFullScreen
        loading="lazy"
        className="w-full h-full border-0"
      />

    </div>

  )

}