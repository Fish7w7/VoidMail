"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sender, blockSender, deleteSender, blockAndDelete } from "@/lib/api";

const ACTIONS = {
  block:  { label: "Bloquear",          color: "#f59e0b", confirm: "Criar filtro para enviar emails futuros direto para lixeira?" },
  delete: { label: "Limpar",            color: "#6b6b80", confirm: "Apagar todo o histórico deste remetente permanentemente?" },
  both:   { label: "Bloquear + Limpar", color: "#ef4444", confirm: "Bloquear e apagar todo o histórico deste remetente?" },
};

function Score({ s }: { s: number }) {
  const c = s >= 70 ? "#ef4444" : s >= 40 ? "#f59e0b" : "#22c55e";
  const bg = s >= 70 ? "rgba(239,68,68,0.07)" : s >= 40 ? "rgba(245,158,11,0.07)" : "rgba(34,197,94,0.07)";
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontFamily:"'Geist Mono'", padding:"3px 9px", borderRadius:20, background:bg, color:c }}>
      <span style={{ width:4, height:4, borderRadius:"50%", background:c, display:"inline-block" }}/>
      {s}
    </span>
  );
}

function Btn({ label, onClick, color }: any) {
  return (
    <button onClick={onClick} style={{
      fontSize:11, fontFamily:"'Geist'", fontWeight:500,
      padding:"5px 11px", borderRadius:6, cursor:"pointer",
      border:`1px solid ${color}22`, color, background:"transparent",
      transition:"background 0.1s", whiteSpace:"nowrap",
    }}
    onMouseEnter={e=>(e.currentTarget.style.background=`${color}0f`)}
    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
    >{label}</button>
  );
}

function ConfirmModal({ sender, action, onConfirm, onCancel, loading }: {
  sender: Sender; action: keyof typeof ACTIONS;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const a = ACTIONS[action];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [loading]);

  return createPortal(
    <div
      style={{
        position:"fixed", inset:0, zIndex:9999,
        background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}
      onClick={() => !loading && onCancel()}
    >
      <div
        style={{
          background:"#111114", border:"1px solid #2a2a35", borderRadius:12,
          padding:"28px 32px", width:380,
          boxShadow:"0 32px 80px rgba(0,0,0,0.6)",
          animation:"modalIn 0.15s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>
        <p style={{ color:"#e2e2e8", fontSize:15, fontWeight:600, marginBottom:8, letterSpacing:"-0.02em" }}>{a.label}</p>
        <p style={{ color:"#525264", fontSize:13, lineHeight:1.6, marginBottom:6 }}>{a.confirm}</p>
        <p style={{ color:"#2a2a35", fontSize:12, fontFamily:"'Geist Mono'", marginBottom:24 }}>{sender.email}</p>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button
            onClick={onCancel} disabled={loading}
            style={{ padding:"7px 16px", fontSize:12, fontFamily:"'Geist'", fontWeight:500, background:"transparent", border:"1px solid #2a2a35", borderRadius:7, color:"#525264", cursor:"pointer" }}
          >Cancelar</button>
          <button
            onClick={onConfirm} disabled={loading}
            style={{ padding:"7px 16px", fontSize:12, fontFamily:"'Geist'", fontWeight:500, background:a.color, border:"none", borderRadius:7, color:"#fff", cursor: loading?"not-allowed":"pointer", opacity: loading?0.6:1 }}
          >{loading ? "Executando…" : "Confirmar"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SenderRow({ sender, onAction }: { sender: Sender; onAction: (e:string,a:string)=>void }) {
  const [pending, setPending] = useState<keyof typeof ACTIONS | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  const fns = {
    block:  () => blockSender(sender.email),
    delete: () => deleteSender(sender.email),
    both:   () => blockAndDelete(sender.email),
  };

  const confirm = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      await fns[pending]();
      setDone(p => [...p, pending]);
      onAction(sender.email, pending);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setPending(null); }
  };

  const ok = (k: string) => done.includes(k) || done.includes("both");

  return (
    <>
      {pending && (
        <ConfirmModal
          sender={sender} action={pending}
          onConfirm={confirm} onCancel={() => !loading && setPending(null)}
          loading={loading}
        />
      )}
      <tr style={{ borderBottom:"1px solid #18181f" }}
        onMouseEnter={e=>(e.currentTarget.style.background="#131318")}
        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
        <td style={{ padding:"13px 16px" }}>
          <p style={{ color:"#e2e2e8", fontSize:13, fontWeight:500, marginBottom:2, letterSpacing:"-0.01em" }}>{sender.name}</p>
          <p style={{ color:"#525264", fontSize:11, fontFamily:"'Geist Mono'" }}>{sender.email}</p>
        </td>
        <td style={{ padding:"13px 16px", textAlign:"center" }}>
          <span style={{ color:"#5b67f8", fontWeight:600, fontFamily:"'Geist Mono'", fontSize:14 }}>{sender.count}</span>
        </td>
        <td style={{ padding:"13px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:48, height:2, background:"#1c1c22", borderRadius:2, overflow:"hidden" }}>
              <div style={{ width:`${Math.min(sender.percentage,100)}%`, height:"100%", background:"#5b67f8", opacity:0.6 }}/>
            </div>
            <span style={{ color:"#525264", fontSize:11, fontFamily:"'Geist Mono'", width:34 }}>{sender.percentage}%</span>
          </div>
        </td>
        <td style={{ padding:"13px 16px" }}><Score s={sender.score}/></td>
        <td style={{ padding:"13px 16px" }}>
          <div style={{ display:"flex", gap:5, justifyContent:"flex-end" }}>
            {ok("block") && ok("delete")
              ? <span style={{ color:"#22c55e", fontSize:11, fontFamily:"'Geist Mono'" }}>✓ concluído</span>
              : <>
                  {!ok("block")  && <Btn label="Bloquear"          color="#f59e0b" onClick={()=>setPending("block")}/>}
                  {!ok("delete") && <Btn label="Limpar"            color="#6b6b80" onClick={()=>setPending("delete")}/>}
                  {!ok("block") && !ok("delete") && <Btn label="Bloquear + Limpar" color="#ef4444" onClick={()=>setPending("both")}/>}
                </>
            }
          </div>
        </td>
      </tr>
    </>
  );
}