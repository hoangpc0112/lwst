"use client";

import { useEffect, useMemo, useState } from "react";

import type { ScrapedServer } from "@/lib/cpt-hedge";

type Language = "vi" | "en";

type DashboardProps = {
  anchorServer: ScrapedServer;
  sameSeasonServers: ScrapedServer[];
  sameSeasonWithShinyTask: ScrapedServer[];
  totalServers: number;
};

type Copy = {
  heroKicker: string;
  heroTitleBefore: string;
  heroTitleHighlight: string;
  heroTitleAfter: string;
  heroDescription: string;
  statTotal: string;
  statSeason: string;
  statShiny: string;
  anchorTitle: string;
  seasonLabel: string;
  dayLabel: string;
  regionLabel: string;
  shinyLabel: string;
  resultsTitle: string;
  resultsDescription: string;
  resultsCount: string;
  tableServer: string;
  tableSeason: string;
  tableDay: string;
  tableRegion: string;
  tableUpdated: string;
  emptyState: string;
  languageLabel: string;
  vietnamese: string;
  english: string;
  serverAnchorSeason: string;
};

const COPY: Record<Language, Copy> = {
  vi: {
    heroKicker: "Bảng lọc nhanh",
    heroTitleBefore: "Server cùng season với",
    heroTitleHighlight: "#1927",
    heroTitleAfter: "và có nhiệm vụ lấp lánh.",
    heroDescription: "Hiển thị các server khớp season của 1927 và đang trong chu kỳ nhiệm vụ lấp lánh.",
    statTotal: "Tổng server",
    statSeason: "Cùng season",
    statShiny: "Có nhiệm vụ lấp lánh",
    anchorTitle: "Server mốc",
    seasonLabel: "Season",
    dayLabel: "Day",
    regionLabel: "Khu vực",
    shinyLabel: "Nhiệm vụ lấp lánh",
    resultsTitle: "Kết quả phù hợp",
    resultsDescription:
      "Chỉ hiển thị server có cùng season với #1927 và đang ở chu kỳ nhiệm vụ lấp lánh để bạn nhìn nhanh trên màn hình nhỏ.",
    resultsCount: "kết quả khớp",
    tableServer: "Server",
    tableSeason: "Season",
    tableDay: "Day",
    tableRegion: "Region",
    tableUpdated: "Updated",
    emptyState: "Không tìm thấy server nào khớp bộ lọc này.",
    languageLabel: "Ngôn ngữ",
    vietnamese: "Tiếng Việt",
    english: "English",
    serverAnchorSeason: "Season của server 1927",
  },
  en: {
    heroKicker: "Fast filter dashboard",
    heroTitleBefore: "Servers in the same season as",
    heroTitleHighlight: "#1927",
    heroTitleAfter: "with shiny task.",
    heroDescription: "Shows servers matching the season of 1927 and the shiny-task cycle.",
    statTotal: "Total servers",
    statSeason: "Same season",
    statShiny: "Shiny task",
    anchorTitle: "Anchor server",
    seasonLabel: "Season",
    dayLabel: "Day",
    regionLabel: "Region",
    shinyLabel: "Shiny task",
    resultsTitle: "Matching results",
    resultsDescription:
      "Only servers that share the season with #1927 and are currently in a shiny-task cycle are shown here for quick mobile-friendly review.",
    resultsCount: "matches",
    tableServer: "Server",
    tableSeason: "Season",
    tableDay: "Day",
    tableRegion: "Region",
    tableUpdated: "Updated",
    emptyState: "No server matched this filter.",
    languageLabel: "Language",
    vietnamese: "Tiếng Việt",
    english: "English",
    serverAnchorSeason: "Server 1927 season",
  },
};

function formatDate(timestamp: number, language: Language) {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatRegions(regions?: string[]) {
  if (!regions || regions.length === 0) {
    return "TBD";
  }

  return regions
    .map((region) => region.replace(/\b\w/g, (letter) => letter.toUpperCase()))
    .join(" · ");
}

function formatServerLabel(server: {
  currentSeason: number;
  isPostSeason: boolean;
  currentWeek?: number;
}, language: Language) {
  const seasonText = language === "vi" ? "Season" : "Season";

  if (!server.currentSeason) {
    return `${seasonText} 0`;
  }

  if (server.isPostSeason) {
    return server.currentWeek
      ? `${seasonText} ${server.currentSeason} - ${language === "vi" ? "Hậu mùa" : "Post-season"} ${
          language === "vi" ? "tuần" : "week"
        } ${server.currentWeek}`
      : `${seasonText} ${server.currentSeason} - ${language === "vi" ? "Hậu mùa" : "Post-season"}`;
  }

  return server.currentWeek
    ? `${seasonText} ${server.currentSeason} - Week ${server.currentWeek}`
    : `${seasonText} ${server.currentSeason}`;
}

function LanguageToggle({ language, setLanguage, copy }: { language: Language; setLanguage: (language: Language) => void; copy: Copy }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 shadow-inner shadow-black/20 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setLanguage("vi")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          language === "vi" ? "bg-amber-400 text-slate-950 shadow" : "text-slate-300 hover:text-white"
        }`}
      >
        {copy.vietnamese}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          language === "en" ? "bg-amber-400 text-slate-950 shadow" : "text-slate-300 hover:text-white"
        }`}
      >
        {copy.english}
      </button>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 shadow-lg shadow-black/10">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default function ServerDashboard({
  anchorServer,
  sameSeasonServers,
  sameSeasonWithShinyTask,
  totalServers,
}: DashboardProps) {
  const [language, setLanguage] = useState<Language>("vi");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("lwst-language");

    if (storedLanguage === "vi" || storedLanguage === "en") {
      setLanguage(storedLanguage);
      return;
    }

    const browserLanguage = navigator.language.toLowerCase();
    setLanguage(browserLanguage.startsWith("vi") ? "vi" : "en");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lwst-language", language);
  }, [language]);

  const copy = useMemo(() => COPY[language], [language]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#07111f_42%,_#0b1220_100%)] text-slate-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <header className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-6xl">
                  {copy.heroTitleBefore} <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-sky-300 bg-clip-text text-transparent">{copy.heroTitleHighlight}</span> {copy.heroTitleAfter}
                </h1>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <div className="py-2 text-xs text-slate-300 shadow-sm">
                <LanguageToggle language={language} setLanguage={setLanguage} copy={copy} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard label={copy.statTotal} value={totalServers.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} />
            <MetricCard label={copy.statSeason} value={sameSeasonServers.length.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} />
            <MetricCard label={copy.statShiny} value={sameSeasonWithShinyTask.length.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} />
          </div>
        </header>

        <section className="grid gap-4">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="border-b border-white/10 px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{copy.resultsTitle}</h2>
                </div>
                <div className="py-2 text-sm text-slate-200">
                  <span className="font-semibold text-white">{sameSeasonWithShinyTask.length}</span>
                  <span className="ml-2 text-slate-400">{copy.resultsCount}</span>
                </div>
              </div>
            </div>

            <div className="hidden grid-cols-[96px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-0 border-b border-white/10 bg-white/5 px-4 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 md:grid md:px-6">
              <div>{copy.tableServer}</div>
              <div>{copy.tableSeason}</div>
              <div>{copy.tableDay}</div>
              <div>{copy.tableRegion}</div>
            </div>

            {sameSeasonWithShinyTask.length > 0 ? (
              <div className="divide-y divide-white/8">
                {sameSeasonWithShinyTask.map((server) => {
                  const isAnchor = server.id === anchorServer.id;

                  return (
                    <div
                      key={server.id}
                      className={`grid grid-cols-1 gap-3 px-4 py-5 text-base transition md:grid-cols-[96px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] md:px-6 md:text-[15px] ${
                        isAnchor ? "bg-amber-400/10" : "bg-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between md:block">
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-base font-black tracking-tight text-amber-200 shadow-sm shadow-black/20 md:text-lg">
                          <span className="text-amber-300">#</span>
                          <span>{server.id}</span>
                        </div>
                        <div className="md:hidden rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          {copy.shinyLabel}
                        </div>
                      </div>
                      <div className="text-slate-200">{formatServerLabel(server, language)}</div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span>
                          {copy.dayLabel} {server.serverDay}
                        </span>
                        <span className="hidden rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 md:inline-flex">
                          {copy.shinyLabel}
                        </span>
                      </div>
                      <div className="text-slate-300">{formatRegions(server.region)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-16 text-center text-sm text-slate-400 md:px-6">{copy.emptyState}</div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}