import { supabase } from "@/lib/supabaseClient";
import PropertyCard from "@/components/PropertyCard";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    rentPeriod?: string;
  }>;
}) {
  const params = await searchParams;

  const location = (params?.location || "").trim();
  const minPrice = params?.minPrice;
  const maxPrice = params?.maxPrice;
  const rentPeriod = params?.rentPeriod;

  let query = supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (location) {
    query = query.ilike("location", `%${location}%`);
  }

  if (minPrice) {
    query = query.gte("price", Number(minPrice));
  }

  if (maxPrice) {
    query = query.lte("price", Number(maxPrice));
  }

  if (rentPeriod) {
    query = query.eq("rent_period", rentPeriod);
  }

  const { data: properties, error } = await query;

  if (error) {
    console.error(error);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">All Properties</h1>

      {/* FILTER */}
      <form method="GET" className="bg-white p-4 rounded shadow mb-6">
        <input
          name="location"
          type="text"
          placeholder="Search location..."
          defaultValue={location}
          className="border p-2 rounded w-full mb-3"
        />

        {/* POPULAR AREAS */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["Hilltop", "Odenigwe", "Odim", "Behind Flat", "Town"].map((area) => (
            <button
              key={area}
              type="submit"
              name="location"
              value={area}
              className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm transition"
            >
              {area}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            name="minPrice"
            type="number"
            placeholder="Min price"
            defaultValue={minPrice}
            className="border p-2 rounded w-full"
          />
          <input
            name="maxPrice"
            type="number"
            placeholder="Max price"
            defaultValue={maxPrice}
            className="border p-2 rounded w-full"
          />
        </div>

        <button type="submit" className="mt-3 w-full bg-black text-white py-2 rounded">
          Apply Filters
        </button>
      </form>

      {/* LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties?.map((property: any) => (
          <PropertyCard
            key={property.id}
            image={property.image}
            price={property.price}
            title={property.title}
            location={property.location}
            rent_period={property.rent_period}
            id={property.id}
          />
        ))}
      </div>
    </div>

  );
}