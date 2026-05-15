"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sender, blockSender, deleteSender, blockAndDelete, unblockSender, previewAction, ActionPreview } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import SenderPreview from "./SenderPreview";

const ACTIONS = {
  block:  { label: "Bloquear",          color: "#f59e0b", confirm: "Criar filtro para enviar emails futuros direto para lixeira?" },
  delete: { label: "Limpar",            color: "#6b6b80", confirm: "Apagar todo o histórico deste remetente permanentemente?" },
  both:   { label: "Bloquear + Limpar", color: "#ef4444", confirm: "Bloquear e apagar todo o histórico deste remetente?" },
};

const REMOVE_DELAY    = 1500;
const ANIM_DURATION   = 400;

function Score({ s }: { s: number }) {
  const c  = s >= 70 ? "#ef4444" : s >= 40 ? "#f59e0b" : "#22c55e";
  const bg = s >= 70 ? "rgba(239,68,68,0.07)" : s >= 40 ? "rgba(245,158,11,0.07)" : "rgba(34,197,94,0.07)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "'Geist Mono'", padding: "3px 9px", borderRadius: 20, background: bg, color: c }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: c, display: "inline-block" }} />
      {s}
    </span>
  );
}

function Btn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{ fontSize: 11, fontFamily: "'Geist'", fontWeight: 500, padding: "5px 11px", borderRadius: 6, cursor: "pointer", border: `1px solid ${color}22`, color, background: "transparent", transition: "background 0.1s", whiteSpace: "nowrap" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = `${color}0f`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}

function ConfirmModal({ sender, action, onConfirm, onCancel, loading }: {
  sender: Sender; action: keyof typeof ACTIONS;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const a = ACTIONS[action];
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onCancel(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [loading, onCancel]);

  useEffect(() => {
    setPreview(null);
    setPreviewError("");
    previewAction(sender.email, action)
      .then((r) => setPreview(r.data))
      .catch((e) => setPreviewError(e?.response?.data?.detail ?? "Nao foi possivel carregar a previa."));
  }, [action, sender.email]);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={() => !loading && onCancel()}>
      <div style={{ background: "#111114", border: "1px solid #2a2a35", borderRadius: 12, padding: "28px 32px", width: 380, boxShadow: "0 32px 80px rgba(0,0,0,0.6)", animation: "modalIn 0.15s ease" }}
        onClick={(e) => e.stopPropagation()}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>
        <p style={{ color: "#e2e2e8", fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.02em" }}>{a.label}</p>
        <p style={{ color: "#525264", fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>{a.confirm}</p>
        <p style={{ color: "#2a2a35", fontSize: 12, fontFamily: "'Geist Mono'", marginBottom: 16 }}>{sender.email}</p>
        <div style={{ padding: "12px 14px", border: "1px solid #1c1c22", borderRadius: 8, background: "#0d0d0f", marginBottom: 18 }}>
          {preview ? (
            <>
              <p style={{ color: "#c2c2cc", fontSize: 12, lineHeight: 1.5 }}>
                {preview.matching_emails.toLocaleString("pt-BR")} emails encontrados para este remetente.
              </p>
              <p style={{ color: preview.dry_run ? "#f59e0b" : "#525264", fontSize: 11, fontFamily: "'Geist Mono'", marginTop: 6 }}>
                {preview.dry_run ? "Modo simulacao ativo: nada sera alterado no Gmail." : "Acao real: confira antes de confirmar."}
              </p>
            </>
          ) : (
            <p style={{ color: previewError ? "#ef4444" : "#525264", fontSize: 11, fontFamily: "'Geist Mono'" }}>
              {previewError || "Calculando previa..."}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading}
            style={{ padding: "7px 16px", fontSize: 12, fontFamily: "'Geist'", fontWeight: 500, background: "transparent", border: "1px solid #2a2a35", borderRadius: 7, color: "#525264", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ padding: "7px 16px", fontSize: 12, fontFamily: "'Geist'", fontWeight: 500, background: a.color, border: "none", borderRadius: 7, color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Executando..." : preview?.dry_run ? "Simular" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface Props {
  sender: Sender;
  completedActions: string[];
  onAction: (email: string, action: string, deletedCount?: number) => void;
  onRemove: (email: string) => void;
}

export default function SenderRow({ sender, completedActions, onAction, onRemove }: Props) {
  const [pending, setPending]     = useState<keyof typeof ACTIONS | null>(null);
  const [loading, setLoading]     = useState(false);
  const [removing, setRemoving]   = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { addToast } = useToast();

  const isDone  = (k: string) => completedActions.includes(k) || completedActions.includes("both");
  const allDone = isDone("block") && isDone("delete");

  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(() => {
      setRemoving(true);
      setTimeout(() => onRemove(sender.email), ANIM_DURATION);
    }, REMOVE_DELAY);
    return () => clearTimeout(t);
  }, [allDone, onRemove, sender.email]);

  const confirm = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      let deletedCount: number | undefined;
      let filterId: string | null | undefined;

      if (pending === "block") {
        const res = await blockSender(sender.email);
        filterId = res.data?.filter_id;
        if (res.data?.dry_run) {
          addToast(`Simulacao: ${sender.name} seria bloqueado`, "info");
          return;
        }

        // Feature 11: toast com botão Desfazer após bloquear
        addToast(
          `${sender.name} bloqueado`,
          "success",
          filterId ? {
            label: "Desfazer",
            onClick: async () => {
              try {
                await unblockSender(filterId!);
                addToast("Bloqueio desfeito", "info");
              } catch {
                addToast("Erro ao desfazer", "error");
              }
            },
          } : undefined
        );
      } else if (pending === "delete") {
        const res = await deleteSender(sender.email);
        deletedCount = res.data?.deleted;
        if (res.data?.dry_run) {
          addToast(`Simulacao: ${deletedCount ?? 0} emails seriam removidos`, "info");
          return;
        }
        addToast(`${deletedCount ?? 0} emails de ${sender.name} removidos`);
      } else {
        const res = await blockAndDelete(sender.email);
        deletedCount = res.data?.deleted;
        filterId     = res.data?.filter_id;
        if (res.data?.dry_run) {
          addToast(`Simulacao: ${sender.name} seria bloqueado e ${deletedCount ?? 0} emails seriam removidos`, "info");
          return;
        }
        addToast(`${sender.name} bloqueado · ${deletedCount ?? 0} emails removidos`);
      }

      onAction(sender.email, pending, deletedCount);
    } catch (e: any) {
      addToast(e?.response?.data?.detail ?? "Erro ao executar ação.", "error");
    } finally {
      setLoading(false);
      setPending(null);
    }
  };

  return (
    <>
      {pending && (
        <ConfirmModal sender={sender} action={pending} onConfirm={confirm}
          onCancel={() => !loading && setPending(null)} loading={loading} />
      )}
      {showPreview && (
        <SenderPreview sender={sender} onClose={() => setShowPreview(false)} />
      )}
      <tr
        style={{ borderBottom: "1px solid #18181f", animation: removing ? `rowFadeOut ${ANIM_DURATION}ms ease forwards` : undefined }}
        onMouseEnter={(e) => { if (!removing) e.currentTarget.style.background = "#131318"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <style>{`@keyframes rowFadeOut{0%{opacity:1;transform:translateX(0)}60%{opacity:0;transform:translateX(-14px)}100%{opacity:0;transform:translateX(-14px)}}`}</style>
        <td style={{ padding: "13px 16px" }}>
          <p
            onClick={() => setShowPreview(true)}
            style={{ color: "#e2e2e8", fontSize: 13, fontWeight: 500, marginBottom: 2, letterSpacing: "-0.01em", cursor: "pointer", display: "inline-block" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#5b67f8"; e.currentTarget.style.textDecoration = "underline"; e.currentTarget.style.textDecorationColor = "rgba(91,103,248,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#e2e2e8"; e.currentTarget.style.textDecoration = "none"; }}
            title="Ver últimas mensagens"
          >
            {sender.name}
          </p>
          <p style={{ color: "#525264", fontSize: 11, fontFamily: "'Geist Mono'" }}>{sender.email}</p>
        </td>
        <td style={{ padding: "13px 16px", textAlign: "center" }}>
          <span style={{ color: "#5b67f8", fontWeight: 600, fontFamily: "'Geist Mono'", fontSize: 14 }}>{sender.count}</span>
        </td>
        <td style={{ padding: "13px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 48, height: 2, background: "#1c1c22", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(sender.percentage, 100)}%`, height: "100%", background: "#5b67f8", opacity: 0.6 }} />
            </div>
            <span style={{ color: "#525264", fontSize: 11, fontFamily: "'Geist Mono'", width: 34 }}>{sender.percentage}%</span>
          </div>
        </td>
        <td style={{ padding: "13px 16px" }}><Score s={sender.score} /></td>
        <td style={{ padding: "13px 16px" }}>
          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
            {allDone ? (
              <span style={{ color: "#22c55e", fontSize: 11, fontFamily: "'Geist Mono'", opacity: removing ? 0 : 1, transition: "opacity 0.2s" }}>✓ concluído</span>
            ) : (
              <>
                {!isDone("block")  && <Btn label="Bloquear"          color="#f59e0b" onClick={() => setPending("block")} />}
                {!isDone("delete") && <Btn label="Limpar"            color="#6b6b80" onClick={() => setPending("delete")} />}
                {!isDone("block") && !isDone("delete") && (
                  <Btn label="Bloquear + Limpar" color="#ef4444" onClick={() => setPending("both")} />
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}
