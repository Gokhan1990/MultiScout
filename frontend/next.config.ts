import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazon.com" },
      { protocol: "https", hostname: "**.amazon.com.tr" },
      { protocol: "https", hostname: "**.media-amazon.com" },
      { protocol: "https", hostname: "**.ssl-images-amazon.com" },
      { protocol: "https", hostname: "**.trendyol.com" },
      { protocol: "https", hostname: "**.trendyolcdn.com" },
      { protocol: "https", hostname: "**.n11.com" },
      { protocol: "https", hostname: "**.n11scdn.com" },
      { protocol: "https", hostname: "**.hepsiburada.com" },
      { protocol: "https", hostname: "**.hepsiburadan.com" },
    ],
  },
};

export default nextConfig;
