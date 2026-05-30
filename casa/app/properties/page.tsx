import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import PropertyCard from "@/components/PropertyCard";
import { getListingAgentId, loadVerificationStatuses } from "@/lib/verification";

type Property = {
  id: string;
  image?: string;
  price: number;
  title: string;
  location: string;
  rent_period: string;
  updated_at?: string | null;
  inquiry_count?: number | null;
  agent_id?: string | null;
  owner_id?: string | null;
}

export const metadata: Metadata = {
  title: "All Properties | CASA",
  description:
    "Browse verified student accommodation listings near UNN with filters for location, price, and rent period.",
  openGraph: {
    title: "All Properties | CASA",
    description:
      "Browse verified student accommodation listings near UNN with filters for location, price, and rent period.",
    url: "/properties",
    siteName: "CASA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Properties | CASA",
    description:
      "Browse verified student accommodation listings near UNN with filters for location, price, and rent period.",
  },
};

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
    .eq("is_active", true)
    .order("updated_at", { ascending: false, nullsFirst: false });

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

  const verificationStatuses = await loadVerificationStatuses(properties || []);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4 sm:mb-6">All Properties</h1>

      {/* FILTER */}
      <form method="GET" className="bg-white p-4 sm:p-5 rounded-xl shadow mb-6 space-y-3 sm:space-y-4">
        <input
          name="location"
          type="text"
          placeholder="Search location..."
          defaultValue={location}
          className="border p-2.5 rounded-lg w-full text-sm sm:text-base"
        />

        {/* POPULAR AREAS */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["Hilltop", "Odenigwe", "Odim", "Behind Flat", "Town"].map((area) => (
            <Link
              key={area}
              href={`/properties?location=${encodeURIComponent(area)}`}
              className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm transition"
            >
              {area}
            </Link>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            name="minPrice"
            type="number"
            placeholder="Min price"
            defaultValue={minPrice}
            className="border p-2.5 rounded-lg w-full text-sm sm:text-base"
          />
          <input
            name="maxPrice"
            type="number"
            placeholder="Max price"
            defaultValue={maxPrice}
            className="border p-2.5 rounded-lg w-full text-sm sm:text-base"
          />
        </div>

        <button type="submit" className="w-full sm:w-auto bg-black text-white py-2.5 px-4 rounded-lg min-h-10 text-sm sm:text-base">
          Apply Filters
        </button>
      </form>

      {/* LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {properties?.map((property: Property) => (
          <PropertyCard
            key={property.id}
            image={property.image}
            price={property.price}
            title={property.title}
            location={property.location}
            rent_period={property.rent_period}
            updatedAt={property.updated_at}
            inquiryCount={property.inquiry_count ?? 0}
            agentVerificationStatus={verificationStatuses[getListingAgentId(property) || ""]}
            id={property.id}
          />
        ))}
      </div>
    </div>

  );
}
