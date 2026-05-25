"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import SidebarItem from "../components/Sidebar";
import { DealGridSkeleton } from "../components/DealCardSkeleton";
import ThemeToggle from "../components/ThemeToggle";
import PriceHistoryChart from "../components/PriceHistoryChart";
import FilterSheet from "../components/FilterSheet";
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

const BOYCOTT_MODES: { key: BoycottMode; label: string; icon: string }[] = [
  { key: "highlight", label: "İşaretle", icon: "⚠️" },
  { key: "hide", label: "Gizle", icon: "🚫" },
  { key: "show", label: "Göster", icon: "👁" },
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

function PlatformPills({ selected, onSelect, layoutId }: { selected: PlatformKey; onSelect: (p: PlatformKey) => void; layoutId: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scroll-smooth">
      {PLATFORM_KEYS.map((p) => (
        <motion.button
          key={p}
          onClick={() => onSelect(p)}
          whileTap={{ scale: 0.95 }}
          className={`relative shrink-0 snap-start px-3.5 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
            selected === p
              ? "text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-blue-400"
          }`}
        >
          {selected === p && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{PLATFORM_LABELS[p]}</span>
        </motion.button>
      ))}
    </div>
  );
}

function SortPills({ selected, onSelect, layoutId }: { selected: string; onSelect: (s: string) => void; layoutId: string }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {SORT_OPTIONS.map((s) => (
        <motion.button
          key={s.key}
          onClick={() => onSelect(s.key)}
          whileTap={{ scale: 0.95 }}
          className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition ${
            selected === s.key ? "text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
          }`}
        >
          {selected === s.key && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{s.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

function BoycottPills({ selected, onSelect, layoutId }: { selected: BoycottMode; onSelect: (m: BoycottMode) => void; layoutId: string }) {
  return (
    <div className="inline-flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-0.5">
      {BOYCOTT_MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onSelect(m.key)}
          className={`relative px-3 py-1 rounded-full text-xs font-medium transition ${
            selected === m.key ? "text-white" : "text-gray-600 dark:text-gray-300"
          }`}
          title={`Boykot ürünleri: ${m.label}`}
        >
          {selected === m.key && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 bg-gradient-to-r from-rose-500 to-red-600 rounded-full shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
            <span aria-hidden>{m.icon}</span>
            <span className="hidden sm:inline">{m.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

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
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

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
    setCategoryOpen(false);
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

  const filterPanel = (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Platform</h3>
        <PlatformPills selected={selectedPlatform} onSelect={selectPlatform} layoutId="sheet-platform" />
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Sıralama</h3>
        <SortPills selected={selectedSort} onSelect={selectSort} layoutId="sheet-sort" />
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Boykot Ürünleri</h3>
        <BoycottPills selected={boycottMode} onSelect={setBoycottMode} layoutId="sheet-boycott" />
      </section>
    </div>
  );

  const categoryPanel = (
    <div>
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
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors pb-16">
      {/* Sticky compact header */}
      <header
        className={`sticky top-0 z-30 transition-all duration-300 ${
          scrolled
            ? "bg-white/85 dark:bg-gray-950/85 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-3 flex items-center gap-2">
          <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent truncate">
            MultiScout
          </h1>

          {/* Active filter chip on mobile only */}
          <button
            onClick={() => setFilterOpen(true)}
            className="md:hidden flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200 max-w-[140px]"
          >
            <span className="truncate">{PLATFORM_LABELS[selectedPlatform]} · {SORT_OPTIONS.find((s) => s.key === selectedSort)?.label}</span>
            <span className="text-gray-400">▾</span>
          </button>

          {totalDeals > 0 && (
            <span className="ml-auto md:ml-2 text-xs md:text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50 px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap">
              {visibleDeals.length}
              {hiddenBoycottCount > 0 && <span className="text-rose-600 dark:text-rose-400">/{deals.length}</span>}
            </span>
          )}

          <button
            onClick={() => setCategoryOpen(true)}
            className="md:hidden w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300"
            aria-label="Kategoriler"
          >
            ☰
          </button>

          <motion.button
            onClick={scrapeAllCategories}
            disabled={manualScraping}
            whileHover={{ scale: manualScraping ? 1 : 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-shadow whitespace-nowrap"
          >
            {manualScraping ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                <span className="hidden sm:inline">Taranıyor...</span>
              </span>
            ) : (
              <>
                <span className="md:hidden">Tara</span>
                <span className="hidden md:inline">{selectedPlatform === "hepsi" ? "Tümünü tara" : `${PLATFORM_LABELS[selectedPlatform]} tara`}</span>
              </>
            )}
          </motion.button>

          <ThemeToggle />
        </div>

        {/* Desktop inline filter bar */}
        <div className="hidden md:block max-w-[1400px] mx-auto px-6 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <PlatformPills selected={selectedPlatform} onSelect={selectPlatform} layoutId="desk-platform" />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <SortPills selected={selectedSort} onSelect={selectSort} layoutId="desk-sort" />
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <BoycottPills selected={boycottMode} onSelect={setBoycottMode} layoutId="desk-boycott" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-3 md:px-6 pt-4 md:pt-6 flex gap-6">
        <aside className="hidden md:block w-60 shrink-0 sticky top-32 self-start h-[calc(100vh-9rem)] overflow-y-auto bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Kategoriler</h2>
          {categoryPanel}
        </aside>

        <div className="flex-1 min-w-0">
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
                className="text-center py-16 md:py-20 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
              >
                <div className="text-5xl md:text-6xl mb-4">🔍</div>
                <h3 className="text-lg md:text-xl text-gray-700 dark:text-gray-200 font-semibold mb-2">Henüz Fırsat Bulunamadı</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm">&quot;Tara&quot; butonuna tıklayarak fırsatları yükleyin.</p>
              </motion.div>
            ) : (
              <motion.div
                key={`grid-${selectedCategory}-${selectedPlatform}-${selectedSort}-${boycottMode}`}
                className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5"
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
                        <div className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md shadow-md flex items-center gap-0.5">
                          🚫 <span className="capitalize hidden sm:inline">{boycottBrand}</span>
                        </div>
                      )}
                      <div className="aspect-square md:h-48 md:aspect-auto bg-white dark:bg-gray-800/40 relative p-2 md:p-4 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 overflow-hidden">
                        {discount > 0 && (
                          <span
                            className={`absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10 font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-[10px] md:text-sm text-white shadow-md ${
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
                              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                              className="object-contain group-hover:scale-105 transition-transform duration-300"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="text-gray-300 dark:text-gray-600 text-xs md:text-sm">Görsel Yok</div>
                        )}
                        {deal.price_history && deal.price_history.length > 1 && (
                          <div className="absolute left-2 right-2 bottom-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-gray-200 dark:border-gray-700 hidden md:block">
                            <PriceHistoryChart history={deal.price_history} />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 md:p-4 flex flex-col flex-grow justify-between">
                        <h3 className="text-gray-800 dark:text-gray-100 font-medium text-xs md:text-sm line-clamp-2 md:line-clamp-3 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition mb-1.5 md:mb-2">
                          {deal.title}
                        </h3>
                        {deal.price && (
                          <div className="text-base md:text-xl text-gray-900 dark:text-white font-bold mb-1 md:mb-2">
                            {deal.price.replace("Fırsatın Fiyatı:", "").trim()}
                          </div>
                        )}
                        {deal.last_updated && (
                          <div className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 mb-2 md:mb-3 hidden sm:inline-block bg-gray-50 dark:bg-gray-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded w-fit">
                            {formatTimestamp(deal.last_updated)}
                          </div>
                        )}
                        {deal.deal_score !== undefined && deal.deal_score > 0 && (
                          <div className="mb-1.5 md:mb-2 text-sm hidden sm:block">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-gray-600 dark:text-gray-400 text-[10px] md:text-xs">Skor</span>
                              <span className="font-bold text-orange-600 dark:text-orange-400 text-[10px] md:text-xs">
                                {Math.round(deal.deal_score)}/100
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 md:h-1.5 overflow-hidden">
                              <motion.div
                                className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${deal.deal_score}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: Math.min(idx, 12) * 0.03 }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-auto pt-1.5 md:pt-2">
                          <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate">
                            {deal.platform === "trendyol"
                              ? "Trendyol"
                              : deal.platform === "n11"
                              ? "N11"
                              : deal.platform === "hepsiburada"
                              ? "Hepsiburada"
                              : deal.platform === "amazon"
                              ? "Amazon"
                              : deal.platform === "pazarama"
                              ? "Pazarama"
                              : deal.platform === "ciceksepeti"
                              ? "Çiçek S."
                              : "Ürün"}
                          </span>
                          <span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-700/50 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[9px] md:text-xs font-bold">
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

      {/* Mobile FAB for filter */}
      <button
        onClick={() => setFilterOpen(true)}
        className="md:hidden fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Filtreleri aç"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
      </button>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtreler">
        {filterPanel}
      </FilterSheet>
      <FilterSheet open={categoryOpen} onClose={() => setCategoryOpen(false)} title="Kategoriler">
        {categoryPanel}
      </FilterSheet>
    </main>
  );
}
