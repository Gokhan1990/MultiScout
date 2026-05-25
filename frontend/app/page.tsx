"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import SidebarItem from "../components/Sidebar";
import { DealGridSkeleton } from "../components/DealCardSkeleton";
import ThemeToggle from "../components/ThemeToggle";
import PriceHistoryChart from "../components/PriceHistoryChart";
import { isBoycotted } from "../lib/boycott";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type CategoryNode = string[] | { [key: string]: CategoryNode };

interface PriceHistoryEntry {
  date: string;
  price: string;
  discount_percentage: number;
}

interface Deal {
  title: string;
  price?: string;
  discount_percentage?: number;
  link?: string;
  image?: string;
  category?: string;
  deal_score?: number;
  price_history?: PriceHistoryEntry[];
  last_updated?: string;
  platform?: string;
}

type PlatformKey = "hepsi" | "amazon" | "trendyol" | "hepsiburada" | "n11" | "pazarama" | "ciceksepeti";
type BoycottMode = "highlight" | "hide" | "show";

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  hepsi: "Hepsi",
  amazon: "Amazon",
  trendyol: "Trendyol",
  hepsiburada: "Hepsiburada",
  n11: "N11",
  pazarama: "Pazarama",
  ciceksepeti: "Çiçek Sepeti",
};

const PLATFORM_KEYS: PlatformKey[] = ["hepsi", "amazon", "trendyol", "hepsiburada", "n11", "pazarama", "ciceksepeti"];

const SORT_OPTIONS = [
  { key: "last_updated", label: "Yeni" },
  { key: "price", label: "Ucuzdan" },
  { key: "discount", label: "İndirim" },
];

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

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [totalDeals, setTotalDeals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [manualScraping, setManualScraping] = useState(false);
  const [categoryTree, setCategoryTree] = useState<{ [key: string]: CategoryNode } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("gida");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>("hepsi");
  const [selectedSort, setSelectedSort] = useState("last_updated");
  const [scrolled, setScrolled] = useState(false);
  const [boycottMode, setBoycottMode] = useState<BoycottMode>("highlight");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("boycottMode") : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "hide" || stored === "show" || stored === "highlight") setBoycottMode(stored);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("boycottMode", boycottMode);
  }, [boycottMode]);

  const fetchDeals = (category: string, platform: PlatformKey, isNew: boolean, sortBy: string) => {
    if (isNew) setLoading(true);
    else setLoadingMore(true);

    const skip = isNew ? 0 : deals.length;
    fetch(`${API_URL}/api/deals?platform=${platform}&category=${category}&skip=${skip}&limit=30&sort_by=${sortBy}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setDeals((prev) => (isNew ? data.data : [...prev, ...data.data]));
          setTotalDeals(data.total);
        } else if (data.message) {
          toast.error("Hata: " + data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Sunucuya ulaşılamadı");
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    setDeals([]);
    setTotalDeals(0);
    fetchDeals(category, selectedPlatform, true, selectedSort);
  };

  const selectPlatform = (platform: PlatformKey) => {
    setSelectedPlatform(platform);
    setDeals([]);
    setTotalDeals(0);
    fetchDeals(selectedCategory, platform, true, selectedSort);
  };

  const selectSort = (sort: string) => {
    setSelectedSort(sort);
    setDeals([]);
    setTotalDeals(0);
    fetchDeals(selectedCategory, selectedPlatform, true, sort);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (!loadingMore && deals.length < totalDeals) {
          fetchDeals(selectedCategory, selectedPlatform, false, selectedSort);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals.length, totalDeals, loadingMore, selectedCategory, selectedPlatform, selectedSort]);

  useEffect(() => {
    fetch(`${API_URL}/api/category-tree`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") setCategoryTree(data.data);
      })
      .catch((err) => console.error(err));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDeals(selectedCategory, selectedPlatform, true, selectedSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrapeAllCategories = async () => {
    try {
      setManualScraping(true);
      const platformParam = selectedPlatform === "hepsi" ? "all" : selectedPlatform;
      const toastId = toast.loading(`${PLATFORM_LABELS[selectedPlatform]} taranıyor...`);

      const startRes = await fetch(`${API_URL}/api/scrape-all?platform=${platformParam}`, { method: "POST" });
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        toast.error(err.detail || "Tarama başlatılamadı.", { id: toastId });
        setManualScraping(false);
        return;
      }

      const checkStatus = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/scrape-all-status`);
          const data = await res.json();
          const top = data?.data?.status;
          if (top === "completed") {
            clearInterval(checkStatus);
            setManualScraping(false);
            toast.success("Tarama tamamlandı!", { id: toastId });
            fetchDeals(selectedCategory, selectedPlatform, true, selectedSort);
          } else if (top === "error") {
            clearInterval(checkStatus);
            setManualScraping(false);
            toast.error("Hata: " + (data?.data?.message || ""), { id: toastId });
          }
        } catch {
          /* keep polling */
        }
      }, 5000);
    } catch {
      setManualScraping(false);
      toast.error("Tarama başlatılamadı.");
    }
  };

  const { visibleDeals, hiddenBoycottCount } = useMemo(() => {
    const visible: Deal[] = [];
    let hidden = 0;
    for (const d of deals) {
      const b = isBoycotted(d.title);
      if (boycottMode === "hide" && b) {
        hidden += 1;
        continue;
      }
      visible.push(d);
    }
    return { visibleDeals: visible, hiddenBoycottCount: hidden };
  }, [deals, boycottMode]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: Math.min(i, 12) * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
    }),
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">
        <aside className="w-full md:w-64 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 h-fit md:sticky md:top-4">
          <h2 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100">Kategoriler</h2>
          {categoryTree ? (
            Object.entries(categoryTree).map(([key, value]) => (
              <SidebarItem key={key} name={key} data={value} onSelect={selectCategory} selected={selectedCategory} />
            ))
          ) : (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
              ))}
            </div>
          )}
        </aside>

        <div className="flex-1 min-w-0">
          <div
            className={`sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-4 transition-all duration-300 ${
              scrolled ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800" : "bg-transparent"
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                MultiScout — Fırsat Takipçisi
              </h1>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <motion.button
                  onClick={scrapeAllCategories}
                  disabled={manualScraping}
                  whileHover={{ scale: manualScraping ? 1 : 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 md:flex-none px-5 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                >
                  {manualScraping ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-white/80 animate-pulse" />
                      Taranıyor...
                    </span>
                  ) : (
                    `${selectedPlatform === "hepsi" ? "Tümünü" : PLATFORM_LABELS[selectedPlatform] + "'i"} tara`
                  )}
                </motion.button>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {PLATFORM_KEYS.map((p) => (
                <motion.button
                  key={p}
                  onClick={() => selectPlatform(p)}
                  whileTap={{ scale: 0.95 }}
                  className={`relative px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition ${
                    selectedPlatform === p
                      ? "text-white"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
                  }`}
                >
                  {selectedPlatform === p && (
                    <motion.span
                      layoutId="active-platform"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{PLATFORM_LABELS[p]}</span>
                </motion.button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">Sırala:</span>
              {SORT_OPTIONS.map((s) => (
                <motion.button
                  key={s.key}
                  onClick={() => selectSort(s.key)}
                  whileTap={{ scale: 0.95 }}
                  className={`relative px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition ${
                    selectedSort === s.key
                      ? "text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:border-purple-500"
                  }`}
                >
                  {selectedSort === s.key && (
                    <motion.span
                      layoutId="active-sort"
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{s.label}</span>
                </motion.button>
              ))}
              <div className="flex items-center gap-1 ml-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-0.5">
                {(["highlight", "hide", "show"] as BoycottMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBoycottMode(m)}
                    className={`relative px-2.5 py-1 rounded text-xs font-medium transition ${
                      boycottMode === m
                        ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                    title={m === "hide" ? "Boykot ürünlerini gizle" : m === "highlight" ? "Boykot ürünlerini işaretle" : "Hepsini göster"}
                  >
                    {m === "hide" ? "🚫 Gizle" : m === "highlight" ? "⚠️ İşaretle" : "👁 Göster"}
                  </button>
                ))}
              </div>
              {totalDeals > 0 && (
                <span className="ml-auto text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50 px-3 py-1 rounded-full">
                  {visibleDeals.length}/{totalDeals} fırsat
                  {hiddenBoycottCount > 0 && (
                    <span className="ml-1 text-xs text-rose-600 dark:text-rose-400">({hiddenBoycottCount} gizli)</span>
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <DealGridSkeleton count={9} />
                </motion.div>
              ) : visibleDeals.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl text-gray-700 dark:text-gray-200 font-semibold mb-2">Henüz Fırsat Bulunamadı</h3>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Yukarıdaki &quot;Tara&quot; butonuna tıklayarak fırsatları yükleyin.</p>
                </motion.div>
              ) : (
                <motion.div
                  key={`grid-${selectedCategory}-${selectedPlatform}-${selectedSort}-${boycottMode}`}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {visibleDeals.map((deal, idx) => {
                    const discount = deal.discount_percentage || 0;
                    const hotDeal = discount >= 50;
                    const boycottBrand = isBoycotted(deal.title);
                    const showBoycottBadge = boycottBrand && boycottMode !== "show";

                    return (
                      <motion.a
                        key={`${deal.link}-${idx}`}
                        href={deal.link || "#"}
                        target="_blank"
                        rel="noreferrer"
                        custom={idx}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className={`relative block bg-white dark:bg-gray-900 rounded-xl shadow-sm border overflow-hidden hover:shadow-xl transition-shadow group flex flex-col h-full ${
                          showBoycottBadge
                            ? "border-rose-300 dark:border-rose-700/50 ring-1 ring-rose-200 dark:ring-rose-800/40"
                            : "border-gray-100 dark:border-gray-800"
                        }`}
                      >
                        {showBoycottBadge && (
                          <div className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                            🚫 <span className="capitalize">{boycottBrand}</span>
                          </div>
                        )}
                        <div className="h-48 bg-white dark:bg-gray-800/40 relative p-4 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 overflow-hidden">
                          {discount > 0 && (
                            <span
                              className={`absolute top-2 right-2 z-10 font-bold px-2 py-1 rounded-md text-sm text-white shadow-md ${
                                hotDeal ? "bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" : "bg-red-600"
                              }`}
                            >
                              %{discount}
                            </span>
                          )}
                          {deal.image ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={deal.image}
                                alt={deal.title}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                className="object-contain group-hover:scale-105 transition-transform duration-300"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="text-gray-300 dark:text-gray-600 text-sm">Görsel Yok</div>
                          )}
                          {deal.price_history && deal.price_history.length > 1 && (
                            <div className="absolute left-2 right-2 bottom-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-gray-200 dark:border-gray-700">
                              <PriceHistoryChart history={deal.price_history} />
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex flex-col flex-grow justify-between">
                          <h3 className="text-gray-800 dark:text-gray-100 font-medium text-sm line-clamp-3 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition mb-2">
                            {deal.title}
                          </h3>
                          {deal.price && (
                            <div className="text-xl text-gray-900 dark:text-white font-bold mb-2">
                              {deal.price.replace("Fırsatın Fiyatı:", "").trim()}
                            </div>
                          )}
                          {deal.last_updated && (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-3 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded inline-block w-fit">
                              {formatTimestamp(deal.last_updated)}
                            </div>
                          )}
                          {deal.deal_score !== undefined && deal.deal_score > 0 && (
                            <div className="mb-2 text-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-600 dark:text-gray-400 text-xs">Fırsat Skoru</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400 text-xs">
                                  {Math.round(deal.deal_score)}/100
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                  className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${deal.deal_score}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut", delay: Math.min(idx, 12) * 0.03 }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-auto pt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {deal.platform === "trendyol"
                                ? "Trendyol'da Gör"
                                : deal.platform === "n11"
                                ? "N11'de Gör"
                                : deal.platform === "hepsiburada"
                                ? "Hepsiburada'da Gör"
                                : deal.platform === "amazon"
                                ? "Amazon'da Gör"
                                : "Ürünü Gör"}
                            </span>
                            <span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-700/50 px-2 py-1 rounded text-xs font-bold">
                              FIRSAT
                            </span>
                          </div>
                        </div>
                      </motion.a>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {loadingMore && (
              <div className="mt-6">
                <DealGridSkeleton count={3} />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
