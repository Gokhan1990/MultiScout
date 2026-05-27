"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CategoryNode = string[] | { [key: string]: CategoryNode };

interface SidebarItemProps {
  name: string;
  data: CategoryNode;
  onSelect: (item: string) => void;
  selected: string;
  depth?: number;
}

// Kategori adı → emoji eşleştirmesi (UI zenginleştirme)
const CATEGORY_ICONS: Record<string, string> = {
  // Üst kategoriler
  elektronik: "💻",
  "yiyecek & içecek": "🍔",
  yiyecek: "🍔",
  gıda: "🛒",
  kitap: "📚",
  oyuncak: "🧸",
  spor: "⚽",
  moda: "👗",
  "ev & yaşam": "🏠",
  ev: "🏠",
  "kişisel bakım": "🧴",
  ofis: "📎",
  bebek: "🍼",
  diğer: "📦",
  // Alt kategoriler
  "kisisel-bakim": "🧴",
  notebook: "💻",
  telefon: "📱",
  tv: "📺",
  kulaklik: "🎧",
  tablet: "📲",
  "beyaz-esya": "🔌",
  bilgisayar: "🖥️",
  oyun: "🎮",
  "oyun-konsol": "🕹️",
  kosu: "🏃",
  bisiklet: "🚴",
  kamp: "⛺",
  yoga: "🧘",
  kahve: "☕",
  "kahve-makinesi": "☕",
  parfum: "💐",
  cicek: "🌷",
  hediye: "🎁",
  kadin: "👩",
  erkek: "👨",
  cocuk: "🧒",
  "ic-giyim": "🩲",
  pantolon: "👖",
  elbise: "👗",
  "kadin-spor-ayakkabi": "👟",
  "erkek-spor-ayakkabi": "👟",
  "bebek-bezi": "🧷",
  "tencere-seti": "🍲",
  yazici: "🖨️",
};

const iconFor = (label: string): string => {
  const key = label.toLowerCase().trim();
  return CATEGORY_ICONS[key] || "🏷️";
};

const prettyLabel = (label: string): string => {
  // "kisisel-bakim" → "Kişisel Bakım"
  // "tencere-seti" → "Tencere Seti"
  const map: Record<string, string> = {
    "kisisel-bakim": "Kişisel Bakım",
    "beyaz-esya": "Beyaz Eşya",
    "oyun-konsol": "Oyun Konsol",
    "kahve-makinesi": "Kahve Makinesi",
    "ic-giyim": "İç Giyim",
    "kadin-spor-ayakkabi": "Kadın Spor Ayakkabı",
    "erkek-spor-ayakkabi": "Erkek Spor Ayakkabı",
    "tencere-seti": "Tencere Seti",
    "bebek-bezi": "Bebek Bezi",
    notebook: "Notebook",
    tv: "TV",
    n11: "N11",
  };
  if (map[label.toLowerCase()]) return map[label.toLowerCase()];
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const SidebarItem = ({ name, data, onSelect, selected, depth = 0 }: SidebarItemProps) => {
  const [isOpen, setIsOpen] = useState(depth === 0);

  if (Array.isArray(data)) {
    return (
      <div className="space-y-0.5">
        {data.map((item) => {
          const active = selected === item;
          return (
            <motion.button
              key={item}
              onClick={() => onSelect(item)}
              whileTap={{ scale: 0.97 }}
              className={`group flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                active
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/20"
                  : "text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-300"
              }`}
            >
              <span className="text-base shrink-0">{iconFor(item)}</span>
              <span className="truncate font-medium">{prettyLabel(item)}</span>
              {active && (
                <motion.span
                  layoutId="cat-active-dot"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-1.5 hover:text-gray-700 dark:hover:text-gray-200 transition"
      >
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="mr-1.5 text-[10px]"
        >
          ▶
        </motion.span>
        <span className="flex items-center gap-1.5">
          <span>{iconFor(name)}</span>
          <span>{name}</span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-2 pl-2 border-l-2 border-orange-200 dark:border-orange-900/40">
              {Object.entries(data).map(([key, value]) => (
                <SidebarItem key={key} name={key} data={value} onSelect={onSelect} selected={selected} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SidebarItem;
