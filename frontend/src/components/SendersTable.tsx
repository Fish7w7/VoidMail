"use client";
import { useState, useMemo } from "react";
import { Sender, autoClean, blockSender, deleteSender } from "@/lib/api";
import SenderRow from "./SenderRow";
import { useToast } from "@/contexts/ToastContext";

// ─── Domain grouping ──────────────────────────────────────────────────────────

function getRootDomain(domain: string): string {
  const parts = domain.split(".");
  return parts.length <= 2 ? domain : parts.slice(-2).join(".");
}

interface GroupedSender {
  rootDomain: string;
  count:      number;
  percentage: number;
  score:      number;
  addresses:  Sender[];
  isGroup:    true;
}

function groupByDomain(senders: Sender[]): GroupedSender[] {
  const map = new Map<string, Sender[]>();
  for (const s of senders) {
    const root = getRootDomain(s.domain);
    if (!map.has(root)) map.set(root, []);
    map.get(root)!.push(s);
  }
  return Array.from(map.entries())
    .map(([rootDomain, addresses]) => ({
      rootDomain,
      count:      addresses.reduce((a, b) => a + b.count, 0),
      percentage: Math.round(addresses.reduce((a, b) => a + b.percentage, 0) * 10) / 10,
      score:      Math.max(...addresses.map((s) => s.score)),
      addresses,
      isGroup: true as const,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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

function DomainGroupRow({ group, onBlockAll, onDeleteAll }: {
  group:       GroupedSender;
  onBlockAll:  (emails: string[]) => Promise<void>;
  onDeleteAll: (emails: string[]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const emails = group.addresses.map((a) => a.email);

  return (
    <>
      <tr
        style={{ borderBottom: "1px solid #18181f", cursor: "pointer" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#131318")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => setExpanded((v) => !v)}
      >
        <td style={{ padding: "13px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#2a2a35", fontSize: 10, transition: "transform 0.15s", display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
            <div>
              <p style={{ color: "#e2e2e8", fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em" }}>{group.rootDomain}</p>
              <p style={{ color: "#525264", fontSize: 11, fontFamily: "'Geist Mono'" }}>
                {group.addresses.length} endereço{group.addresses.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </td>
        <td style={{ padding: "13px 16px", textAlign: "center" }}>
          <span style={{ color: "#5b67f8", fontWeight: 600, fontFamily: "'Geist Mono'", fontSize: 14 }}>{group.count}</span>
        </td>
        <td style={{ padding: "13px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 48, height: 2, background: "#1c1c22", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(group.percentage, 100)}%`, height: "100%", background: "#5b67f8", opacity: 0.6 }} />
            </div>
            <span style={{ color: "#525264", fontSize: 11, fontFamily: "'Geist Mono'", width: 34 }}>{group.percentage}%</span>
          </div>
        </td>
        <td style={{ padding: "13px 16px" }}><Score s={group.score} /></td>
        <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
            {[
              { label: "Bloquear todos", color: "#f59e0b", fn: () => void onBlockAll(emails)  },
              { label: "Limpar todos",   color: "#ef4444", fn: () => void onDeleteAll(emails) },
            ].map(({ label, color, fn }) => (
              <button key={label} onClick={fn}
                style={{ fontSize: 11, fontFamily: "'Geist'", fontWeight: 500, padding: "5px 11px", borderRadius: 6, cursor: "pointer", border: `1px solid ${color}22`, color, background: "transparent", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${color}0f`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                {label}
              </button>
            ))}
          </div>
        </td>
      </tr>
      {expanded && group.addresses.map((addr) => (
        <tr key={addr.email} style={{ borderBottom: "1px solid #18181f", background: "#0f0f12" }}>
          <td style={{ padding: "10px 16px 10px 44px" }}>
            <p style={{ color: "#6b6b80", fontSize: 12, fontFamily: "'Geist Mono'" }}>{addr.email}</p>
          </td>
          <td style={{ padding: "10px 16px", textAlign: "center" }}>
            <span style={{ color: "#3a3a5c", fontFamily: "'Geist Mono'", fontSize: 13 }}>{addr.count}</span>
          </td>
          <td style={{ padding: "10px 16px" }}>
            <span style={{ color: "#3a3a5c", fontSize: 11, fontFamily: "'Geist Mono'" }}>{addr.percentage}%</span>
          </td>
          <td style={{ padding: "10px 16px" }}><Score s={addr.score} /></td>
          <td style={{ padding: "10px 16px" }}>
            <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
              {[
                { label: "Bloquear", color: "#f59e0b", fn: () => void onBlockAll([addr.email])  },
                { label: "Limpar",   color: "#6b6b80", fn: () => void onDeleteAll([addr.email]) },
              ].map(({ label, color, fn }) => (
                <button key={label} onClick={(e) => { e.stopPropagation(); fn(); }}
                  style={{ fontSize: 11, fontFamily: "'Geist'", fontWeight: 500, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid ${color}22`, color, background: "transparent", whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${color}0f`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  {label}
                </button>
              ))}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  senders:      Sender[];
  initialTotal: number;   // total da primeira carga (para o banner de sessão)
  totalLoaded:  number;   // total acumulado (atualizado pelo pai)
  nextPageToken: string | null;
  hasMore:      boolean;
  loadingMore:  boolean;
  onLoadMore:   () => void;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SendersTable({
  senders,
  initialTotal,
  totalLoaded,
  nextPageToken,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  const [filter,           setFilter]          = useState<"all" | "toxic" | "moderate">("all");
  const [search,           setSearch]          = useState("");
  const [groupDomainMode,  setGroupDomainMode] = useState(false);
  const [autoCleaning,     setAutoCleaning]    = useState(false);
  const [confirmClean,     setConfirmClean]    = useState(false);
  const [completedActions, setCompletedActions]= useState<Record<string, string[]>>({});
  const [removedEmails,    setRemovedEmails]   = useState<Set<string>>(new Set());
  const [sessionDeleted,   setSessionDeleted]  = useState(0);
  const [sessionBlocked,   setSessionBlocked]  = useState(0);

  const { addToast } = useToast();

  const visibleSenders = useMemo(
    () => senders.filter((s) => !removedEmails.has(s.email)),
    [senders, removedEmails]
  );

  const filtered = useMemo(() => {
    let result = visibleSenders;
    if (filter === "toxic")    result = result.filter((s) => s.score >= 70);
    if (filter === "moderate") result = result.filter((s) => s.score >= 40);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.email.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [visibleSenders, filter, search]);

  const grouped     = useMemo(() => groupByDomain(filtered), [filtered]);
  const toxicEmails = visibleSenders.filter((s) => s.score >= 80).map((s) => s.email);

  const handleAction = (email: string, action: string, deletedCount?: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [email]: Array.from(new Set([...(prev[email] || []), action])),
    }));
    if (action === "delete" || action === "both") setSessionDeleted((n) => n + (deletedCount ?? 0));
    if (action === "block"  || action === "both") setSessionBlocked((n) => n + 1);
  };

  const handleRemove = (email: string) => {
    setRemovedEmails((prev) => new Set(Array.from(prev).concat(email)));
  };

  const handleAutoClean = async () => {
    if (!confirmClean) { setConfirmClean(true); return; }
    setAutoCleaning(true);
    try {
      const res = await autoClean(toxicEmails);
      const wasDryRun = res.data.results.some((r) => r.dry_run);
      if (wasDryRun) {
        const total = res.data.results.reduce((sum, r) => sum + (r.deleted ?? 0), 0);
        addToast(`Simulacao: ${total} emails seriam removidos`, "info");
        return;
      }
      const next: Record<string, string[]> = {};
      toxicEmails.forEach((e) => (next[e] = ["both"]));
      setCompletedActions((prev) => ({ ...prev, ...next }));
      setSessionBlocked((n) => n + toxicEmails.length);
      setSessionDeleted((n) => n + res.data.results.reduce((sum, r) => sum + (r.deleted ?? 0), 0));
      addToast(`Limpeza automática: ${toxicEmails.length} remetentes processados`);
    } catch (e: any) {
      addToast(e?.response?.data?.detail ?? "Erro na limpeza automática.", "error");
    } finally {
      setAutoCleaning(false);
      setConfirmClean(false);
    }
  };

  const handleBlockMany = async (emails: string[]) => {
    if (emails.length > 1 && !window.confirm(`Bloquear ${emails.length} enderecos deste dominio?`)) return;
    try {
      const results = await Promise.all(emails.map((email) => blockSender(email)));
      const realResults = results.filter((r) => !r.data.dry_run);
      realResults.forEach((r) => handleAction(r.data.email, "block"));
      addToast(
        realResults.length === 0
          ? `Simulacao: ${emails.length} bloqueios seriam criados`
          : `${realResults.length} remetente(s) bloqueado(s)`,
        realResults.length === 0 ? "info" : "success"
      );
    } catch (e: any) {
      addToast(e?.response?.data?.detail ?? "Erro ao bloquear grupo.", "error");
    }
  };

  const handleDeleteMany = async (emails: string[]) => {
    if (!window.confirm(`Limpar historico de ${emails.length} endereco(s)?`)) return;
    try {
      const results = await Promise.all(emails.map((email) => deleteSender(email)));
      const realResults = results.filter((r) => !r.data.dry_run);
      realResults.forEach((r) => handleAction(r.data.email, "delete", r.data.deleted));
      const deleted = results.reduce((sum, r) => sum + (r.data.deleted ?? 0), 0);
      addToast(
        realResults.length === 0
          ? `Simulacao: ${deleted} emails seriam removidos`
          : `${deleted} emails removidos`,
        realResults.length === 0 ? "info" : "success"
      );
    } catch (e: any) {
      addToast(e?.response?.data?.detail ?? "Erro ao limpar grupo.", "error");
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 14px", fontSize: 12, fontFamily: "'Geist'", fontWeight: 500,
    border: "none", cursor: "pointer", transition: "all 0.1s", borderRadius: 6,
    background: active ? "#5b67f8" : "transparent",
    color: active ? "#fff" : "#525264",
  });

  const hasSession = sessionDeleted > 0 || sessionBlocked > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      {/* Feature 14: banner de sessão */}
      {hasSession && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px",
          background: "rgba(91,103,248,0.06)", border: "1px solid rgba(91,103,248,0.15)",
          borderRadius: 10, animation: "fadeUp 0.3s ease forwards",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#5b67f8", fontSize: 13 }}>✦</span>
            <span style={{ color: "#8b8bab", fontSize: 13 }}>Sessão atual:</span>
            {sessionDeleted > 0 && (
              <span style={{ color: "#e2e2e8", fontSize: 13, fontFamily: "'Geist Mono'", fontWeight: 500 }}>
                {sessionDeleted.toLocaleString("pt-BR")} emails removidos
              </span>
            )}
            {sessionDeleted > 0 && sessionBlocked > 0 && <span style={{ color: "#2a2a35" }}>·</span>}
            {sessionBlocked > 0 && (
              <span style={{ color: "#e2e2e8", fontSize: 13, fontFamily: "'Geist Mono'", fontWeight: 500 }}>
                {sessionBlocked} remetente{sessionBlocked > 1 ? "s" : ""} bloqueado{sessionBlocked > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <span style={{ color: "#2a2a35", fontSize: 11, fontFamily: "'Geist Mono'" }}>
            inbox tinha {initialTotal.toLocaleString("pt-BR")} emails
          </span>
        </div>
      )}

      <div style={{ background: "#111114", border: "1px solid #1c1c22", borderRadius: 10, overflow: "hidden" }}>

        {/* Header da tabela */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1c1c22", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ color: "#525264", fontSize: 10, letterSpacing: "0.12em", fontFamily: "'Geist Mono'", marginBottom: 4 }}>REMETENTES</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <p style={{ color: "#e2e2e8", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Tabela de análise</p>
              {totalLoaded > initialTotal && (
                <span style={{ color: "#3a3a5c", fontSize: 11, fontFamily: "'Geist Mono'" }}>
                  {totalLoaded.toLocaleString("pt-BR")} emails carregados
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Busca */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#525264", fontSize: 12, pointerEvents: "none" }}>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar remetente…"
                style={{
                  paddingLeft: 28, paddingRight: 12, height: 34,
                  background: "#0d0d0f", border: "1px solid #1c1c22",
                  borderRadius: 8, color: "#e2e2e8", fontSize: 12,
                  fontFamily: "'Geist'", outline: "none", width: 180, transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#5b67f8")}
                onBlur={(e)  => (e.target.style.borderColor = "#1c1c22")}
              />
            </div>

            {/* Filtro por score */}
            <div style={{ display: "flex", background: "#0d0d0f", borderRadius: 8, padding: 3, border: "1px solid #1c1c22" }}>
              {(["all", "toxic", "moderate"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={tabStyle(filter === f)}>
                  {f === "all" ? "Todos" : f === "toxic" ? "Tóxicos" : "Moderados"}
                </button>
              ))}
            </div>

            {/* Agrupamento por domínio */}
            <button
              onClick={() => setGroupDomainMode((v) => !v)}
              style={{
                padding: "5px 14px", fontSize: 12, fontFamily: "'Geist'", fontWeight: 500,
                border: `1px solid ${groupDomainMode ? "rgba(91,103,248,0.4)" : "#1c1c22"}`,
                background: groupDomainMode ? "rgba(91,103,248,0.1)" : "transparent",
                color: groupDomainMode ? "#5b67f8" : "#525264",
                borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              ⊞ Domínio
            </button>

            {/* Limpeza automática */}
            {toxicEmails.length > 0 && (
              <button onClick={handleAutoClean} disabled={autoCleaning} style={{
                padding: "6px 14px", fontSize: 12, fontFamily: "'Geist'", fontWeight: 500,
                border: `1px solid ${confirmClean ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.15)"}`,
                background: confirmClean ? "rgba(239,68,68,0.1)" : "transparent",
                color: "#ef4444", borderRadius: 8, cursor: "pointer",
              }}>
                {autoCleaning ? "Limpando…" : confirmClean ? `⚠ Confirmar (${toxicEmails.length})` : "Limpeza automática"}
              </button>
            )}
          </div>
        </div>

        {/* Corpo */}
        <div style={{ overflowX: "auto" }}>
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
              {groupDomainMode
                ? grouped.map((g) => (
                    <DomainGroupRow
                      key={g.rootDomain}
                      group={g}
                      onBlockAll={handleBlockMany}
                      onDeleteAll={handleDeleteMany}
                    />
                  ))
                : filtered.map((s) => (
                    <SenderRow
                      key={s.email}
                      sender={s}
                      completedActions={completedActions[s.email] || []}
                      onAction={handleAction}
                      onRemove={handleRemove}
                    />
                  ))}
            </tbody>
          </table>
        </div>

        {/* Sem resultados */}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#2a2a35", fontFamily: "'Geist Mono'", fontSize: 13 }}>
            {search ? `Nenhum resultado para "${search}"` : "Nenhum remetente nesta categoria."}
          </div>
        )}

        {/* Feature 2: botão Carregar mais */}
        {hasMore && !search && filter === "all" && (
          <div style={{ padding: "20px 24px", borderTop: "1px solid #18181f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#2a2a35", fontSize: 11, fontFamily: "'Geist Mono'" }}>
              {visibleSenders.length} remetentes · mais emails disponíveis
            </span>
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 20px", fontSize: 12, fontFamily: "'Geist'", fontWeight: 500,
                background: "transparent", border: "1px solid #2a2a35",
                borderRadius: 8, color: loadingMore ? "#2a2a35" : "#525264",
                cursor: loadingMore ? "not-allowed" : "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!loadingMore) { e.currentTarget.style.borderColor = "#5b67f8"; e.currentTarget.style.color = "#5b67f8"; }}}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2a35"; e.currentTarget.style.color = "#525264"; }}
            >
              {loadingMore ? (
                <>
                  <span style={{ display: "inline-block", width: 12, height: 12, border: "1.5px solid #3a3a5c", borderTopColor: "#5b67f8", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Carregando…
                </>
              ) : "Carregar mais emails →"}
            </button>
          </div>
        )}

        {/* Fim da lista */}
        {!hasMore && totalLoaded > initialTotal && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid #18181f", textAlign: "center" }}>
            <span style={{ color: "#2a2a35", fontSize: 11, fontFamily: "'Geist Mono'" }}>
              ✓ todos os {totalLoaded.toLocaleString("pt-BR")} emails carregados
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
