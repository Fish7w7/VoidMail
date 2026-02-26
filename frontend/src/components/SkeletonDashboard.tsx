"use client";

function Shimmer({ width, height, borderRadius = 6, style = {} }: {
  width: string | number;
  height: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width, height, borderRadius, flexShrink: 0,
      background: "linear-gradient(90deg, #1c1c22 25%, #252530 50%, #1c1c22 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.6s ease-in-out infinite",
      ...style,
    }} />
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#111114", border: "1px solid #1c1c22", borderRadius: 10, padding: 24, ...style }}>
      {children}
    </div>
  );
}

function HealthScoreSkeleton() {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Shimmer width={80} height={10} />
          <Shimmer width={140} height={18} />
        </div>
        <Shimmer width={68} height={26} borderRadius={20} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{
          width: 100, height: 100, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(90deg, #1c1c22 25%, #252530 50%, #1c1c22 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.6s ease-in-out infinite",
        }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Shimmer width={100} height={10} />
            <Shimmer width={56} height={28} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Shimmer width={110} height={10} />
            <Shimmer width={40} height={28} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  const bars = [90, 70, 110, 55, 80, 45, 100, 65, 40, 75];
  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        <Shimmer width={100} height={10} />
        <Shimmer width={180} height={18} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 190, paddingTop: 16 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{
              height: h, borderRadius: "3px 3px 0 0",
              background: "linear-gradient(90deg, #1c1c22 25%, #252530 50%, #1c1c22 75%)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.6s ease-in-out ${i * 0.05}s infinite`,
            }} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function TimelineSkeleton() {
  // Linha ondulada fake em SVG
  const points = [40, 55, 35, 65, 45, 70, 50, 80, 45, 60, 35, 75, 55, 85, 50, 65, 40, 70, 45, 55];
  const step = 100 / (points.length - 1);
  const pathD = points.map((y, i) => `${i === 0 ? "M" : "L"} ${i * step} ${100 - y}`).join(" ");

  return (
    <Card style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Shimmer width={70} height={10} />
          <Shimmer width={240} height={18} />
        </div>
        <Shimmer width={120} height={28} borderRadius={7} />
      </div>
      {/* Linha de pico */}
      <Shimmer width={200} height={10} style={{ marginBottom: 20 }} />
      {/* Área do gráfico */}
      <div style={{ position: "relative", height: 140 }}>
        {/* Grid lines horizontais */}
        {[20, 50, 80].map((top) => (
          <div key={top} style={{
            position: "absolute", left: 0, right: 0, top: `${top}%`, height: 1,
            background: "linear-gradient(90deg, #1c1c22 25%, #252530 50%, #1c1c22 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s ease-in-out infinite",
          }} />
        ))}
        {/* Linha fake */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }}>
          <path d={pathD} fill="none" stroke="#5b67f8" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        {/* Labels do eixo X */}
        <div style={{ position: "absolute", bottom: -18, left: 0, right: 0, display: "flex", justifyContent: "space-between" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Shimmer key={i} width={32} height={8} style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function TableRowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <tr style={{ borderBottom: "1px solid #18181f" }}>
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Shimmer width={140} height={12} style={{ animationDelay: `${delay}s` }} />
          <Shimmer width={180} height={10} style={{ animationDelay: `${delay}s` }} />
        </div>
      </td>
      <td style={{ padding: "13px 16px", textAlign: "center" }}>
        <Shimmer width={32} height={16} style={{ margin: "0 auto", animationDelay: `${delay}s` }} />
      </td>
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shimmer width={48} height={4} borderRadius={2} style={{ animationDelay: `${delay}s` }} />
          <Shimmer width={34} height={10} style={{ animationDelay: `${delay}s` }} />
        </div>
      </td>
      <td style={{ padding: "13px 16px" }}>
        <Shimmer width={52} height={22} borderRadius={20} style={{ animationDelay: `${delay}s` }} />
      </td>
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Shimmer width={72} height={28} borderRadius={6} style={{ animationDelay: `${delay}s` }} />
          <Shimmer width={60} height={28} borderRadius={6} style={{ animationDelay: `${delay}s` }} />
        </div>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div style={{ background: "#111114", border: "1px solid #1c1c22", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #1c1c22", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Shimmer width={80} height={10} />
          <Shimmer width={160} height={18} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Shimmer width={160} height={34} borderRadius={8} />
          <Shimmer width={130} height={34} borderRadius={8} />
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #18181f" }}>
            {["Remetente", "Emails", "% Total", "Score", "Ações"].map((h) => (
              <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, fontFamily: "'Geist Mono'", color: "#2a2a35", letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRowSkeleton key={i} delay={i * 0.07} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SkeletonDashboard() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "36px 32px 56px" }}>
        {/* Título */}
        <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", gap: 8 }}>
          <Shimmer width={260} height={24} />
          <Shimmer width={200} height={13} />
        </div>
        {/* Cards de score e chart */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <HealthScoreSkeleton />
          <ChartSkeleton />
        </div>
        {/* Timeline — largura total */}
        <div style={{ marginBottom: 16 }}>
          <TimelineSkeleton />
        </div>
        {/* Tabela */}
        <TableSkeleton />
      </main>
    </>
  );
}