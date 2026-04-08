import SearchBar from "./SearchBar"
import IntentButtons from "./IntentButtons"

export default function HeroSection() {
  return (
    <section
      className="relative min-h-[600px] md:min-h-[500px] flex flex-col justify-center pb-10 md:pb-0"
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
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-white text-center w-full block">

        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          Find Your Next Property
        </h1>

        <p className="text-white/90 mt-2">
          Search verified properties across Nigeria
        </p>

        <div className="relative w-full max-w-md mx-auto bg-white shadow-lg rounded-xl p-4 text-black mt-4 md:mt-0">

          <SearchBar />

          <IntentButtons />

        </div>

      </div>
    </section>
  )
}