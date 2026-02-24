"use client";

interface Props { score: number; totalEmails: number; uniqueSenders: number; }

function badge(score: number) {
  if (score >= 75) return { label: "Saudável", color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.15)" };
  if (score >= 50) return { label: "Moderado", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)" };
  if (score >= 25) return { label: "Tóxico",   color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.15)" };
  return              { label: "Crítico",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.2)" };
}

export default function HealthScore({ score, totalEmails, uniqueSenders }: Props) {
  const b = badge(score);
  const r = 44, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ background: "#111114", border: "1px solid #1c1c22", borderRadius: 10, padding: 24, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <p style={{ color: "#525264", fontSize: 10, letterSpacing: "0.12em", fontFamily: "'Geist Mono'", marginBottom: 4 }}>INBOX HEALTH</p>
          <p style={{ color: "#e2e2e8", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Score de saúde</p>
        </div>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: b.bg, border: `1px solid ${b.border}`, color: b.color, fontFamily: "'Geist Mono'" }}>
          {b.label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#1c1c22" strokeWidth="6"/>
            <circle cx="50" cy="50" r={r} fill="none" stroke={b.color} strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}/>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: b.color, fontSize: 26, fontWeight: 700, fontFamily: "'Geist Mono'", lineHeight: 1 }}>{score}</span>
            <span style={{ color: "#525264", fontSize: 10, fontFamily: "'Geist Mono'" }}>/100</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[{ label: "Emails analisados", value: totalEmails.toLocaleString("pt-BR") },
            { label: "Remetentes únicos", value: uniqueSenders.toLocaleString("pt-BR") }]
            .map(({ label, value }) => (
              <div key={label}>
                <p style={{ color: "#525264", fontSize: 11, marginBottom: 2 }}>{label}</p>
                <p style={{ color: "#5b67f8", fontSize: 22, fontWeight: 600, fontFamily: "'Geist Mono'" }}>{value}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}