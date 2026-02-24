"use client";
import { useState } from "react";
import { Sender, autoClean } from "@/lib/api";
import SenderRow from "./SenderRow";

export default function SendersTable({ senders }: { senders: Sender[] }) {
  const [filter, setFilter] = useState<"all"|"toxic"|"moderate">("all");
  const [autoCleaning, setAutoCleaning] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [actions, setActions] = useState<Record<string,string>>({});

  const filtered = senders.filter(s =>
    filter==="toxic" ? s.score>=70 : filter==="moderate" ? s.score>=40 : true
  );
  const toxicEmails = senders.filter(s=>s.score>=80).map(s=>s.email);

  const handleAutoClean = async () => {
    if (!confirm) { setConfirm(true); return; }
    setAutoCleaning(true);
    try {
      await autoClean(toxicEmails);
      const next: Record<string,string> = {};
      toxicEmails.forEach(e => next[e]="both");
      setActions(p=>({...p,...next}));
    } catch(e){console.error(e);}
    finally { setAutoCleaning(false); setConfirm(false); }
  };

  const tabStyle = (active: boolean) => ({
    padding: "5px 14px", fontSize: 12, fontFamily: "'Geist'", fontWeight: 500,
    border: "none", cursor: "pointer", transition: "all 0.1s", borderRadius: 6,
    background: active ? "#5b67f8" : "transparent",
    color: active ? "#fff" : "#525264",
  });

  return (
    <div style={{ background:"#111114", border:"1px solid #1c1c22", borderRadius:10, overflow:"hidden" }}>
      <div style={{ padding:"20px 24px", borderBottom:"1px solid #1c1c22", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <p style={{ color:"#525264", fontSize:10, letterSpacing:"0.12em", fontFamily:"'Geist Mono'", marginBottom:4 }}>REMETENTES</p>
          <p style={{ color:"#e2e2e8", fontSize:18, fontWeight:600, letterSpacing:"-0.02em" }}>Tabela de análise</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", background:"#0d0d0f", borderRadius:8, padding:3, border:"1px solid #1c1c22" }}>
            {(["all","toxic","moderate"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={tabStyle(filter===f)}>
                {f==="all"?"Todos":f==="toxic"?"Tóxicos":"Moderados"}
              </button>
            ))}
          </div>
          {toxicEmails.length>0 && (
            <button onClick={handleAutoClean} disabled={autoCleaning} style={{
              padding:"6px 14px", fontSize:12, fontFamily:"'Geist'", fontWeight:500,
              border:`1px solid ${confirm?"rgba(239,68,68,0.4)":"rgba(239,68,68,0.15)"}`,
              background: confirm?"rgba(239,68,68,0.1)":"transparent",
              color:"#ef4444", borderRadius:8, cursor:"pointer",
            }}>
              {autoCleaning?"Limpando…":confirm?`⚠ Confirmar (${toxicEmails.length})`:"Limpeza automática"}
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #18181f" }}>
              {["Remetente","Emails","% Total","Score","Ações"].map(h=>(
                <th key={h} style={{ padding:"9px 16px", textAlign:"left", fontSize:10, fontFamily:"'Geist Mono'", color:"#2a2a35", letterSpacing:"0.1em", textTransform:"uppercase" as const, fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s=>(
              <SenderRow key={s.email} sender={s} onAction={(email,action)=>setActions(p=>({...p,[email]:action}))}/>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length===0 && (
        <div style={{ padding:40, textAlign:"center", color:"#2a2a35", fontFamily:"'Geist Mono'", fontSize:13 }}>
          Nenhum remetente nesta categoria.
        </div>
      )}
    </div>
  );
}