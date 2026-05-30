import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // MultiScout 66+ farkli e-ticaret sitesinden gorsel ceker.
    // Her birinin CDN'ini whitelist'e eklemek surdurulebilir degil
    // (Next 16 max 50 remotePatterns) + yeni platform eklendikce eksikler
    // "broken image" olarak gozukur. Bu yuzden Next image optimizasyonunu
    // kapatip <img>-vari direkt yukleme yapiyoruz. Tradeoff: WebP/AVIF
    // donusumu yok, ama tum CDN'ler garanti calisir.
    unoptimized: true,
  },
};

export default nextConfig;
