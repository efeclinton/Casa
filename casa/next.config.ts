import type { NextConfig } from "next";
import { supabaseUrl } from "./lib/env";

const supabaseImagePattern = new URL("/**", supabaseUrl);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      supabaseImagePattern,
    ],
  },
};

export default nextConfig;
