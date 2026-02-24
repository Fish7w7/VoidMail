"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Sender } from "@/lib/api";

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#18181f", border: "1px solid #2a2a35", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#e2e2e8", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{d.domain}</p>
      <p style={{ color: "#5b67f8", fontSize: 12, fontFamily: "'Geist Mono'" }}>{d.count} emails · {d.pct}%</p>
    </div>
  );
};

const col = (s: number) => s >= 70 ? "#ef4444" : s >= 40 ? "#f59e0b" : "#22c55e";

export default function TopSendersChart({ senders }: { senders: Sender[] }) {
  const data = senders.slice(0, 10).map(s => ({
    domain: s.domain.length > 14 ? s.domain.slice(0, 14) + "…" : s.domain,
    count: s.count, pct: s.percentage, score: s.score,
  }));

  return (
    <div style={{ background: "#111114", border: "1px solid #1c1c22", borderRadius: 10, padding: 24, height: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: "#525264", fontSize: 10, letterSpacing: "0.12em", fontFamily: "'Geist Mono'", marginBottom: 4 }}>TOP REMETENTES</p>
        <p style={{ color: "#e2e2e8", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Volume por domínio</p>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
          <XAxis dataKey="domain" tick={{ fill: "#525264", fontSize: 9, fontFamily: "'Geist Mono'" }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: "#2a2a35", fontSize: 9, fontFamily: "'Geist Mono'" }} axisLine={false} tickLine={false}/>
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(91,103,248,0.04)" }}/>
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={col(d.score)} fillOpacity={0.8}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        {[["#ef4444","Alto risco"],["#f59e0b","Moderado"],["#22c55e","Baixo risco"]].map(([c,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: c }}/>
            <span style={{ color: "#525264", fontSize: 11 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}