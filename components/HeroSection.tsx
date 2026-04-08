import SearchBar from "./SearchBar"
import IntentButtons from "./IntentButtons"

export default function HeroSection() {
  return (
    <section
      className="relative h-[520px] flex items-center"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-white text-center">

        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          Find Your Next Property
        </h1>

        <p className="text-white/90 mt-2">
          Search verified properties across Nigeria
        </p>

        <div className="bg-white shadow-lg rounded-xl p-4 text-black max-w-xl mx-auto mt-6">

          <SearchBar />

          <IntentButtons />

        </div>

      </div>
    </section>
  )
}