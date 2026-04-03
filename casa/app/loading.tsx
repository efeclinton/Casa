import PropertyCardSkeleton from "../components/PropertyCardSkeleton"

export default function Loading() {
  return (
    <main>

      

      <section className="p-10">

        <h2 className="text-2xl font-semibold mb-6">
          Featured Properties
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {Array.from({ length: 6 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}

        </div>

      </section>

    </main>
  )
}