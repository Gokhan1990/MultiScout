"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Deal {
  title: string;
  price?: string;
  discount_percentage?: number;
  link?: string;
  image?: string;
  category?: string;
  deal_score?: number;
  price_history?: Array<{date: string; price: string; discount_percentage: number}>;
  last_updated?: string;
  platform?: string;
}

interface PriceComparison {
  trendyol?: Array<{title: string; price: string; source: string}>;
  hepsiburada?: Array<{title: string; price: string; source: string}>;
  n11?: Array<{title: string; price: string; source: string}>;
}

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const extractAsin = (link: string) => {
  const match = link.match(/\/dp\/([A-Z0-9]{10})/);
  return match ? match[1] : "";
};

const extractProductId = (link: string, platform?: string) => {
  // Amazon ASIN
  if (link.includes("amazon")) {
    const match = link.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? `amazon_${match[1]}` : "";
  }
  // Trendyol
  if (link.includes("trendyol")) {
    const match = link.match(/\/p\/(\d+)/);
    return match ? `trendyol_${match[1]}` : "";
  }
  // N11
  if (link.includes("n11")) {
    const match = link.match(/\/p\/(\d+)/);
    return match ? `n11_${match[1]}` : "";
  }
  // Hepsiburada
  if (link.includes("hepsiburada")) {
    const match = link.match(/\/p\/(\d+)/);
    return match ? `hepsiburada_${match[1]}` : "";
  }
  // Fallback to ASIN for unknown platforms
  const match = link.match(/\/dp\/([A-Z0-9]{10})/);
  return match ? match[1] : "";
};

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [totalDeals, setTotalDeals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [manualScraping, setManualScraping] = useState(false);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("gida");
  const [selectedPlatform, setSelectedPlatform] = useState("hepsi");
  const [selectedSort, setSelectedSort] = useState("last_updated");
  const [hydrated, setHydrated] = useState(false);
  const [comparisons, setComparisons] = useState<Record<string, PriceComparison>>({});
  const [comparisonLoading, setComparisonLoading] = useState<Record<string, boolean>>({});

  const fetchDeals = (category: string, platform: string, isNewCategory: boolean = false, sortBy: string = "last_updated") => {
    if (isNewCategory) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const skip = isNewCategory ? 0 : deals.length;
    fetch(`${API_URL}/api/deals?platform=${platform}&category=${category}&skip=${skip}&limit=30&sort_by=${sortBy}`)
      .then(res => res.json())
      .then(data => {
        console.log("API'den gelen veri:", data);
        if (data.status === "success") {
          setDeals(isNewCategory ? data.data : prev => [...prev, ...data.data]);
          setTotalDeals(data.total);
        }
        setLoading(false);
        setLoadingMore(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setLoadingMore(false);
      });
  };

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    setMessage("");
    setDeals([]);
    setTotalDeals(0);
    const platformMap: Record<string, string> = {
      'Hepsi': 'hepsi',
      'Amazon': 'amazon',
      'Trendyol': 'trendyol',
      'Hepsiburada': 'hepsiburada',
      'N11': 'n11',
    };
    fetchDeals(category, platformMap[selectedPlatform] || 'amazon', true, selectedSort);
  };

  const selectPlatform = (platform: string) => {
    const platformMap: Record<string, string> = {
      'Hepsi': 'hepsi',
      'Amazon': 'amazon',
      'Trendyol': 'trendyol',
      'Hepsiburada': 'hepsiburada',
      'N11': 'n11',
    };
    const mappedPlatform = platformMap[platform] || 'hepsi';
    setSelectedPlatform(mappedPlatform);
    setMessage("");
    setDeals([]);
    setTotalDeals(0);
    fetchDeals(selectedCategory, mappedPlatform, true, selectedSort);
  };

  const selectSort = (sort: string) => {
    setSelectedSort(sort);
    setMessage("");
    setDeals([]);
    setTotalDeals(0);
    fetchDeals(selectedCategory, selectedPlatform, true, sort);
  };

  const fetchComparison = (deal: Deal) => {
    const productId = extractProductId(deal.link || "");
    if (!productId || comparisons[productId] || comparisonLoading[productId]) return;

    setComparisonLoading(prev => ({...prev, [productId]: true}));
    fetch(`${API_URL}/api/compare-prices?product_id=${productId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setComparisons(prev => ({...prev, [productId]: data.data}));
        }
      })
      .catch(err => console.error(err))
      .finally(() => {
        setComparisonLoading(prev => ({...prev, [productId]: false}));
      });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (!loadingMore && deals.length < totalDeals) {
          fetchDeals(selectedCategory, selectedPlatform, false, selectedSort);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [deals.length, totalDeals, loadingMore, selectedCategory, selectedPlatform, selectedSort]);


  useEffect(() => {
    setHydrated(true);

    fetch(`${API_URL}/api/categories`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setCategories(data.categories);
        }
      })
      .catch(err => console.error(err));

    const platformMap: Record<string, string> = {
      'Hepsi': 'hepsi',
      'Amazon': 'amazon',
      'Trendyol': 'trendyol',
      'Hepsiburada': 'hepsiburada',
      'N11': 'n11',
    };
    fetchDeals(selectedCategory, platformMap[selectedPlatform] || 'amazon', true, selectedSort);
  }, []);


  const scrapeAllCategories = async () => {
    try {
      setManualScraping(true);
      const platformMap: Record<string, string> = {
        'Hepsi': 'all',
        'Amazon': 'amazon',
        'Trendyol': 'trendyol',
        'Hepsiburada': 'hepsiburada',
        'N11': 'n11',
      };
      const platformParam = platformMap[selectedPlatform] || 'all';
      setMessage(`${selectedPlatform} taranıyor...`);
      await fetch(`${API_URL}/api/scrape-all?platform=${platformParam}`, { method: "POST" });

      const checkStatus = setInterval(async () => {
        const res = await fetch(`${API_URL}/api/scrape-all-status`);
        const data = await res.json();
        if (data.data.status === "completed") {
          clearInterval(checkStatus);
          setManualScraping(false);
          setMessage("Tarama tamamlandı, veriler yüklendi.");
          fetchDeals(selectedCategory, selectedPlatform, true);
        } else if (data.data.status === "error") {
          clearInterval(checkStatus);
          setManualScraping(false);
          setMessage("Tarama hatası: " + data.data.message);
        }
      }, 5000);
    } catch (error) {
      setManualScraping(false);
      setMessage("Tarama başlatılamadı.");
    }
  };

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">Amazon Deal Finder</h1>

          <div className="flex gap-2 flex-wrap mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => selectCategory(cat)}
                disabled={loading}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition ${
                  selectedCategory === cat
                    ? "bg-orange-600 text-white"
                    : "bg-white text-gray-800 border border-gray-300 hover:border-orange-500"
                } disabled:opacity-50`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t pt-4">
            <div className="flex gap-2 flex-wrap">
              {['Hepsi', 'Amazon', 'Trendyol', 'Hepsiburada', 'N11'].map((p) => (
                <button
                  key={p}
                  onClick={() => p !== 'Hepsiburada' && selectPlatform(p)}
                  disabled={p === 'Hepsiburada'}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition ${
                    selectedPlatform === p
                      ? "bg-blue-600 text-white"
                      : p === 'Hepsiburada'
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                      : "bg-white text-gray-800 border border-gray-300 hover:border-blue-500"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={scrapeAllCategories}
              disabled={manualScraping}
              className="w-full md:w-auto px-5 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {manualScraping ? "Taranıyor..." : `${selectedPlatform === 'Hepsi' ? 'Tüm platformları' : selectedPlatform + "'i"} tara`}
            </button>
          </div>
          {totalDeals > 0 && (
            <div className="mt-4 text-right text-base text-orange-700 font-bold">
              Toplam {totalDeals} fırsat bulundu
            </div>
          )}

          <div className="mt-4 border-t pt-4">
            <div className="text-xs md:text-sm font-semibold text-gray-700 mb-2">Sıralama:</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => selectSort("last_updated")}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition ${
                  selectedSort === "last_updated"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-800 border border-gray-300 hover:border-purple-500"
                }`}
              >
                Yeniden Eskiye
              </button>
              <button
                onClick={() => selectSort("price")}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition ${
                  selectedSort === "price"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-800 border border-gray-300 hover:border-purple-500"
                }`}
              >
                Fiyat: Ucuzdan Pahalıya
              </button>
              <button
                onClick={() => selectSort("discount")}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition ${
                  selectedSort === "discount"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-800 border border-gray-300 hover:border-purple-500"
                }`}
              >
                İndirim: Yüksekten Düşüğe
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-6 border border-blue-200">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Veriler yükleniyor...</div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl text-gray-600 mb-2">Henüz Fırsat Bulunamadı</h3>
            <p className="text-gray-400">Veritabanı boş. Yeni fırsatları bulmak için &quot;Fırsatları Tarat&quot; butonuna tıklayın.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {deals.map((deal, idx) => {
              const productId = extractProductId(deal.link || "");
              const comparison = comparisons[productId];
              const trendyolPrice = comparison?.trendyol?.[0]?.price;
              const hepsiburadaPrice = comparison?.hepsiburada?.[0]?.price;
              const n11Price = comparison?.n11?.[0]?.price;

              return (
              <a key={idx} href={deal.link || "#"} target="_blank" rel="noreferrer" onMouseEnter={() => fetchComparison(deal)} className="relative block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group flex flex-col h-full">
                <div className="h-48 bg-white relative p-4 flex items-center justify-center border-b border-gray-100">
                  {deal.discount_percentage !== undefined && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white font-bold px-2 py-1 rounded-md text-sm z-10">
                      %{deal.discount_percentage} İndirim
                    </span>
                  )}
                  {deal.image ? (
                    <img src={deal.image} alt={deal.title} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="text-gray-400">Görsel Yok</div>
                  )}
                  <div className="absolute left-3 right-3 bottom-3 bg-black/85 text-white rounded-lg px-3 py-2 text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {comparisonLoading[productId] ? (
                      <div>Trendyol, Hepsiburada ve N11 aranıyor...</div>
                    ) : comparison ? (
                      <div className="space-y-1">
                        {(selectedPlatform === 'Hepsi' || selectedPlatform === 'Trendyol') && (
                          <div className="flex justify-between gap-2">
                            <span>Trendyol</span>
                            <span className="font-bold">{trendyolPrice || "Bulunamadı"}</span>
                          </div>
                        )}
                        {(selectedPlatform === 'Hepsi' || selectedPlatform === 'Hepsiburada') && (
                          <div className="flex justify-between gap-2">
                            <span>Hepsiburada</span>
                            <span className="font-bold">{hepsiburadaPrice || "Bulunamadı"}</span>
                          </div>
                        )}
                        {(selectedPlatform === 'Hepsi' || selectedPlatform === 'N11') && (
                          <div className="flex justify-between gap-2">
                            <span>N11</span>
                            <span className="font-bold">{n11Price || "Bulunamadı"}</span>
                          </div>
                        )}
                        {(selectedPlatform === 'Hepsi' || selectedPlatform === 'Amazon') && (
                          <div className="flex justify-between gap-2">
                            <span>Amazon</span>
                            <span className="font-bold">{deal.price?.replace('Fırsatın Fiyatı:', '').trim() || "Bulunamadı"}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>Fiyat karşılaştırması için bekle...</div>
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow justify-between">
                  <h3 className="text-gray-800 font-medium text-sm line-clamp-3 group-hover:text-orange-500 transition mb-2">{deal.title}</h3>
                  {deal.price && (
                    <div className="text-xl text-gray-900 font-bold mb-2">
                      {deal.price.replace('Fırsatın Fiyatı:', '').trim()}
                    </div>
                  )}
                  {deal.last_updated && (
                    <div className="text-[10px] text-gray-400 mb-3 bg-gray-50 px-2 py-1 rounded inline-block">
                      {formatTimestamp(deal.last_updated)}
                    </div>
                  )}
                  {deal.deal_score !== undefined && (
                    <div className="mb-2 text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600">Fırsat Skoru</span>
                        <span className="font-bold text-orange-600">{Math.round(deal.deal_score)}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{width: `${deal.deal_score}%`}}
                        ></div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 hover:underline">
                      {deal.platform === 'trendyol' ? "Trendyol'da Gör" :
                       deal.platform === 'n11' ? "N11'de Gör" :
                       deal.platform === 'hepsiburada' ? "Hepsiburada'da Gör" :
                       deal.platform === 'amazon' ? "Amazon'da Gör" :
                       "Ürünü Gör"}
                    </span>
                    <span className="text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded text-xs font-bold">FIRSAT</span>
                  </div>
                </div>
              </a>
              );
            })}
          </div>
        )}
        {loadingMore && (
          <div className="text-center py-8 text-gray-500">Daha fazla ürün yükleniyor...</div>
        )}
      </div>
    </main>
  );
}
