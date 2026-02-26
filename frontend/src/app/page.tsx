"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { getAuthStatus, getStats, getMoreStats, logout, Stats, Sender } from "@/lib/api";
import { ToastProvider, useToast } from "@/contexts/ToastContext";
import LoginScreen from "@/components/LoginScreen";
import SkeletonDashboard from "@/components/SkeletonDashboard";
import HealthScore from "@/components/HealthScore";
import TopSendersChart from "@/components/TopSendersChart";
import TimelineChart from "@/components/Timelinechart.";
import SendersTable from "@/components/SendersTable";

type View = "checking" | "login" | "loading" | "dashboard" | "error";

const PERIODS = [
  { value: "7d",  label: "7d"    },
  { value: "30d", label: "30d"   },
  { value: "90d", label: "90d"   },
  { value: "6m",  label: "6m"    },
  { value: "1y",  label: "1 ano" },
  { value: "all", label: "Tudo"  },
];

// Merge de senders: soma counts de quem já existe, adiciona novos, recalcula percentagens
function mergeSenders(existing: Sender[], incoming: Sender[]): Sender[] {
  const map = new Map<string, Sender>();
  for (const s of existing) map.set(s.email, { ...s });
  for (const s of incoming) {
    if (map.has(s.email)) {
      const cur = map.get(s.email)!;
      map.set(s.email, {
        ...cur,
        count:       cur.count + s.count,
        promo_ratio: (cur.promo_ratio + s.promo_ratio) / 2,
        score:       Math.max(cur.score, s.score),
      });
    } else {
      map.set(s.email, { ...s });
    }
  }
  const merged = Array.from(map.values()).sort((a, b) => b.count - a.count);
  const total  = merged.reduce((sum, s) => sum + s.count, 0);
  return merged.map((s) => ({
    ...s,
    percentage: total > 0 ? Math.round((s.count / total) * 1000) / 10 : 0,
  }));
}

function PeriodPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#0d0d0f", border: "1px solid #1c1c22", borderRadius: 8, padding: 3 }}>
      {PERIODS.map((p) => {
        const active = value === p.value;
        return (
          <button key={p.value} onClick={() => onChange(p.value)} style={{
            padding: "4px 11px", fontSize: 11, fontFamily: "'Geist Mono'",
            fontWeight: active ? 600 : 400, border: "none", cursor: "pointer",
            borderRadius: 6, transition: "all 0.1s",
            background: active ? "#5b67f8" : "transparent",
            color: active ? "#fff" : "#525264",
          }}>
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 22, height: 22, background: "#5b67f8", borderRadius: 5, display: "grid", placeItems: "center" }}>
        <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>V</span>
      </div>
      <span style={{ color: "#2a2a35", fontSize: 11, letterSpacing: "0.12em", fontFamily: "'Geist Mono'" }}>VOIDMAIL</span>
    </div>
  );
}

function HeaderActions({ onRefresh, onLogout, disabled }: { onRefresh?: () => void; onLogout?: () => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {([["↻ Atualizar", onRefresh], ["Desconectar", onLogout]] as [string, (() => void) | undefined][]).map(([label, fn]) => (
        <button key={label} onClick={fn} disabled={disabled || !fn}
          style={{ background: "none", border: "none", cursor: disabled ? "not-allowed" : "pointer", color: disabled ? "#2a2a35" : "#525264", fontSize: 12, fontFamily: "'Geist'" }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Dashboard() {
  const [view,        setView]        = useState<View>("checking");
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [error,       setError]       = useState("");
  const [period,      setPeriod]      = useState("all");
  const [customAfter, setCustomAfter] = useState("");

  // Estado de paginação elevado — atualiza score, chart e tabela em sincronia
  const [allSenders,  setAllSenders]  = useState<Sender[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [nextToken,   setNextToken]   = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [healthScore, setHealthScore] = useState(0);

  const { addToast } = useToast();

  const periodRef      = useRef(period);
  const customAfterRef = useRef(customAfter);
  periodRef.current      = period;
  customAfterRef.current = customAfter;

  const loadStats = useCallback(async (overridePeriod?: string, overrideAfter?: string) => {
    setView("loading");
    const activePeriod = overridePeriod ?? periodRef.current;
    const activeAfter  = overrideAfter  ?? customAfterRef.current;
    try {
      const r = await getStats(
        300,
        activePeriod !== "custom" ? activePeriod : undefined,
        activePeriod === "custom" ? activeAfter  : undefined,
      );
      const data = r.data;
      setStats(data);
      setAllSenders(data.senders);
      setTotalLoaded(data.total_emails);
      setNextToken(data.next_page_token ?? null);
      setHasMore(data.has_more ?? false);
      setHealthScore(data.health_score);
      setView("dashboard");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Erro ao carregar dados.");
      setView("error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = useCallback(async () => {
    try {
      const r = await getAuthStatus();
      if (r.data.authenticated) loadStats();
      else setView("login");
    } catch { setView("login"); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("auth") === "success") window.history.replaceState({}, "", "/");
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Feature 2: carregar mais — atualiza tudo no nível do Dashboard
  const handleLoadMore = useCallback(async () => {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const activePeriod = periodRef.current;
      const activeAfter  = customAfterRef.current;
      const r = await getMoreStats(
        nextToken, 300,
        activePeriod !== "custom" ? activePeriod : undefined,
        activePeriod === "custom" ? activeAfter  : undefined,
      );
      const data = r.data;

      setAllSenders((prev) => mergeSenders(prev, data.senders));
      setTotalLoaded((n) => n + data.total_emails);
      setNextToken(data.next_page_token ?? null);
      setHasMore(data.has_more ?? false);

      // Atualiza health score e unique_senders se o backend retornou
      if (data.health_score !== null) setHealthScore(data.health_score);
      if (stats) {
        setStats((prev) => prev ? {
          ...prev,
          unique_senders: data.unique_senders + prev.unique_senders,
        } : prev);
      }

      addToast(`+${data.total_emails} emails carregados`, "info");
    } catch (e: any) {
      addToast(e?.response?.data?.detail ?? "Erro ao carregar mais.", "error");
    } finally {
      setLoadingMore(false);
    }
  }, [nextToken, loadingMore, stats, addToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    periodRef.current = p;
    if (p !== "custom") loadStats(p);
  };

  const handleCustomAfter = (d: string) => {
    setCustomAfter(d);
    customAfterRef.current = d;
    if (d) {
      setPeriod("custom");
      periodRef.current = "custom";
      loadStats("custom", d);
    }
  };

  const handleLogout = async () => {
    await logout();
    setStats(null);
    setView("login");
  };

  if (view === "checking" || view === "loading") {
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ minHeight: "100vh", background: "#0d0d0f" }}>
          <header style={{ padding: "0 32px", height: 52, borderBottom: "1px solid #1c1c22", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(13,13,15,0.9)", backdropFilter: "blur(12px)", zIndex: 10 }}>
            <Logo />
            <HeaderActions disabled />
          </header>
          <SkeletonDashboard />
        </div>
      </>
    );
  }

  if (view === "login") return <LoginScreen />;

  if (view === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d0f" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontFamily: "'Geist Mono'", fontSize: 13, marginBottom: 12 }}>{error}</p>
          <button onClick={() => loadStats()} style={{ color: "#5b67f8", background: "none", border: "none", cursor: "pointer", fontFamily: "'Geist Mono'", fontSize: 12 }}>
            tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const uniqueSenders = stats.unique_senders;
  const periodLabel   =
    period === "all"  ? "todo o período"         :
    period === "7d"   ? "últimos 7 dias"          :
    period === "30d"  ? "últimos 30 dias"         :
    period === "90d"  ? "últimos 90 dias"         :
    period === "6m"   ? "últimos 6 meses"         :
    period === "1y"   ? "último ano"              :
    customAfter       ? `a partir de ${customAfter}` :
    "todo o período";

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <header style={{
        padding: "0 24px 0 32px", height: 52,
        borderBottom: "1px solid #1c1c22",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: "rgba(13,13,15,0.9)",
        backdropFilter: "blur(12px)", zIndex: 10, gap: 16,
      }}>
        <Logo />

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" }}>
          <PeriodPicker value={period} onChange={handlePeriodChange} />
          <button
            onClick={() => handlePeriodChange("custom")}
            style={{
              padding: "4px 10px", fontSize: 11, fontFamily: "'Geist Mono'",
              background: period === "custom" ? "rgba(91,103,248,0.1)" : "transparent",
              border: `1px solid ${period === "custom" ? "rgba(91,103,248,0.3)" : "#1c1c22"}`,
              borderRadius: 7, color: period === "custom" ? "#5b67f8" : "#525264",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Personalizado
          </button>
          {period === "custom" && (
            <input
              type="date"
              value={customAfter}
              onChange={(e) => handleCustomAfter(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              style={{
                padding: "4px 10px", fontSize: 11, fontFamily: "'Geist Mono'",
                background: "#0d0d0f", border: "1px solid #2a2a35",
                borderRadius: 7, color: "#e2e2e8", cursor: "pointer",
                colorScheme: "dark", outline: "none",
              }}
            />
          )}
        </div>

        <HeaderActions onRefresh={() => loadStats()} onLogout={handleLogout} />
      </header>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "36px 32px 56px" }}>
        <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease forwards" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#e2e2e8", letterSpacing: "-0.03em", marginBottom: 4 }}>
            Visão geral da inbox
          </h1>
          <p style={{ color: "#525264", fontSize: 13 }}>
            {/* Atualiza em tempo real conforme carrega mais */}
            {totalLoaded} emails · {uniqueSenders} remetentes
            <span style={{ color: "#2a2a35", margin: "0 6px" }}>·</span>
            <span style={{ color: "#3a3a5c", fontFamily: "'Geist Mono'", fontSize: 11 }}>{periodLabel}</span>
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16, animation: "fadeUp 0.4s ease 0.05s both" }}>
          {/* healthScore e totalLoaded são o estado elevado — atualizam ao carregar mais */}
          <HealthScore score={healthScore} totalEmails={totalLoaded} uniqueSenders={uniqueSenders} />
          <TopSendersChart senders={allSenders} />
        </div>

        {/* Feature 8: gráfico de evolução temporal */}
        <div style={{ marginBottom: 16, animation: "fadeUp 0.4s ease 0.08s both" }}>
          <TimelineChart
            period={period !== "custom" ? period : undefined}
            afterDate={period === "custom" ? customAfter : undefined}
          />
        </div>

        <div style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
          <SendersTable
            senders={allSenders}
            initialTotal={stats.total_emails}
            totalLoaded={totalLoaded}
            nextPageToken={nextToken}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
          />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}