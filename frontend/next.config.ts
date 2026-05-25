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
      { protocol: "https", hostname: "**.mncdn.com" },
      { protocol: "https", hostname: "**.teknosa.com" },
      { protocol: "https", hostname: "**.vatanbilgisayar.com" },
      { protocol: "https", hostname: "**.pazarama.com" },
      { protocol: "https", hostname: "**.pzrcdn.com" },
      { protocol: "https", hostname: "**.ciceksepeti.com" },
      { protocol: "https", hostname: "**.cscdn.net" },
      { protocol: "https", hostname: "**.decathlon.com.tr" },
      { protocol: "https", hostname: "**.decathlon.media" },
      { protocol: "https", hostname: "**.steamstatic.com" },
      { protocol: "https", hostname: "**.akamaihd.net" },
      { protocol: "https", hostname: "**.cloudinary.com" },
    ],
  },
};

export default nextConfig;
