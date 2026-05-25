"use client";
/* eslint-disable react/no-unescaped-entities */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  adminLogin, adminGetSettings, adminPatchSection,
  getAdminPassword, clearAdminPassword,
} from "../../lib/admin";

type Tab = "stores" | "scheduler" | "theme" | "social" | "auto_share" | "maintenance" | "docs";

interface Settings {
  stores: Record<string, boolean>;
  theme: { primary: string; accent: string; logo_text: string; tagline: string };
  social: {
    telegram: { enabled: boolean; bot_token: string; chat_id: string };
    instagram: { enabled: boolean; access_token: string; business_account_id: string };
    facebook: { enabled: boolean; page_access_token: string; page_id: string };
  };
  auto_share: { enabled: boolean; min_discount: number; max_per_day: number; platforms: string[] };
  scheduler: { enabled: boolean; amazon_interval_min: number; other_interval_min: number };
  maintenance: { enabled: boolean; message: string };
}

const STORE_LABELS: Record<string, string> = {
  amazon: "Amazon", trendyol: "Trendyol", n11: "N11", hepsiburada: "Hepsiburada",
  pazarama: "Pazarama", ciceksepeti: "Çiçek Sepeti", vatan: "Vatan Bilgisayar",
  teknosa: "Teknosa", decathlon: "Decathlon", steam: "Steam",
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "stores", label: "Mağazalar", icon: "🏪" },
  { id: "scheduler", label: "Tarama", icon: "🔄" },
  { id: "theme", label: "Tema", icon: "🎨" },
  { id: "social", label: "Sosyal Medya", icon: "📱" },
  { id: "auto_share", label: "Otomatik Paylaşım", icon: "🤖" },
  { id: "maintenance", label: "Bakım Modu", icon: "🚧" },
  { id: "docs", label: "API Rehberi", icon: "📚" },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stores");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pw = getAdminPassword();
    if (!pw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthed(false);
      return;
    }
    (async () => {
      const s = await adminGetSettings();
      if (s) {
        setSettings(s as unknown as Settings);
        setAuthed(true);
      } else {
        clearAdminPassword();
        setAuthed(false);
      }
    })();
  }, []);

  const handleLogin = async () => {
    setBusy(true);
    setLoginErr("");
    const ok = await adminLogin(password);
    setBusy(false);
    if (!ok) {
      setLoginErr("Şifre yanlış");
      return;
    }
    const s = await adminGetSettings();
    setSettings(s as unknown as Settings);
    setAuthed(true);
    toast.success("Hoş geldin, admin!");
  };

  const handleLogout = () => {
    clearAdminPassword();
    setAuthed(false);
    setSettings(null);
    setPassword("");
    toast.message("Çıkış yapıldı");
  };

  const updateSection = async (section: string, payload: Record<string, unknown>) => {
    setBusy(true);
    const ok = await adminPatchSection(section, payload);
    setBusy(false);
    if (!ok) {
      toast.error("Kaydedilemedi");
      return false;
    }
    const fresh = await adminGetSettings();
    if (fresh) setSettings(fresh as unknown as Settings);
    toast.success("Kaydedildi");
    return true;
  };

  if (authed === null) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Yükleniyor...</div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 w-full max-w-sm"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3">
              🔐
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Admin Girişi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">MultiScout yönetim paneli</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Şifre"
            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 mb-3"
          />
          {loginErr && <p className="text-sm text-rose-500 mb-3">{loginErr}</p>}
          <button
            onClick={handleLogin}
            disabled={busy || !password}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold disabled:opacity-50"
          >
            {busy ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Varsayılan şifre: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">123456</code> (üretimde ADMIN_PASSWORD env ile değiştir)
          </p>
        </motion.div>
      </main>
    );
  }

  if (!settings) return <main className="p-8">Yükleniyor...</main>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">← Anasayfa</Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Admin Paneli
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-rose-400"
          >
            Çıkış
          </button>
        </header>

        <div className="flex flex-col md:flex-row gap-6">
          <nav className="md:w-56 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.span
                      layoutId="admin-tab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{tab.icon}</span>
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5"
              >
                {activeTab === "stores" && <StoresTab settings={settings} onSave={(payload) => updateSection("stores", payload)} busy={busy} />}
                {activeTab === "scheduler" && <SchedulerTab settings={settings} onSave={(payload) => updateSection("scheduler", payload)} busy={busy} />}
                {activeTab === "theme" && <ThemeTab settings={settings} onSave={(payload) => updateSection("theme", payload)} busy={busy} />}
                {activeTab === "social" && <SocialTab settings={settings} onSave={(payload) => updateSection("social", payload)} busy={busy} />}
                {activeTab === "auto_share" && <AutoShareTab settings={settings} onSave={(payload) => updateSection("auto_share", payload)} busy={busy} />}
                {activeTab === "maintenance" && <MaintenanceTab settings={settings} onSave={(payload) => updateSection("maintenance", payload)} busy={busy} />}
                {activeTab === "docs" && <DocsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

type TabProps = { settings: Settings; onSave: (payload: Record<string, unknown>) => Promise<boolean>; busy: boolean };

function StoresTab({ settings, onSave, busy }: TabProps) {
  const [stores, setStores] = useState(settings.stores);
  const toggle = (k: string) => setStores({ ...stores, [k]: !stores[k] });
  const save = () => onSave(stores);
  const enabledCount = Object.values(stores).filter(Boolean).length;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Mağaza Açık / Kapalı</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Kapatılan mağazalar kullanıcılara görünmez ve otomatik taramaya alınmaz. {enabledCount}/{Object.keys(stores).length} aktif.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(stores).map(([k, v]) => (
          <label key={k} className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition ${
            v ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700/50" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}>
            <span className="text-sm font-medium">{STORE_LABELS[k] || k}</span>
            <input type="checkbox" checked={v} onChange={() => toggle(k)} className="w-5 h-5 accent-green-600" />
          </label>
        ))}
      </div>
      <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-50">{busy ? "Kaydediliyor..." : "Kaydet"}</button>
    </div>
  );
}

function SchedulerTab({ settings, onSave, busy }: TabProps) {
  const [s, setS] = useState(settings.scheduler);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Otomatik Tarama Ayarları</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Backend yeniden başlatılmadan etki etmez (env'den okunuyor). Değişikliği uygulamak için backend restart gerekir.</p>
      <label className="flex items-center gap-3"><input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} className="w-5 h-5 accent-blue-600" /><span className="text-sm">Scheduler aktif</span></label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-400">Amazon aralığı (dakika)</span>
          <input type="number" min="5" value={s.amazon_interval_min} onChange={(e) => setS({ ...s, amazon_interval_min: parseInt(e.target.value) || 60 })} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-400">Diğer platformlar (dakika)</span>
          <input type="number" min="5" value={s.other_interval_min} onChange={(e) => setS({ ...s, other_interval_min: parseInt(e.target.value) || 45 })} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
        </label>
      </div>
      <button onClick={() => onSave(s as unknown as Record<string, unknown>)} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-50">Kaydet</button>
    </div>
  );
}

function ThemeTab({ settings, onSave, busy }: TabProps) {
  const [t, setT] = useState(settings.theme);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Tema & Marka</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-400">Logo / başlık metni</span>
          <input type="text" value={t.logo_text} onChange={(e) => setT({ ...t, logo_text: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-400">Slogan</span>
          <input type="text" value={t.tagline} onChange={(e) => setT({ ...t, tagline: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-400">Primary renk (logo, butonlar)</span>
          <div className="mt-1 flex gap-2 items-center">
            <input type="color" value={t.primary} onChange={(e) => setT({ ...t, primary: e.target.value })} className="w-12 h-10 rounded cursor-pointer border border-gray-200" />
            <input type="text" value={t.primary} onChange={(e) => setT({ ...t, primary: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-sm" />
          </div>
        </label>
        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-400">Accent renk (gradient ikinci ton)</span>
          <div className="mt-1 flex gap-2 items-center">
            <input type="color" value={t.accent} onChange={(e) => setT({ ...t, accent: e.target.value })} className="w-12 h-10 rounded cursor-pointer border border-gray-200" />
            <input type="text" value={t.accent} onChange={(e) => setT({ ...t, accent: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-sm" />
          </div>
        </label>
      </div>
      <div className="rounded-lg p-4 text-white text-lg font-bold" style={{ background: `linear-gradient(to right, ${t.primary}, ${t.accent})` }}>
        {t.logo_text} — {t.tagline}
      </div>
      <button onClick={() => onSave(t as unknown as Record<string, unknown>)} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-50">Kaydet</button>
    </div>
  );
}

function SocialTab({ settings, onSave, busy }: TabProps) {
  const [s, setS] = useState(settings.social);
  const updateField = (platform: keyof typeof s, field: string, value: string | boolean) => {
    setS({ ...s, [platform]: { ...s[platform], [field]: value } });
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Sosyal Medya Entegrasyonu</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">API anahtarlarını gir, etkinleştir. API rehberi tabında nasıl alacağını öğrenebilirsin.</p>
      </div>

      <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <legend className="font-semibold flex items-center gap-2">📨 Telegram</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.telegram.enabled} onChange={(e) => updateField("telegram", "enabled", e.target.checked)} className="w-4 h-4 accent-blue-600" /> Aktif</label>
        </div>
        <label className="block"><span className="text-xs text-gray-500">Bot Token (BotFather'dan)</span>
          <input type="text" value={s.telegram.bot_token} onChange={(e) => updateField("telegram", "bot_token", e.target.value)} placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxyz" className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono" /></label>
        <label className="block"><span className="text-xs text-gray-500">Chat ID (kanal/grup)</span>
          <input type="text" value={s.telegram.chat_id} onChange={(e) => updateField("telegram", "chat_id", e.target.value)} placeholder="@kanaladim veya -1001234567890" className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono" /></label>
      </fieldset>

      <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <legend className="font-semibold flex items-center gap-2">📷 Instagram</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.instagram.enabled} onChange={(e) => updateField("instagram", "enabled", e.target.checked)} className="w-4 h-4 accent-blue-600" /> Aktif</label>
        </div>
        <label className="block"><span className="text-xs text-gray-500">Access Token (uzun ömürlü)</span>
          <input type="text" value={s.instagram.access_token} onChange={(e) => updateField("instagram", "access_token", e.target.value)} placeholder="EAA..." className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono" /></label>
        <label className="block"><span className="text-xs text-gray-500">Business Account ID</span>
          <input type="text" value={s.instagram.business_account_id} onChange={(e) => updateField("instagram", "business_account_id", e.target.value)} placeholder="17841405..." className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono" /></label>
      </fieldset>

      <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <legend className="font-semibold flex items-center gap-2">📘 Facebook</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.facebook.enabled} onChange={(e) => updateField("facebook", "enabled", e.target.checked)} className="w-4 h-4 accent-blue-600" /> Aktif</label>
        </div>
        <label className="block"><span className="text-xs text-gray-500">Page Access Token</span>
          <input type="text" value={s.facebook.page_access_token} onChange={(e) => updateField("facebook", "page_access_token", e.target.value)} placeholder="EAA..." className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono" /></label>
        <label className="block"><span className="text-xs text-gray-500">Page ID</span>
          <input type="text" value={s.facebook.page_id} onChange={(e) => updateField("facebook", "page_id", e.target.value)} placeholder="123456789" className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono" /></label>
      </fieldset>

      <button onClick={() => onSave(s as unknown as Record<string, unknown>)} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-50">Kaydet</button>
    </div>
  );
}

function AutoShareTab({ settings, onSave, busy }: TabProps) {
  const [s, setS] = useState(settings.auto_share);
  const togglePlatform = (p: string) => {
    const next = s.platforms.includes(p) ? s.platforms.filter((x) => x !== p) : [...s.platforms, p];
    setS({ ...s, platforms: next });
  };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Otomatik Paylaşım Kuralları</h2>
      <label className="flex items-center gap-3"><input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} className="w-5 h-5 accent-blue-600" /><span className="text-sm">Otomatik paylaşım aktif</span></label>
      <label className="block">
        <span className="text-sm text-gray-600 dark:text-gray-400">Minimum indirim eşiği (%)</span>
        <input type="number" min="0" max="100" value={s.min_discount} onChange={(e) => setS({ ...s, min_discount: parseInt(e.target.value) || 50 })} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600 dark:text-gray-400">Günlük maksimum paylaşım</span>
        <input type="number" min="1" value={s.max_per_day} onChange={(e) => setS({ ...s, max_per_day: parseInt(e.target.value) || 10 })} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
      </label>
      <div>
        <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Hangi platformlarda paylaşılsın?</span>
        <div className="flex gap-2 flex-wrap">
          {["telegram", "instagram", "facebook"].map((p) => (
            <button key={p} onClick={() => togglePlatform(p)} className={`px-3 py-1.5 rounded-full text-sm font-medium ${s.platforms.includes(p) ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}`}>{p}</button>
          ))}
        </div>
      </div>
      <button onClick={() => onSave(s as unknown as Record<string, unknown>)} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-50">Kaydet</button>
    </div>
  );
}

function MaintenanceTab({ settings, onSave, busy }: TabProps) {
  const [m, setM] = useState(settings.maintenance);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Bakım Modu</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Aktifken kullanıcılar bakım sayfası görür, deal'ler gizlenir.</p>
      <label className="flex items-center gap-3"><input type="checkbox" checked={m.enabled} onChange={(e) => setM({ ...m, enabled: e.target.checked })} className="w-5 h-5 accent-rose-600" /><span className="text-sm">Bakım modu aktif</span></label>
      <label className="block">
        <span className="text-sm text-gray-600 dark:text-gray-400">Mesaj</span>
        <textarea value={m.message} onChange={(e) => setM({ ...m, message: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
      </label>
      <button onClick={() => onSave(m as unknown as Record<string, unknown>)} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold disabled:opacity-50">Kaydet</button>
    </div>
  );
}

function DocsTab() {
  return (
    <div className="space-y-6 text-sm">
      <div>
        <h2 className="text-lg font-bold mb-2">📚 API Anahtarları Nasıl Alınır?</h2>
        <p className="text-gray-500 dark:text-gray-400">Otomatik paylaşım için her platforma API anahtarı bağlamalısın. Aşağıda her birinin adımlarını bulacaksın.</p>
      </div>

      <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">📨 Telegram (en kolay — 5 dk)</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-200">
          <li>Telegram'da <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600 underline">@BotFather</a> ile sohbet aç.</li>
          <li><code className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">/newbot</code> yaz, isim ve username ver (örn: <code>MultiScoutDealsBot</code>).</li>
          <li>BotFather sana bir <strong>token</strong> verir: <code className="text-xs">123456789:ABCdef...</code> → Sosyal Medya tabında <em>Bot Token</em>'a yapıştır.</li>
          <li>Bir Telegram <strong>kanalı/grubu</strong> oluştur (örn: <code>@firsatlar_kanal</code>) ve botu admin yap.</li>
          <li>Kanal username'i (<code>@firsatlar_kanal</code>) ya da numeric chat ID'yi <em>Chat ID</em>'ye yaz.</li>
          <li>Bot, kanala mesaj yollayabilecek. <strong>Otomatik Paylaşım</strong> tabında etkinleştir.</li>
        </ol>
        <details className="mt-3">
          <summary className="cursor-pointer text-blue-600 font-medium">Numeric Chat ID nasıl bulunur?</summary>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Kanal/gruba bir mesaj yolla, sonra <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> URL'sini ziyaret et — <code>chat.id</code> alanını gör.</p>
        </details>
        <p className="mt-3 text-xs text-gray-500">Ücretsiz, sınırsız bot mesajı (genelde dakikada 30 limit). API: <a href="https://core.telegram.org/bots/api" className="text-blue-600 underline" target="_blank" rel="noreferrer">core.telegram.org/bots/api</a></p>
      </section>

      <section className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700/50 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">📷 Instagram Business (~30 dk)</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-200">
          <li>Instagram hesabını <strong>Profesyonel hesaba</strong> (Business/Creator) çevir.</li>
          <li>Bir Facebook <strong>Sayfası</strong> oluştur ve Instagram hesabını bu sayfaya bağla (Instagram → Profil → Düzenle → Sayfa).</li>
          <li><a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-pink-600 underline">developers.facebook.com</a>'a git, hesap aç (geliştirici onayı bazen 1-2 gün sürer).</li>
          <li>Yeni bir Uygulama oluştur (App type: Business). <strong>App ID</strong> ve <strong>App Secret</strong>'i not et.</li>
          <li>App'e <strong>Instagram Graph API</strong> ürününü ekle.</li>
          <li><a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="text-pink-600 underline">Graph API Explorer</a>'da token üret, izinleri seç: <code>instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement</code>.</li>
          <li>Kısa ömürlü token'ı <strong>uzun ömürlü</strong> (60 gün) token'a çevir: <code className="text-xs">GET /oauth/access_token?grant_type=fb_exchange_token&...</code></li>
          <li>Business Account ID'yi öğren: <code className="text-xs">GET /me/accounts</code> → her sayfanın <code>instagram_business_account.id</code>'sini gör.</li>
          <li>Sosyal Medya tabında <em>Access Token</em> ve <em>Business Account ID</em>'yi yapıştır.</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">Token'ı 60 günde bir yenilemen gerek. API doc: <a href="https://developers.facebook.com/docs/instagram-api" className="text-pink-600 underline" target="_blank" rel="noreferrer">Instagram Graph API</a></p>
      </section>

      <section className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">📘 Facebook Sayfa (~20 dk)</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-200">
          <li>Facebook'ta paylaşım yapacağın <strong>Sayfa</strong>nı belirle (Profil değil!).</li>
          <li>Instagram adımlarındaki gibi <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">developers.facebook.com</a>'da app oluştur.</li>
          <li>App'e <strong>Facebook Login + Pages API</strong> ekle.</li>
          <li>Graph API Explorer'da <code>pages_manage_posts, pages_read_engagement</code> izinleriyle token al.</li>
          <li><strong>Page Access Token</strong> al: <code className="text-xs">GET /me/accounts</code> → sayfanın <code>access_token</code>'unu kopyala (kullanıcı token'ından farklı).</li>
          <li>Sayfa ID'sini de al (<code>id</code> alanı).</li>
          <li>Sosyal Medya tabında <em>Page Access Token</em> ve <em>Page ID</em>'yi yapıştır.</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">Page token'lar genelde uzun ömürlüdür (Instagram'dan kalıcı). API doc: <a href="https://developers.facebook.com/docs/pages-api" className="text-indigo-600 underline" target="_blank" rel="noreferrer">Pages API</a></p>
      </section>

      <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4">
        <h3 className="font-bold mb-2">⚠️ Önemli Notlar</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-200">
          <li>Token'ları kimseyle paylaşma; bu admin paneli localStorage'da saklıyor — paylaşım için backend'de kullanılacak (token'lar JSON'da saklanır).</li>
          <li>Üretim ortamında <code>data/admin_settings.json</code> dosyasına dosya sistemi izinleri ver veya environment variables kullan.</li>
          <li>Instagram rate limit: günlük 25 resim/video paylaşım önerilir.</li>
          <li>Facebook ve Instagram'da App'in onaylanması gerekebilir; geliştirici modunda sadece sen test edebilirsin.</li>
          <li>Token süresi dolduğunda otomatik paylaşım çalışmaz — bildirim için Maintenance tabında uyarı ekleyebilirsin.</li>
        </ul>
      </section>
    </div>
  );
}
