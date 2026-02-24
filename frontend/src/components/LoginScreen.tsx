"use client";
import { useState } from "react";
import { getLoginUrl } from "@/lib/api";

const S = {
  page: { minHeight: "100vh", display: "flex", background: "#0d0d0f", fontFamily: "'Geist', sans-serif" } as React.CSSProperties,
  left: { width: 480, padding: "48px 56px", display: "flex", flexDirection: "column" as const, justifyContent: "center", borderRight: "1px solid #1c1c22" },
  right: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" as const, overflow: "hidden" },
};

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await getLoginUrl();
      window.location.href = res.data.url;
    } catch (e: any) {
      setError(e.response?.data?.detail || "Backend offline. Inicie o servidor Python.");
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.left}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 56 }}>
          <div style={{ width: 24, height: 24, background: "#5b67f8", borderRadius: 6, display: "grid", placeItems: "center" }}>
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>V</span>
          </div>
          <span style={{ color: "#525264", fontSize: 12, letterSpacing: "0.12em", fontFamily: "'Geist Mono'" }}>VOIDMAIL</span>
        </div>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 600, color: "#e2e2e8", lineHeight: 1.2, marginBottom: 12, letterSpacing: "-0.02em" }}>
            Inbox analyser
          </h1>
          <p style={{ color: "#525264", fontSize: 14, lineHeight: 1.6 }}>
            Detecta remetentes tóxicos, analisa padrões e limpa sua inbox em lote. Roda 100% local.
          </p>
        </div>

        <div style={{ marginBottom: 32 }}>
          {[
            { icon: "⬡", text: "OAuth2 oficial do Google" },
            { icon: "⬡", text: "Nenhum dado sai da sua máquina" },
            { icon: "⬡", text: "Token salvo localmente em token.pickle" },
          ].map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ color: "#5b67f8", fontSize: 10 }}>●</span>
              <span style={{ color: "#6b6b80", fontSize: 13 }}>{item.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            padding: "11px 0", width: "100%",
            background: loading ? "#1c1c22" : "#5b67f8",
            border: "none", borderRadius: 8,
            color: loading ? "#525264" : "#fff",
            fontSize: 14, fontWeight: 500, fontFamily: "'Geist'",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
            letterSpacing: "-0.01em",
          }}
        >
          {loading ? "Redirecionando…" : "Conectar Gmail"}
        </button>

        {error && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8 }}>
            <p style={{ color: "#ef4444", fontSize: 12, fontFamily: "'Geist Mono'" }}>{error}</p>
          </div>
        )}

        <p style={{ marginTop: 16, color: "#2a2a35", fontSize: 11, fontFamily: "'Geist Mono'" }}>
          Requer credentials.json em backend/
        </p>
      </div>

      <div style={S.right}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.25 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1c1c22" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{
            width: 200, height: 200, margin: "0 auto",
            background: "radial-gradient(circle, rgba(91,103,248,0.08) 0%, transparent 70%)",
            border: "1px solid #1c1c22", borderRadius: "50%",
            display: "grid", placeItems: "center",
          }}>
            <div style={{
              width: 80, height: 80,
              background: "#13131a", border: "1px solid #2a2a35",
              borderRadius: 20, display: "grid", placeItems: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#525264" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
          </div>
          <p style={{ marginTop: 20, color: "#2a2a35", fontSize: 11, letterSpacing: "0.15em", fontFamily: "'Geist Mono'" }}>INBOX ANALYSER</p>
        </div>
      </div>
    </div>
  );
}