import SearchBar from "./SearchBar"
import IntentButtons from "./IntentButtons"

export default function HeroSection() {
  return (
    <section
      className="relative min-h-[600px] md:min-h-[500px] flex flex-col justify-center"
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
      <div className="relative z-10 max-w-6xl mx-auto text-white text-center w-full block">
        <div className="px-4 pt-10 pb-16">

        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          Find Your Next Property
        </h1>

        <p className="text-white/90 mt-2">
          Search verified properties across Nigeria
        </p>

        <div className="w-full max-w-md mx-auto mt-6 bg-white shadow-lg rounded-xl p-4 text-black">

          <SearchBar />

          <IntentButtons />

        </div>
        </div>

      </div>
    </section>
  )
}