"use client";
import { useEffect, useState } from "react";
import { getAuthStatus, getStats, logout, Stats } from "@/lib/api";
import LoginScreen from "@/components/LoginScreen";
import HealthScore from "@/components/HealthScore";
import TopSendersChart from "@/components/TopSendersChart";
import SendersTable from "@/components/SendersTable";

type View = "checking"|"login"|"loading"|"dashboard"|"error";

export default function Home() {
  const [view, setView] = useState<View>("checking");
  const [stats, setStats] = useState<Stats|null>(null);
  const [error, setError] = useState("");

  useEffect(()=>{
    const p = new URLSearchParams(window.location.search);
    if (p.get("auth")==="success") window.history.replaceState({},"","/");
    checkAuth();
  },[]);

  const checkAuth = async () => {
    try {
      const r = await getAuthStatus();
      if (r.data.authenticated) { setView("loading"); loadStats(); }
      else setView("login");
    } catch { setView("login"); }
  };

  const loadStats = async () => {
    try {
      const r = await getStats(300);
      setStats(r.data); setView("dashboard");
    } catch(e:any) {
      setError(e.response?.data?.detail||"Erro ao carregar dados.");
      setView("error");
    }
  };

  const handleLogout = async () => { await logout(); setStats(null); setView("login"); };

  if (view==="checking"||view==="loading") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d0d0f" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:28, height:28, margin:"0 auto 12px", border:"2px solid #1c1c22", borderTopColor:"#5b67f8", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:"#525264", fontSize:11, fontFamily:"'Geist Mono'" }}>
          {view==="checking"?"verificando sessão…":"analisando inbox…"}
        </p>
      </div>
    </div>
  );

  if (view==="login") return <LoginScreen/>;

  if (view==="error") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d0d0f" }}>
      <div style={{ textAlign:"center" }}>
        <p style={{ color:"#ef4444", fontFamily:"'Geist Mono'", fontSize:13, marginBottom:12 }}>{error}</p>
        <button onClick={checkAuth} style={{ color:"#5b67f8", background:"none", border:"none", cursor:"pointer", fontFamily:"'Geist Mono'", fontSize:12 }}>tentar novamente</button>
      </div>
    </div>
  );

  if (!stats) return null;

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0f" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <header style={{
        padding:"0 32px", height:52,
        borderBottom:"1px solid #1c1c22",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, background:"rgba(13,13,15,0.9)",
        backdropFilter:"blur(12px)", zIndex:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:22, height:22, background:"#5b67f8", borderRadius:5, display:"grid", placeItems:"center" }}>
            <span style={{ color:"#fff", fontSize:10, fontWeight:700 }}>V</span>
          </div>
          <span style={{ color:"#2a2a35", fontSize:11, letterSpacing:"0.12em", fontFamily:"'Geist Mono'" }}>VOIDMAIL</span>
        </div>
        <div style={{ display:"flex", gap:16 }}>
          {[["↻ Atualizar", loadStats],["Desconectar", handleLogout]].map(([label, fn]:any)=>(
            <button key={label} onClick={fn} style={{ background:"none", border:"none", cursor:"pointer", color:"#525264", fontSize:12, fontFamily:"'Geist'" }}>{label}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth:1160, margin:"0 auto", padding:"36px 32px 56px" }}>
        <div style={{ marginBottom:28, animation:"fadeUp 0.4s ease forwards" }}>
          <h1 style={{ fontSize:24, fontWeight:600, color:"#e2e2e8", letterSpacing:"-0.03em", marginBottom:4 }}>Visão geral da inbox</h1>
          <p style={{ color:"#525264", fontSize:13 }}>{stats.total_emails} emails analisados · {stats.unique_senders} remetentes</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16, animation:"fadeUp 0.4s ease 0.05s both" }}>
          <HealthScore score={stats.health_score} totalEmails={stats.total_emails} uniqueSenders={stats.unique_senders}/>
          <TopSendersChart senders={stats.senders}/>
        </div>

        <div style={{ animation:"fadeUp 0.4s ease 0.1s both" }}>
          <SendersTable senders={stats.senders}/>
        </div>
      </main>
    </div>
  );
}