import SearchBar from "./SearchBar"
import IntentButtons from "./IntentButtons"

const SHOW_INTENT_BUTTONS = false

export default function HeroSection() {
  return (
    <section
      className="relative min-h-[520px] sm:min-h-[560px] lg:min-h-[500px] flex flex-col justify-center"
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
      <div className="relative z-10 w-full max-w-6xl mx-auto text-white text-center">
        <div className="px-4 pt-10 pb-12 sm:pb-16">

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
          Find Your Next Property
        </h1>

        <p className="text-sm sm:text-base text-white/90 mt-2">
          Search Verified Accommodations Across UNN
        </p>

        <div className="w-full max-w-md mx-auto mt-6 bg-white shadow-lg rounded-xl p-4 sm:p-5 text-black">

          <SearchBar />

          {SHOW_INTENT_BUTTONS && (
            <IntentButtons />
          )}

        </div>
        </div>

      </div>
    </section>
  )
}
