import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  FaBagShopping,
  FaDiscord,
  FaInstagram,
  FaSpotify,
  FaTelegram,
  FaTiktok,
  FaTwitch,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa6";
import type { IconType } from "react-icons";
import { hasSupabase } from "./lib/supabase";

type ThemeName = "dark" | "red" | "neon" | "minimal" | "glass";
type Screen = "landing" | "studio" | "public" | "admin";
type Role = "creator" | "admin";
type StudioTab = "dashboard" | "profile" | "links" | "content" | "pro" | "seo" | "growth";

type PresetMode = "campaign" | "minimal" | "event";

type SocialLink = {
  platform: string;
  url: string;
  enabled: boolean;
};

type Analytics = {
  profileViews: number;
  linkClicks: number;
  dailyViews: Record<string, number>;
  dailyClicks: Record<string, number>;
  topLinks: Record<string, number>;
};

type UserAccount = {
  id: string;
  role: Role;
  email: string;
  username: string;
  password: string;
  displayName: string;
  category: string;
  bio: string;
  followers: string;
  theme: ThemeName;
  sponsorTitle: string;
  sponsorText: string;
  shopLinks: string[];
  referenceVideos: string[];
  mediaKitUrl: string;
  proEnabled: boolean;
  customDomain: string;
  metaPixelId: string;
  gaId: string;
  links: SocialLink[];
  analytics: Analytics;
  metaTitle?: string;
  metaDescription?: string;
  sponsorUrl?: string;
  sponsorCampaignStart?: string;
  sponsorCampaignEnd?: string;
  nfcCardId?: string;
  marketplaceThemes?: string[];
  presetMode?: PresetMode;
  auditLogs?: string[];
};

const ACCOUNTS_KEY = "ecard_accounts_v1";
const SESSION_KEY = "ecard_session_v1";

const defaultLinks: SocialLink[] = [
  { platform: "Instagram", url: "https://instagram.com", enabled: true },
  { platform: "TikTok", url: "https://tiktok.com", enabled: true },
  { platform: "YouTube", url: "https://youtube.com", enabled: true },
  { platform: "Twitch", url: "https://twitch.tv", enabled: false },
  { platform: "Spotify", url: "https://spotify.com", enabled: true },
  { platform: "WhatsApp", url: "https://wa.me", enabled: true },
  { platform: "Telegram", url: "https://t.me", enabled: false },
  { platform: "Discord", url: "https://discord.com", enabled: false },
  { platform: "Shop", url: "https://shop.example.com", enabled: true },
];

const platformIcon: Record<string, IconType> = {
  Instagram: FaInstagram,
  TikTok: FaTiktok,
  YouTube: FaYoutube,
  Twitch: FaTwitch,
  Spotify: FaSpotify,
  WhatsApp: FaWhatsapp,
  Telegram: FaTelegram,
  Discord: FaDiscord,
  Shop: FaBagShopping,
};

const platformColor: Record<string, string> = {
  Instagram: "from-fuchsia-500 to-orange-400",
  TikTok: "from-zinc-900 to-zinc-700",
  YouTube: "from-red-700 to-red-500",
  Twitch: "from-violet-700 to-indigo-500",
  Spotify: "from-emerald-600 to-green-400",
  WhatsApp: "from-green-600 to-emerald-500",
  Telegram: "from-sky-600 to-cyan-400",
  Discord: "from-indigo-700 to-blue-500",
  Shop: "from-neutral-700 to-neutral-500",
};

const themes: { id: ThemeName; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "red", label: "Red" },
  { id: "neon", label: "Neon" },
  { id: "minimal", label: "Minimal" },
  { id: "glass", label: "Glass" },
];

const defaultAnalytics: Analytics = {
  profileViews: 0,
  linkClicks: 0,
  dailyViews: {},
  dailyClicks: {},
  topLinks: {},
};

const adminMenu = [
  "Dashboard",
  "Kullanicilar",
  "Paketler",
  "Tema Yonetimi",
  "Reklamlar",
  "Sponsorlar",
  "Analytics",
  "Sayfa Tasarimlari",
  "QR Kodlar",
  "Domainler",
];

function sanitizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function upsertMeta(property: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector(`meta[${property}='${key}']`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(property, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function loadAccounts() {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [] as UserAccount[];
  try {
    const parsed = JSON.parse(raw) as UserAccount[];
    return parsed.map((item) => ({
      ...item,
      role: item.role || "creator",
      sponsorTitle: item.sponsorTitle || "Sponsor Alani",
      sponsorText: item.sponsorText || "Sponsor isbirligi mesaji.",
      shopLinks: item.shopLinks || ["https://shop.example.com"],
      referenceVideos: item.referenceVideos || ["https://youtube.com/watch?v=demo"],
      mediaKitUrl: item.mediaKitUrl || "https://example.com/media-kit.pdf",
      proEnabled: item.proEnabled ?? false,
      customDomain: item.customDomain || "",
      metaPixelId: item.metaPixelId || "",
      gaId: item.gaId || "",
      analytics: item.analytics || defaultAnalytics,
      metaTitle: item.metaTitle || "",
      metaDescription: item.metaDescription || "",
      sponsorUrl: item.sponsorUrl || "",
      sponsorCampaignStart: item.sponsorCampaignStart || "",
      sponsorCampaignEnd: item.sponsorCampaignEnd || "",
      nfcCardId: item.nfcCardId || "",
      marketplaceThemes: item.marketplaceThemes || [],
      presetMode: item.presetMode || "campaign",
      auditLogs: item.auditLogs || [],
    }));
  } catch {
    return [] as UserAccount[];
  }
}

function resolveRoute(pathname: string, hasSession: boolean, isAdmin: boolean) {
  if (pathname === "/studio" && hasSession) return { screen: "studio" as Screen, username: "" };
  if (pathname === "/admin" && hasSession && isAdmin) return { screen: "admin" as Screen, username: "" };
  const slug = sanitizeUsername(pathname.replace(/^\//, ""));
  if (slug) return { screen: "public" as Screen, username: slug };
  if (hasSession) return { screen: "studio" as Screen, username: "" };
  return { screen: "landing" as Screen, username: "" };
}

function Logo() {
  return <img src="/images/ecard-logo-premium.png" alt="Ecard One" className="h-10 w-auto" />;
}

function App() {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const loaded = loadAccounts();
    if (loaded.some((item) => item.role === "admin")) return loaded;
    return [
      ...loaded,
      {
        id: "admin-seed",
        role: "admin",
        email: "admin@ecard.tr",
        username: "admin",
        password: "admin123",
        displayName: "Ecard Admin",
        category: "System",
        bio: "Platform yonetimi",
        followers: "0",
        theme: "dark",
        sponsorTitle: "",
        sponsorText: "",
        shopLinks: [""],
        referenceVideos: [""],
        mediaKitUrl: "",
        proEnabled: true,
        customDomain: "",
        metaPixelId: "",
        gaId: "",
        links: defaultLinks,
        analytics: defaultAnalytics,
        metaTitle: "",
        metaDescription: "",
        sponsorUrl: "",
        sponsorCampaignStart: "",
        sponsorCampaignEnd: "",
        nfcCardId: "",
        marketplaceThemes: [],
        presetMode: "campaign",
        auditLogs: [],
      },
    ];
  });
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) || "");
  const seededIsAdmin =
    loadAccounts().find((item) => item.id === localStorage.getItem(SESSION_KEY) && item.role === "admin") ||
    localStorage.getItem(SESSION_KEY) === "admin-seed";
  const [route, setRoute] = useState(() =>
    resolveRoute(window.location.pathname, !!localStorage.getItem(SESSION_KEY), !!seededIsAdmin),
  );
  const [error, setError] = useState("");
  const [studioTab, setStudioTab] = useState<StudioTab>("dashboard");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [heroUsername, setHeroUsername] = useState("");
  const registerSectionRef = useRef<HTMLDivElement | null>(null);

  const sessionUser = useMemo(() => accounts.find((item) => item.id === sessionId), [accounts, sessionId]);
  const publicUser = useMemo(
    () => accounts.find((item) => item.username === route.username),
    [accounts, route.username],
  );

  const [draft, setDraft] = useState<UserAccount | null>(sessionUser || null);
  const [viewedMarker, setViewedMarker] = useState("");

  useEffect(() => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionId]);

  useEffect(() => {
    setDraft(sessionUser || null);
  }, [sessionUser]);

  useEffect(() => {
    const onPop = () =>
      setRoute(resolveRoute(window.location.pathname, !!sessionId, accounts.some((item) => item.id === sessionId && item.role === "admin")));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [sessionId, accounts]);

  useEffect(() => {
    if (route.screen === "public" && publicUser) {
      document.title = `${publicUser.displayName} | Ecard One`;
      upsertMeta("name", "description", publicUser.metaDescription || publicUser.bio);
      upsertMeta("property", "og:title", publicUser.metaTitle || `${publicUser.displayName} | Ecard One`);
      upsertMeta("property", "og:description", publicUser.metaDescription || publicUser.bio);
      upsertMeta("property", "og:url", `https://ecard.tr/${publicUser.username}`);
    } else {
      document.title = "Ecard One";
    }
  }, [route.screen, publicUser]);

  useEffect(() => {
    const oldGa = document.getElementById("ga-script");
    const oldPixel = document.getElementById("meta-pixel");
    if (oldGa) oldGa.remove();
    if (oldPixel) oldPixel.remove();

    if (route.screen !== "public" || !publicUser || !publicUser.proEnabled) return;

    if (publicUser.gaId) {
      const gaScript = document.createElement("script");
      gaScript.id = "ga-script";
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${publicUser.gaId}`;
      document.head.appendChild(gaScript);
    }

    if (publicUser.metaPixelId) {
      const pixelScript = document.createElement("script");
      pixelScript.id = "meta-pixel";
      pixelScript.text = `window.ecardPixel='${publicUser.metaPixelId}'`;
      document.head.appendChild(pixelScript);
    }
  }, [route.screen, publicUser]);

  const navigate = (next: Screen, username = "") => {
    const path = next === "studio" ? "/studio" : next === "public" ? `/${username}` : next === "admin" ? "/admin" : "/";
    window.history.pushState({}, "", path);
    setRoute({ screen: next, username });
  };

  const updateUser = (id: string, updater: (current: UserAccount) => UserAccount) => {
    setAccounts((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
  };

  useEffect(() => {
    if (route.screen !== "public" || !publicUser) return;
    const marker = `${publicUser.id}-${route.username}`;
    if (viewedMarker === marker) return;
    setViewedMarker(marker);
    updateUser(publicUser.id, (item) => {
      const key = dayKey();
      return {
        ...item,
        analytics: {
          ...item.analytics,
          profileViews: item.analytics.profileViews + 1,
          dailyViews: { ...item.analytics.dailyViews, [key]: (item.analytics.dailyViews[key] || 0) + 1 },
        },
      };
    });
  }, [route.screen, route.username, publicUser, viewedMarker]);

  const trackLinkClick = (account: UserAccount, platform: string) => {
    const key = dayKey();
    updateUser(account.id, (item) => ({
      ...item,
      analytics: {
        ...item.analytics,
        linkClicks: item.analytics.linkClicks + 1,
        dailyClicks: { ...item.analytics.dailyClicks, [key]: (item.analytics.dailyClicks[key] || 0) + 1 },
        topLinks: { ...item.analytics.topLinks, [platform]: (item.analytics.topLinks[platform] || 0) + 1 },
      },
    }));
  };

  const appendAudit = (message: string) => {
    if (!sessionUser) return;
    updateUser(sessionUser.id, (item) => ({
      ...item,
      auditLogs: [`${new Date().toLocaleString("tr-TR")}: ${message}`, ...(item.auditLogs || [])].slice(0, 20),
    }));
  };

  const exportAnalyticsCsv = () => {
    if (!sessionUser) return;
    const rows = [
      ["metric", "value"],
      ["profileViews", String(sessionUser.analytics.profileViews)],
      ["linkClicks", String(sessionUser.analytics.linkClicks)],
      ...Object.entries(sessionUser.analytics.topLinks).map(([platform, value]) => [platform, String(value)]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionUser.username}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
    appendAudit("Analytics CSV disa aktarıldı");
  };

  const applyPreset = (mode: PresetMode) => {
    if (!draft) return;
    if (mode === "campaign") {
      setDraft({ ...draft, presetMode: mode, sponsorTitle: "Kampanya Modu", theme: "red" });
    }
    if (mode === "minimal") {
      setDraft({ ...draft, presetMode: mode, sponsorTitle: "Minimal Profil", theme: "minimal" });
    }
    if (mode === "event") {
      setDraft({ ...draft, presetMode: mode, sponsorTitle: "Etkinlik Odakli", theme: "neon" });
    }
    appendAudit(`Tek tik profile modu uygulandi: ${mode}`);
  };

  const sortedPublicLinks = useMemo(() => {
    if (!publicUser) return [] as SocialLink[];
    return [...publicUser.links]
      .filter((item) => item.enabled)
      .sort((a, b) => (publicUser.analytics.topLinks[b.platform] || 0) - (publicUser.analytics.topLinks[a.platform] || 0));
  }, [publicUser]);

  const themeClass = (theme: ThemeName) => {
    if (theme === "red") return "from-[#220808] via-[#160505] to-[#060303] border-red-500/40";
    if (theme === "neon") return "from-[#04111f] via-[#08101c] to-[#05070d] border-cyan-400/40";
    if (theme === "minimal") return "from-[#111111] via-[#0f0f0f] to-[#090909] border-white/15";
    if (theme === "glass") return "from-white/10 via-white/5 to-white/10 border-white/35";
    return "from-[#141414] via-[#0f0f0f] to-black border-white/15";
  };

  const register = () => {
    setError("");
    const username = sanitizeUsername(registerUsername);
    if (!registerEmail || !registerPassword || !username) return setError("Tum alanlari doldur.");
    if (registerPassword.length < 4) return setError("Sifre en az 4 karakter olmali.");
    if (accounts.some((item) => item.email === registerEmail)) return setError("Bu e-posta zaten kayitli.");
    if (accounts.some((item) => item.username === username)) return setError("Bu kullanici adi alinmis.");

    const newUser: UserAccount = {
      id: crypto.randomUUID(),
      role: "creator",
      email: registerEmail,
      password: registerPassword,
      username,
      displayName: username,
      category: "Content Creator",
      bio: "Yeni Ecard profilim.",
      followers: "0",
      theme: "dark",
      sponsorTitle: "Sponsor Alani",
      sponsorText: "Marka isbirligi mesaji.",
      shopLinks: ["https://shop.example.com"],
      referenceVideos: ["https://youtube.com/watch?v=demo"],
      mediaKitUrl: "https://example.com/media-kit.pdf",
      proEnabled: false,
      customDomain: "",
      metaPixelId: "",
      gaId: "",
      links: defaultLinks,
      analytics: defaultAnalytics,
      metaTitle: "",
      metaDescription: "",
      sponsorUrl: "",
      sponsorCampaignStart: "",
      sponsorCampaignEnd: "",
      nfcCardId: "",
      marketplaceThemes: [],
      presetMode: "campaign",
      auditLogs: ["Hesap olusturuldu"],
    };
    setAccounts((prev) => [...prev, newUser]);
    setSessionId(newUser.id);
    navigate("studio");
  };

  const login = () => {
    setError("");
    const found = accounts.find((item) => item.email === loginEmail && item.password === loginPassword);
    if (!found) return setError("Giris bilgileri hatali.");
    setSessionId(found.id);
    appendAudit("Kullanici girisi yapti");
    navigate(found.role === "admin" ? "admin" : "studio");
  };

  const saveDraft = () => {
    if (!draft || !sessionUser) return;
    const username = sanitizeUsername(draft.username);
    if (!username) return setError("Kullanici adi gerekli.");
    if (accounts.some((item) => item.username === username && item.id !== draft.id)) {
      return setError("Bu kullanici adi baska hesapta.");
    }

    const updated = { ...draft, username };
    setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setError("");
    appendAudit("Profil ayarlari kaydedildi");
    navigate("public", username);
  };

  const logout = () => {
    setSessionId("");
    navigate("landing");
  };

  const handleHeroUrlSearch = () => {
    const slug = sanitizeUsername(heroUsername);
    if (!slug) {
      registerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const found = accounts.find((item) => item.username === slug);
    if (found) {
      navigate("public", slug);
      return;
    }

    setRegisterUsername(slug);
    registerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <section className="relative overflow-hidden border-b border-white/10">
        <img src="/images/hero-atmosphere.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(180,0,0,0.5),transparent_35%),linear-gradient(180deg,rgba(4,4,4,0.8),#050505)]" />
        <motion.div
          className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#b40000]/30 blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-8">
          <nav className="flex items-center justify-between">
            <Logo />
            <div className="flex gap-2">
              <span className={`hidden rounded-full border px-3 py-2 text-xs sm:block ${hasSupabase ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}>
                {hasSupabase ? "Cloud Mode" : "Local Mode"}
              </span>
              <button onClick={() => navigate("landing")} className="rounded-full border border-white/20 px-4 py-2 text-sm">
                Ana Sayfa
              </button>
              {sessionUser ? (
                <>
                  <button
                    onClick={() => navigate(sessionUser.role === "admin" ? "admin" : "studio")}
                    className="rounded-full border border-[#b40000] bg-[#b40000]/20 px-4 py-2 text-sm"
                  >
                    Panel
                  </button>
                  <button onClick={logout} className="rounded-full border border-white/20 px-4 py-2 text-sm">
                    Cikis
                  </button>
                </>
              ) : null}
            </div>
          </nav>

          {route.screen === "landing" && (
            <>
              <div className="relative grid min-h-[88vh] items-center gap-12 py-12 lg:grid-cols-[1fr_420px]">
                <motion.div
                  className="pointer-events-none absolute -left-28 top-14 h-72 w-72 rounded-full bg-[#b40000]/35 blur-3xl"
                  animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
                  transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="space-y-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-[#ff6c6c]">Ecard Premium Platform</p>
                  <h1 className="text-6xl font-semibold leading-[0.95] sm:text-7xl lg:text-8xl">
                    Tek Link Degil,
                    <br />
                    <span className="text-[#ff3232]">Dijital Kimligin.</span>
                  </h1>
                  <p className="max-w-2xl text-lg leading-relaxed text-zinc-300">
                    Influencerlar, icerik ureticileri ve markalar icin premium bio ekosistemi. Profilini ac,
                    sponsorlarini yonet, shop linklerini satisa cevir, QR/NFC ile offline dunyaya tasi.
                  </p>
                  <div className="flex w-full max-w-xl items-center overflow-hidden rounded-xl border border-white/20 bg-black/45">
                    <span className="border-r border-white/15 px-3 py-3 text-sm text-zinc-400">ecard.tr/</span>
                    <input
                      value={heroUsername}
                      onChange={(e) => setHeroUsername(sanitizeUsername(e.target.value))}
                      className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-zinc-500"
                      placeholder="kullaniciadi"
                    />
                    <button onClick={handleHeroUrlSearch} className="bg-[#b40000] px-4 py-3 text-sm font-semibold text-white">
                      Bio URL Ara
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={register}
                      className="rounded-xl bg-[#b40000] px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(180,0,0,0.45)]"
                    >
                      Hemen Ucretsiz Basla
                    </motion.button>
                    <button
                      onClick={() => navigate("public", "atakan")}
                      className="rounded-xl border border-white/25 bg-white/5 px-7 py-3 text-sm font-semibold backdrop-blur"
                    >
                      Demo Goruntule
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-zinc-300">
                    <p>Sinirsiz Link</p>
                    <p>Ozel Tema</p>
                    <p>Pixel ve Analytics</p>
                    <p>QR ve NFC Kart</p>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 22, rotate: 6 }}
                  animate={{ opacity: 1, y: 0, rotate: -6 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="mx-auto w-full max-w-sm rounded-[2.6rem] border border-[#ff3030]/60 bg-black/70 p-5 shadow-[0_0_60px_rgba(180,0,0,0.4)] backdrop-blur-xl"
                >
                  <div className="rounded-[2rem] border border-white/10 bg-black/70 p-4">
                    <img src="/images/creator-avatar.png" alt="avatar" className="mx-auto h-24 w-24 rounded-full border border-[#ff3b3b]/50 object-cover" />
                    <p className="mt-4 text-center text-2xl font-semibold">Atakan Ozyurt</p>
                    <p className="text-center text-zinc-300">Icerik Ureticisi / YouTuber</p>
                    <div className="mt-5 space-y-2">
                      {defaultLinks
                        .filter((item) => item.enabled)
                        .slice(0, 6)
                        .map((item) => {
                          const Icon = platformIcon[item.platform];
                          return (
                            <div key={item.platform} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-sm">
                              <span className="flex items-center gap-2">
                                <span className={`grid h-7 w-7 place-content-center rounded-lg bg-gradient-to-br ${platformColor[item.platform]} text-white`}>
                                  {Icon ? <Icon size={13} /> : null}
                                </span>
                                {item.platform}
                              </span>
                              <span className="text-zinc-500">{">"}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid gap-4 pb-6 md:grid-cols-4">
                {[
                  ["Ozellestirilebilir Temalar", "Dark, red, neon, minimal, glass"],
                  ["Detayli Analytics", "Tiklama, goruntulenme, top link raporu"],
                  ["QR ve NFC", "Kart okutunca profil acilsin"],
                  ["Ozel Domain", "alanadin.com -> ecard profiline bagla"],
                ].map((item) => (
                  <div key={item[0]} className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-black/60 p-4 backdrop-blur-xl">
                    <p className="font-semibold text-white">{item[0]}</p>
                    <p className="mt-2 text-sm text-zinc-400">{item[1]}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 pb-6 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-black/60 p-6">
                  <h3 className="text-3xl font-semibold">Sana Uygun Paketi Sec</h3>
                  <p className="mt-1 text-zinc-400">Ister ucretsiz basla, ister PRO ile fark yarat.</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ["Ucretsiz", "0 TL/ay", "Sinirli link, temel tema"],
                      ["Starter", "99 TL/ay", "Ozel tema, analytics"],
                      ["Pro", "199 TL/ay", "Domain, pixel, sponsor, medya kit"],
                    ].map((plan, index) => (
                      <div
                        key={plan[0]}
                        className={`rounded-2xl border p-4 ${index === 2 ? "border-[#b40000] bg-[#b40000]/12" : "border-white/10 bg-black/40"}`}
                      >
                        <p className="font-semibold">{plan[0]}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{plan[1]}</p>
                        <p className="mt-1 text-sm text-zinc-400">{plan[2]}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-black/60 p-6">
                  <h3 className="text-3xl font-semibold">Iceriklerini One Cikar</h3>
                  <p className="mt-1 text-zinc-400">Videolar, reels, sponsor isleri tek gridde.</p>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-video rounded-xl border border-white/10 bg-gradient-to-br from-[#220808] via-zinc-900 to-black" />
                    ))}
                  </div>
                </div>
              </div>

              <div ref={registerSectionRef} className="grid gap-5 pb-10 lg:grid-cols-[1.3fr_1fr]">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-black/60 p-6">
                  <p className="text-sm uppercase tracking-[0.16em] text-[#ff7272]">Hemen Basla</p>
                  <h3 className="mt-1 text-3xl font-semibold">Hesap Ac veya Giris Yap</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                      <p className="font-semibold">Yeni Hesap</p>
                      <input
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="E-posta"
                      />
                      <input
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(sanitizeUsername(e.target.value))}
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="kullaniciadi"
                      />
                      <input
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="Sifre"
                      />
                      <button onClick={register} className="w-full rounded-lg bg-[#b40000] px-3 py-2 font-semibold text-white">
                        Hesap Olustur
                      </button>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                      <p className="font-semibold">Giris</p>
                      <input
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="E-posta"
                      />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="Sifre"
                      />
                      <button onClick={login} className="w-full rounded-lg border border-white/20 px-3 py-2 font-semibold">
                        Giris Yap
                      </button>
                      <p className="text-xs text-zinc-500">Admin: admin@ecard.tr / admin123</p>
                    </div>
                  </div>
                  {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                </div>

                <div className="rounded-3xl border border-[#b40000]/35 bg-gradient-to-b from-[#2b0909]/70 to-black/80 p-6 shadow-[0_20px_50px_rgba(180,0,0,0.2)]">
                  <h3 className="text-2xl font-semibold">Hemen Ecard Ailesine Katil</h3>
                  <p className="mt-2 text-zinc-300">Ucretsiz hesabini olustur, dijital kimligini bugun guclendir.</p>
                  <button onClick={register} className="mt-5 rounded-xl bg-[#b40000] px-5 py-3 font-semibold text-white">
                    Ucretsiz Basla
                  </button>
                </div>
              </div>
            </>
          )}

          {route.screen === "public" && (
            <div className="grid min-h-[78vh] items-center gap-10 py-12 lg:grid-cols-[1fr_420px]">
              {!publicUser ? (
                <div className="rounded-2xl border border-white/15 bg-black/40 p-6">
                  <p className="text-2xl font-semibold">Profil bulunamadi</p>
                  <p className="mt-2 text-zinc-300">Bu kullanici adi ile bir hesap yok. Yeni hesap acarak kullan.</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[#ff7777]">ecard.tr/{publicUser.username}</p>
                  <h2 className="mt-3 text-4xl font-semibold">{publicUser.displayName}</h2>
                  <p className="mt-2 text-zinc-300">{publicUser.category}</p>
                  <p className="mt-3 max-w-xl text-zinc-300">{publicUser.bio}</p>
                  <p className="mt-4 text-zinc-400">Takipci: {publicUser.followers}</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {sortedPublicLinks.map((item) => {
                        const Icon = platformIcon[item.platform];
                        return (
                          <a
                            key={item.platform}
                            target="_blank"
                            rel="noreferrer"
                            href={item.url}
                            onClick={() => trackLinkClick(publicUser, item.platform)}
                            className="flex items-center justify-between rounded-xl border border-white/15 bg-black/40 px-3 py-2.5"
                          >
                            <span className="flex items-center gap-2">
                              <span className={`grid h-8 w-8 place-content-center rounded-lg bg-gradient-to-br ${platformColor[item.platform]} text-white`}>
                                {Icon ? <Icon size={15} /> : null}
                              </span>
                              {item.platform}
                            </span>
                            <span className="text-zinc-400">{">"}</span>
                          </a>
                        );
                      })}
                  </div>
                </div>
              )}

              {publicUser && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-[2rem] border bg-gradient-to-b p-4 backdrop-blur-xl ${themeClass(publicUser.theme)}`}
                >
                  <div className="rounded-[1.6rem] border border-white/10 bg-black/40 p-4">
                    <img src="/images/creator-avatar.png" alt="avatar" className="mx-auto h-20 w-20 rounded-full border border-white/30 object-cover" />
                    <p className="mt-3 text-center text-xl font-semibold">{publicUser.displayName}</p>
                    <p className="text-center text-sm text-zinc-300">{publicUser.category}</p>
                  <p className="mt-2 text-center text-xs text-zinc-400">Takipci: {publicUser.followers}</p>
                  <p className="mt-1 text-center text-xs text-zinc-400">Goruntulenme: {publicUser.analytics.profileViews}</p>
                    <div className="mt-4 flex justify-center rounded-xl bg-white p-2">
                      <QRCodeSVG value={`https://ecard.tr/${publicUser.username}`} size={112} />
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(`https://ecard.tr/${publicUser.username}`)}
                      className="mt-4 w-full rounded-xl bg-[#b40000] px-3 py-2 text-sm font-semibold"
                    >
                      Linki Kopyala
                    </button>
                  </div>
                </motion.div>
              )}

              {publicUser && (
                <div className="space-y-4 lg:col-span-2">
                  <div className="rounded-2xl border border-white/15 bg-black/35 p-5">
                    <p className="text-sm uppercase tracking-[0.16em] text-[#ff7a7a]">Sponsor</p>
                    <h3 className="mt-2 text-2xl font-semibold">{publicUser.sponsorTitle}</h3>
                    <p className="mt-1 text-zinc-300">{publicUser.sponsorText}</p>
                    {publicUser.sponsorUrl && (
                      <a
                        href={publicUser.sponsorUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackLinkClick(publicUser, "Sponsor")}
                        className="mt-3 inline-block rounded-lg border border-white/20 px-3 py-2 text-sm"
                      >
                        Sponsor Linkini Ac
                      </a>
                    )}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-black/35 p-5">
                      <p className="mb-3 text-lg font-semibold">Shop Linkleri</p>
                      <div className="space-y-2">
                        {publicUser.shopLinks.map((shop, idx) => (
                          <a
                            key={`${shop}-${idx}`}
                            href={shop}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300"
                          >
                            {shop}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-black/35 p-5">
                      <p className="mb-3 text-lg font-semibold">Referans Videolar</p>
                      <div className="space-y-2">
                        {publicUser.referenceVideos.map((video, idx) => (
                          <a
                            key={`${video}-${idx}`}
                            href={video}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300"
                          >
                            {video}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-black/35 p-5">
                    <p className="mb-3 text-lg font-semibold">Medya Kiti</p>
                    <a href={publicUser.mediaKitUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[#b40000] px-4 py-2 text-sm font-semibold inline-block">
                      PDF Ac
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {route.screen === "studio" && sessionUser && draft && (
            <div className="grid min-h-[78vh] gap-6 py-10 lg:grid-cols-[220px_1fr]">
              <aside className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <Logo />
                <p className="mt-6 text-sm text-zinc-400">Creator Studio</p>
                <div className="mt-3 space-y-2 text-sm text-zinc-200">
                  {([
                    ["dashboard", "Dashboard"],
                    ["profile", "Profil"],
                    ["links", "Linkler"],
                    ["content", "Icerikler"],
                    ["pro", "PRO"],
                    ["seo", "SEO"],
                    ["growth", "Growth"],
                  ] as [StudioTab, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setStudioTab(id)}
                      className={`block w-full rounded-lg px-3 py-2 text-left ${studioTab === id ? "bg-[#b40000]/20" : ""}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={logout} className="mt-8 w-full rounded-lg border border-white/20 px-3 py-2 text-sm">
                  Cikis Yap
                </button>
              </aside>

              <div className="space-y-5 rounded-2xl border border-white/10 bg-black/35 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-semibold">Profil Ayarlari</p>
                  <button onClick={() => navigate("public", draft.username)} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
                    Profili Gor
                  </button>
                </div>

                {studioTab === "dashboard" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                        <p className="text-xs text-zinc-400">Profil URL</p>
                        <p className="mt-2 text-sm text-white">ecard.tr/{draft.username}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                        <p className="text-xs text-zinc-400">Profil Goruntulenme</p>
                        <p className="mt-2 text-2xl text-white">{draft.analytics.profileViews}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                        <p className="text-xs text-zinc-400">Link Tiklama</p>
                        <p className="mt-2 text-2xl text-white">{draft.analytics.linkClicks}</p>
                      </div>
                    </div>
                    <button onClick={exportAnalyticsCsv} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
                      Analytics CSV Disa Aktar
                    </button>
                  </div>
                )}

                {studioTab === "profile" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={draft.displayName}
                        onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                        className="rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="Gorunen ad"
                      />
                      <input
                        value={draft.username}
                        onChange={(e) => setDraft({ ...draft, username: sanitizeUsername(e.target.value) })}
                        className="rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="kullaniciadi"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={draft.category}
                        onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                        className="rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="Kategori"
                      />
                      <input
                        value={draft.followers}
                        onChange={(e) => setDraft({ ...draft, followers: e.target.value })}
                        className="rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                        placeholder="Takipci"
                      />
                    </div>

                    <textarea
                      value={draft.bio}
                      onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                      className="h-20 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      placeholder="Bio"
                    />

                    <div>
                      <p className="mb-2 text-sm text-zinc-300">Tema</p>
                      <div className="flex flex-wrap gap-2">
                        {themes.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setDraft({ ...draft, theme: item.id })}
                            className={`rounded-full border px-3 py-1.5 text-sm ${draft.theme === item.id ? "border-[#b40000] bg-[#b40000]/25" : "border-white/20"}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {studioTab === "links" && (
                  <div className="space-y-2">
                    {draft.links.map((link, index) => {
                      const Icon = platformIcon[link.platform];
                      return (
                        <div key={link.platform} className="grid gap-2 rounded-xl border border-white/10 bg-black/35 p-3 sm:grid-cols-[140px_1fr_auto]">
                          <div className="flex items-center gap-2">
                            <span className={`grid h-7 w-7 place-content-center rounded-lg bg-gradient-to-br ${platformColor[link.platform]} text-white`}>
                              {Icon ? <Icon size={13} /> : null}
                            </span>
                            <span>{link.platform}</span>
                          </div>
                          <input
                            value={link.url}
                            onChange={(e) => {
                              const updated = [...draft.links];
                              updated[index] = { ...updated[index], url: e.target.value };
                              setDraft({ ...draft, links: updated });
                            }}
                            className="rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                          />
                          <button
                            onClick={() => {
                              const updated = [...draft.links];
                              updated[index] = { ...updated[index], enabled: !updated[index].enabled };
                              setDraft({ ...draft, links: updated });
                            }}
                            className={`rounded-lg px-3 py-2 text-sm ${link.enabled ? "bg-[#b40000]" : "bg-zinc-700"}`}
                          >
                            {link.enabled ? "Acik" : "Kapali"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {studioTab === "content" && (
                  <div className="space-y-3">
                    <input
                      value={draft.sponsorTitle}
                      onChange={(e) => setDraft({ ...draft, sponsorTitle: e.target.value })}
                      className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      placeholder="Sponsor basligi"
                    />
                    <textarea
                      value={draft.sponsorText}
                      onChange={(e) => setDraft({ ...draft, sponsorText: e.target.value })}
                      className="h-20 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      placeholder="Sponsor aciklamasi"
                    />
                    <p className="text-sm text-zinc-300">Shop Linkleri</p>
                    {draft.shopLinks.map((item, idx) => (
                      <input
                        key={`shop-${idx}`}
                        value={item}
                        onChange={(e) => {
                          const next = [...draft.shopLinks];
                          next[idx] = e.target.value;
                          setDraft({ ...draft, shopLinks: next });
                        }}
                        className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      />
                    ))}
                    <button
                      onClick={() => setDraft({ ...draft, shopLinks: [...draft.shopLinks, "https://"] })}
                      className="rounded-lg border border-white/20 px-3 py-2 text-sm"
                    >
                      Shop Link Ekle
                    </button>

                    <p className="text-sm text-zinc-300">Referans Videolar</p>
                    {draft.referenceVideos.map((item, idx) => (
                      <input
                        key={`video-${idx}`}
                        value={item}
                        onChange={(e) => {
                          const next = [...draft.referenceVideos];
                          next[idx] = e.target.value;
                          setDraft({ ...draft, referenceVideos: next });
                        }}
                        className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      />
                    ))}
                    <button
                      onClick={() => setDraft({ ...draft, referenceVideos: [...draft.referenceVideos, "https://"] })}
                      className="rounded-lg border border-white/20 px-3 py-2 text-sm"
                    >
                      Referans Video Ekle
                    </button>

                    <input
                      value={draft.mediaKitUrl}
                      onChange={(e) => setDraft({ ...draft, mediaKitUrl: e.target.value })}
                      className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      placeholder="Medya kit PDF linki"
                    />
                  </div>
                )}

                {studioTab === "pro" && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setDraft({ ...draft, proEnabled: !draft.proEnabled })}
                      className={`rounded-lg px-3 py-2 text-sm ${draft.proEnabled ? "bg-[#b40000]" : "bg-zinc-700"}`}
                    >
                      PRO Paket: {draft.proEnabled ? "Aktif" : "Pasif"}
                    </button>
                    <input
                      value={draft.customDomain}
                      onChange={(e) => setDraft({ ...draft, customDomain: e.target.value })}
                      className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      placeholder="Ozel domain (or: me.atakan.com)"
                    />
                    <input
                      value={draft.metaPixelId}
                      onChange={(e) => setDraft({ ...draft, metaPixelId: e.target.value })}
                      className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      placeholder="Meta Pixel ID"
                    />
                    <input
                      value={draft.gaId}
                      onChange={(e) => setDraft({ ...draft, gaId: e.target.value })}
                      className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2"
                      placeholder="Google Analytics ID"
                    />
                    <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-zinc-300">
                      <p className="font-medium text-white">Odeme ve Abonelik</p>
                      <p className="mt-1">Stripe / Iyzico webhook baglandiginda PRO otomatik aktive edilir.</p>
                      <div className="mt-2 flex gap-2">
                        <button className="rounded-lg border border-white/20 px-3 py-2 text-xs">Stripe Checkout</button>
                        <button className="rounded-lg border border-white/20 px-3 py-2 text-xs">Iyzico Checkout</button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-zinc-300">
                      <p className="font-medium text-white">Custom Domain Onboarding</p>
                      <p className="mt-1">1) CNAME: www to domains.ecard.tr</p>
                      <p>2) TXT dogrulama kaydini ekle</p>
                      <p>3) SSL aktif olunca otomatik yonlendirme baslar</p>
                    </div>
                  </div>
                )}

                {studioTab === "seo" && (
                  <div className="space-y-3 rounded-xl border border-white/10 bg-black/35 p-4 text-sm">
                    <input
                      value={draft.metaTitle || ""}
                      onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })}
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                      placeholder={`Meta title (varsayilan: ${draft.displayName} | Ecard One)`}
                    />
                    <textarea
                      value={draft.metaDescription || ""}
                      onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
                      className="h-16 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                      placeholder={`Meta description (varsayilan: ${draft.bio})`}
                    />
                    <p className="text-zinc-300">OpenGraph URL: https://ecard.tr/{draft.username}</p>
                    <p className="text-zinc-300">Twitter Card: summary_large_image</p>
                    <textarea
                      readOnly
                      className="h-28 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs"
                      value={JSON.stringify(
                        {
                          "@context": "https://schema.org",
                          "@type": "Person",
                          name: draft.displayName,
                          url: `https://ecard.tr/${draft.username}`,
                        },
                        null,
                        2,
                      )}
                    />
                    <textarea
                      readOnly
                      className="h-24 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs"
                      value={`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://ecard.tr/${draft.username}</loc></url>\n</urlset>`}
                    />
                  </div>
                )}

                {studioTab === "growth" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                      <p className="mb-2 font-medium">Tek Tik Profil Modlari</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => applyPreset("campaign")} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
                          Kampanya Modu
                        </button>
                        <button onClick={() => applyPreset("minimal")} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
                          Minimal Mod
                        </button>
                        <button onClick={() => applyPreset("event")} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
                          Etkinlik Modu
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                      <p className="mb-2 font-medium">Theme Marketplace</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ["Dark Red Elite", "49 TL"],
                          ["Neon Pulse", "69 TL"],
                          ["Glass Luxe", "59 TL"],
                          ["Minimal Ink", "39 TL"],
                        ].map((theme) => (
                          <button
                            key={theme[0]}
                            onClick={() => {
                              if (draft.marketplaceThemes?.includes(theme[0])) return;
                              setDraft({ ...draft, marketplaceThemes: [...(draft.marketplaceThemes || []), theme[0]] });
                              appendAudit(`Marketplace tema satin alindi: ${theme[0]}`);
                            }}
                            className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
                          >
                            <span>{theme[0]}</span>
                            <span>{draft.marketplaceThemes?.includes(theme[0]) ? "Yuklu" : theme[1]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                        <p className="mb-2 font-medium">Sponsor Kampanyasi</p>
                        <input
                          value={draft.sponsorUrl || ""}
                          onChange={(e) => setDraft({ ...draft, sponsorUrl: e.target.value })}
                          placeholder="Sponsor URL"
                          className="mb-2 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        />
                        <input
                          type="date"
                          value={draft.sponsorCampaignStart || ""}
                          onChange={(e) => setDraft({ ...draft, sponsorCampaignStart: e.target.value })}
                          className="mb-2 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        />
                        <input
                          type="date"
                          value={draft.sponsorCampaignEnd || ""}
                          onChange={(e) => setDraft({ ...draft, sponsorCampaignEnd: e.target.value })}
                          className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        />
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                        <p className="mb-2 font-medium">NFC Kart Eslestirme</p>
                        <input
                          value={draft.nfcCardId || ""}
                          onChange={(e) => setDraft({ ...draft, nfcCardId: e.target.value })}
                          placeholder="Kart ID / UID"
                          className="mb-2 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                        />
                        <p className="text-xs text-zinc-400">Kart okutuldugunda `ecard.tr/{draft.username}` acilir.</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                      <p className="mb-2 font-medium">Audit Log</p>
                      <div className="max-h-36 space-y-2 overflow-auto text-xs text-zinc-300">
                        {(draft.auditLogs || []).map((log, idx) => (
                          <p key={`${log}-${idx}`} className="rounded bg-black/40 px-2 py-1">
                            {log}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={saveDraft} className="rounded-xl bg-[#b40000] px-4 py-2 font-semibold">
                  Kaydet ve Profili Ac
                </button>
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </div>
          )}

          {route.screen === "admin" && sessionUser?.role === "admin" && (
            <div className="grid min-h-[78vh] gap-6 py-10 lg:grid-cols-[250px_1fr]">
              <aside className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <Logo />
                <nav className="mt-6 space-y-1">
                  {adminMenu.map((item, index) => (
                    <button
                      key={item}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${index === 0 ? "bg-[#b40000]/20" : "text-zinc-300"}`}
                    >
                      {item}
                    </button>
                  ))}
                </nav>
              </aside>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/35 p-5">
                <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs text-zinc-400">Toplam Kullanici</p>
                    <p className="mt-2 text-2xl">{accounts.filter((item) => item.role === "creator").length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs text-zinc-400">PRO Kullanici</p>
                    <p className="mt-2 text-2xl">{accounts.filter((item) => item.role === "creator" && item.proEnabled).length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs text-zinc-400">Toplam Goruntulenme</p>
                    <p className="mt-2 text-2xl">
                      {accounts.reduce((sum, item) => sum + (item.analytics?.profileViews || 0), 0)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="mb-3 font-medium">Kullanicilar</p>
                  <div className="space-y-2">
                    {accounts
                      .filter((item) => item.role === "creator")
                      .map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center rounded-lg border border-white/10 px-3 py-2 text-sm">
                          <div>
                            <p className="text-white">{item.displayName}</p>
                            <p className="text-zinc-400">ecard.tr/{item.username}</p>
                          </div>
                          <p className="px-3 text-zinc-300">{item.proEnabled ? "PRO" : "FREE"}</p>
                          <button onClick={() => navigate("public", item.username)} className="rounded-md border border-white/20 px-2 py-1">
                            Ac
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
                    <p className="font-medium text-white">RBAC ve White-label</p>
                    <p className="mt-2">Roller: creator, admin, super_admin, agency</p>
                    <p>Agency hesaplari coklu creator yonetebilir.</p>
                    <p className="mt-2">Audit log ve degisiklik gecmisi growth sekmesinde tutuluyor.</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
                    <p className="font-medium text-white">Queue, Cron, Monitoring</p>
                    <p className="mt-2">Haftalik analytics ozeti cron ile e-posta olarak gonderilir.</p>
                    <p>Webhook kuyrugu: odeme, domain dogrulama, fatura olaylari.</p>
                    <p>Monitoring: Sentry + uptime + performans metrikleri.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
