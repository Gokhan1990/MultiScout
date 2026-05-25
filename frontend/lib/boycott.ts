// Türkiye'deki boykot çağrılarında yaygın olarak geçen markalar.
// Liste kullanıcı isteğiyle düzenlenebilir; tamamlanmış kabul edilmemelidir.
// Eşleme case-insensitive; tam kelime sınırı yerine substring kullanılır.

export const BOYCOTT_BRANDS: string[] = [
  // İçecek (Coca-Cola İçecek grubu + Anadolu Endüstri Holding)
  "coca-cola", "coca cola", "cocacola", "fanta", "sprite", "fuse tea", "fusetea", "powerade",
  "cappy", "damla su", "damlasu", "burn enerji", "schweppes",
  "meysu", "meyveli mey", "anadolu efes", // Anadolu Holding / Coca-Cola İçecek bağlantılı
  "pepsi", "yedigün", "fruko", "lipton", "doritos", "lays", "cheetos", "ruffles", "tropicana",
  // Gıda / atıştırmalık
  "nestle", "nestlé", "nescafe", "nescafé", "nesquik", "kitkat", "kit kat", "damak", "crunch",
  "knorr", "calvé", "calve", "algida", "magnum",
  // Kişisel bakım / kozmetik
  "l'oreal", "l'oréal", "loreal", "garnier", "maybelline", "lancome", "lancôme",
  "dove", "axe", "rexona", "lux", "cif", "domestos", "omo", "yumoş",
  "ariel", "alo", "ace", "fairy", "head & shoulders", "head and shoulders", "pantene", "pampers", "always", "gillette",
  "old spice", "oral-b", "oral b", "braun",
  "colgate", "palmolive",
  // Diğer (üretici/sahip bağlantılı)
  "huggies", "kleenex", "scott", "kotex",
  "hp ", "hewlett-packard", "hewlett packard",
  "disney",
  "puma",
  "starbucks",
  "mcdonald", "mcdonalds", "mcdonald's",
  "burger king",
  "kfc",
  "domino", "domino's",
];

const _normalized = BOYCOTT_BRANDS.map((b) => b.toLowerCase());

export function isBoycotted(title: string | undefined | null): string | null {
  if (!title) return null;
  const t = title.toLowerCase();
  for (const brand of _normalized) {
    if (t.includes(brand)) return brand;
  }
  return null;
}
