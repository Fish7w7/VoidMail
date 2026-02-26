"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getTimeline, TimelinePoint } from "@/lib/api";

type Granularity = "weekly" | "monthly";

function formatXLabel(value: string, granularity: Granularity): string {
  if (granularity === "monthly") {
    // "2024-03" → "Mar 24"
    const [y, m] = value.split("-");
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
  }
  // "2024-03-11" → "11/03"
  const [, m, d] = value.split("-");
  return `${d}/${m}`;
}

function formatTooltipLabel(value: string, granularity: Granularity): string {
  if (granularity === "monthly") {
    const [y, m] = value.split("-");
    const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    return `${months[parseInt(m) - 1]} ${y}`;
  }
  const [y, m, d] = value.split("-");
  return `Semana de ${d}/${m}/${y}`;
}

interface CustomTooltipProps {
  active?:  boolean;
  payload?: { value: number }[];
  label?:   string;
  granularity: Granularity;
}

function CustomTooltip({ active, payload, label, granularity }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div style={{
      background: "#111114", border: "1px solid #2a2a35",
      borderRadius: 8, padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      <p style={{ color: "#525264", fontSize: 11, fontFamily: "'Geist Mono'", marginBottom: 6 }}>
        {formatTooltipLabel(label, granularity)}
      </p>
      <p style={{ color: "#5b67f8", fontSize: 18, fontWeight: 600, fontFamily: "'Geist Mono'", letterSpacing: "-0.02em" }}>
        {payload[0].value}
        <span style={{ color: "#525264", fontSize: 11, fontWeight: 400, marginLeft: 4 }}>emails</span>
      </p>
    </div>
  );
}

interface Props {
  period?:    string;
  afterDate?: string;
}

export default function TimelineChart({ period, afterDate }: Props) {
  const [data,        setData]        = useState<{ weekly: TimelinePoint[]; monthly: TimelinePoint[] } | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [granularity, setGranularity] = useState<Granularity>("weekly");
  const [error,       setError]       = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getTimeline(
      500,
      period !== "custom" ? period : undefined,
      period === "custom" ? afterDate : undefined,
    )
      .then((r) => {
        setData(r.data);
        // Se poucas semanas (< 8 pontos), usa mensal automaticamente
        if (r.data.weekly.length < 8 && r.data.monthly.length > 0) {
          setGranularity("monthly");
        } else {
          setGranularity("weekly");
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [period, afterDate]);

  const points = data?.[granularity] ?? [];

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ background: "#111114", border: "1px solid #1c1c22", borderRadius: 10, padding: "24px 28px", height: 220 }}>
        <div style={{ height: 10, width: 120, background: "#1c1c22", borderRadius: 4, marginBottom: 6, animation: "shimmer 1.5s infinite linear", backgroundImage: "linear-gradient(90deg,#1c1c22 25%,#22222a 50%,#1c1c22 75%)", backgroundSize: "200% 100%" }} />
        <div style={{ height: 28, width: 180, background: "#1c1c22", borderRadius: 4, marginBottom: 20, animation: "shimmer 1.5s infinite linear", backgroundImage: "linear-gradient(90deg,#1c1c22 25%,#22222a 50%,#1c1c22 75%)", backgroundSize: "200% 100%" }} />
        <div style={{ height: 110, background: "#1c1c22", borderRadius: 6, animation: "shimmer 1.5s infinite linear", backgroundImage: "linear-gradient(90deg,#1c1c22 25%,#22222a 50%,#1c1c22 75%)", backgroundSize: "200% 100%" }} />
      </div>
    );
  }

  // ─── Sem dados ───────────────────────────────────────────────────────────

  if (error || points.length === 0) {
    return (
      <div style={{ background: "#111114", border: "1px solid #1c1c22", borderRadius: 10, padding: "24px 28px", height: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "#525264", fontSize: 10, letterSpacing: "0.12em", fontFamily: "'Geist Mono'", marginBottom: 4 }}>EVOLUÇÃO</p>
          <p style={{ color: "#e2e2e8", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Volume ao longo do tempo</p>
        </div>
        <p style={{ color: "#2a2a35", fontSize: 12, fontFamily: "'Geist Mono'", textAlign: "center", paddingBottom: 20 }}>
          {error ? "Erro ao carregar dados" : "Dados insuficientes para o período selecionado"}
        </p>
      </div>
    );
  }

  // ─── Calcula pico para anotação ──────────────────────────────────────────

  const peak = points.reduce((a, b) => (b.count > a.count ? b : a), points[0]);

  return (
    <div style={{ background: "#111114", border: "1px solid #1c1c22", borderRadius: 10, padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ color: "#525264", fontSize: 10, letterSpacing: "0.12em", fontFamily: "'Geist Mono'", marginBottom: 4 }}>EVOLUÇÃO</p>
          <p style={{ color: "#e2e2e8", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Volume ao longo do tempo</p>
        </div>
        {/* Toggle granularidade */}
        <div style={{ display: "flex", background: "#0d0d0f", border: "1px solid #1c1c22", borderRadius: 7, padding: 3, gap: 2 }}>
          {(["weekly", "monthly"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              disabled={g === "weekly" ? data!.weekly.length === 0 : data!.monthly.length === 0}
              style={{
                padding: "3px 10px", fontSize: 11, fontFamily: "'Geist Mono'",
                border: "none", cursor: "pointer", borderRadius: 5, transition: "all 0.1s",
                background: granularity === g ? "#5b67f8" : "transparent",
                color: granularity === g ? "#fff" : "#525264",
              }}
            >
              {g === "weekly" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      {/* Pico */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        <span style={{ color: "#3a3a5c", fontSize: 11, fontFamily: "'Geist Mono'" }}>pico:</span>
        <span style={{ color: "#5b67f8", fontSize: 12, fontFamily: "'Geist Mono'", fontWeight: 600 }}>{peak.count} emails</span>
        <span style={{ color: "#2a2a35", fontSize: 11, fontFamily: "'Geist Mono'" }}>
          em {formatTooltipLabel(peak.date, granularity).toLowerCase()}
        </span>
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={points} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#1c1c22" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatXLabel(v, granularity)}
            tick={{ fill: "#2a2a35", fontSize: 10, fontFamily: "'Geist Mono'" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#2a2a35", fontSize: 10, fontFamily: "'Geist Mono'" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<CustomTooltip granularity={granularity} />}
            cursor={{ stroke: "#2a2a35", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#5b67f8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#5b67f8", stroke: "#111114", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}