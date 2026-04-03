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
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-white text-center">

        <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
          Find Your Next Property
        </h1>

        <p className="mb-8 text-lg text-white/90 drop-shadow-md">
          Search verified properties across Nigeria
        </p>

        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl text-black max-w-xl mx-auto">

          <SearchBar />

          <IntentButtons />

        </div>

      </div>
    </section>
  )
}