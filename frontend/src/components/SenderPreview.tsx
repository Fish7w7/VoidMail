"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSenderMessages, SenderMessage, Sender } from "@/lib/api";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ScoreBadge({ score }: { score: number }) {
  const c  = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const bg = score >= 70 ? "rgba(239,68,68,0.08)" : score >= 40 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";
  const label = score >= 70 ? "Alto risco" : score >= 40 ? "Moderado" : "Baixo risco";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: bg, border: `1px solid ${c}22`, color: c, fontSize: 11, fontFamily: "'Geist Mono'", fontWeight: 600 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
      {label} · {score}
    </span>
  );
}

function MessageCard({ msg, index }: { msg: SenderMessage; index: number }) {
  return (
    <div style={{
      padding: "14px 16px",
      background: "#0f0f12",
      border: "1px solid #1c1c22",
      borderRadius: 8,
      animation: `slideIn 0.2s ease ${index * 0.04}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <p style={{ color: "#c2c2cc", fontSize: 13, fontWeight: 500, lineHeight: 1.4, flex: 1, letterSpacing: "-0.01em" }}>
          {msg.subject}
        </p>
        <span style={{ color: "#3a3a5c", fontSize: 10, fontFamily: "'Geist Mono'", whiteSpace: "nowrap", flexShrink: 0, paddingTop: 2 }}>
          {formatDate(msg.date)}
        </span>
      </div>
      {msg.snippet && (
        <p style={{ color: "#525264", fontSize: 11, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
          {msg.snippet}
        </p>
      )}
    </div>
  );
}

interface Props {
  sender:  Sender;
  onClose: () => void;
}

export default function SenderPreview({ sender, onClose }: Props) {
  const [messages, setMessages] = useState<SenderMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [mounted,  setMounted]  = useState(false);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    setMounted(true);
    // Pequeno delay para a animação de entrada funcionar
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    getSenderMessages(sender.email, 10)
      .then((r) => setMessages(r.data.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [sender.email]);

  // Fechar com Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes slideIn    { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes drawerIn   { from { transform: translateX(100%); opacity: 0; } to  { transform: translateX(0);    opacity: 1; } }
        @keyframes drawerOut  { from { transform: translateX(0);    opacity: 1; } to  { transform: translateX(100%); opacity: 0; } }
        @keyframes overlayIn  { from { opacity: 0; } to  { opacity: 1; } }
        @keyframes overlayOut { from { opacity: 1; } to  { opacity: 0; } }
      `}</style>

      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
          animation: `${visible ? "overlayIn" : "overlayOut"} 0.28s ease forwards`,
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 9999,
        width: 400, maxWidth: "90vw",
        background: "#111114",
        borderLeft: "1px solid #1c1c22",
        boxShadow: "-32px 0 80px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column",
        animation: `${visible ? "drawerIn" : "drawerOut"} 0.28s cubic-bezier(0.16,1,0.3,1) forwards`,
      }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1c1c22", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "#e2e2e8", fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sender.name}
              </p>
              <p style={{ color: "#525264", fontSize: 11, fontFamily: "'Geist Mono'", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sender.email}
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{ width: 28, height: 28, display: "grid", placeItems: "center", background: "transparent", border: "1px solid #1c1c22", borderRadius: 7, color: "#525264", fontSize: 16, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2a2a35"; e.currentTarget.style.color = "#c2c2cc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1c1c22"; e.currentTarget.style.color = "#525264"; }}
            >
              ×
            </button>
          </div>

          {/* Stats rápidos */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <ScoreBadge score={sender.score} />
            <span style={{ color: "#3a3a5c", fontSize: 11, fontFamily: "'Geist Mono'" }}>
              {sender.count} emails · {sender.percentage}% do total
            </span>
          </div>
        </div>

        {/* Label da seção */}
        <div style={{ padding: "14px 24px 10px", flexShrink: 0 }}>
          <p style={{ color: "#2a2a35", fontSize: 10, letterSpacing: "0.12em", fontFamily: "'Geist Mono'" }}>
            ÚLTIMAS MENSAGENS
          </p>
        </div>

        {/* Lista de mensagens */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            // Skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 16px", background: "#0f0f12", border: "1px solid #1c1c22", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 12, width: "75%", borderRadius: 4, background: "linear-gradient(90deg,#1c1c22 25%,#252530 50%,#1c1c22 75%)", backgroundSize: "200% 100%", animation: `shimmer 1.5s ease ${i * 0.08}s infinite` }} />
                <div style={{ height: 10, width: "55%", borderRadius: 4, background: "linear-gradient(90deg,#1c1c22 25%,#252530 50%,#1c1c22 75%)", backgroundSize: "200% 100%", animation: `shimmer 1.5s ease ${i * 0.08}s infinite` }} />
                <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              </div>
            ))
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#2a2a35", fontSize: 12, fontFamily: "'Geist Mono'" }}>
              Nenhuma mensagem encontrada na inbox
            </div>
          ) : (
            messages.map((msg, i) => <MessageCard key={msg.message_id} msg={msg} index={i} />)
          )}
        </div>

        {/* Rodapé com atalho de teclado */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #1c1c22", flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
          <span style={{ color: "#2a2a35", fontSize: 10, fontFamily: "'Geist Mono'" }}>
            ESC para fechar
          </span>
        </div>
      </div>
    </>,
    document.body
  );
}