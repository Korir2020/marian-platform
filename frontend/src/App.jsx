import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { logout } from "./api";
import { Loading } from "./ui";
import Login from "./Login";
import Landing from "./Landing";
import LegalPage from "./LegalPage";
import Join from "./Join";
import PasswordRecovery from "./PasswordRecovery";
import SchoolRegistration from "./SchoolRegistration";
import SchoolStatus from "./SchoolStatus";
import IndependentLearningStatus from "./IndependentLearningStatus";
import { OfflineUnlock } from "./offline/OfflineComponents";
import PathwayPicker from "./site/PathwayPicker";
import LevelPicker from "./site/LevelPicker";
import LearnerSignup from "./site/LearnerSignup";
import { clearOfflineData } from "./offline/offlineStore";
import { SiteHome, SiteSchool, SiteLearning } from "./site/SitePages";
import PathwayPage from "./site/PathwayPage";
import CyberAcademyPage from "./site/CyberAcademyPage";
import "./app.css";
import "./light.css";

// Signed-in dashboards load on demand so the landing page stays small.
const Dash = lazy(() => import("./Dash"));

let historyBooted = false;

export default function App() {
  const [ok, setOk] = useState(!!localStorage.getItem("in"));
  const [scr, setScr] = useState(() => window.location.search.includes("site=1") ? "site-home" : window.location.search.includes("recovery=1") ? "recovery" : "landing");
  const [blocked, setBlocked] = useState(null);
  const [offlineRequired, setOfflineRequired] = useState(false);
  const [offlineSession, setOfflineSession] = useState(null);
  const onOut = useCallback(() => { setOk(false); setOfflineRequired(false); setOfflineSession(null); setScr("landing"); }, []);
  const onOfflineBoot = useCallback(() => setOfflineRequired(true), []);
  const forgetDevice = useCallback(async () => {
    await clearOfflineData().catch(() => {});
    try { localStorage.removeItem("marian:remembered-username"); localStorage.removeItem("in"); } catch { /* storage blocked */ }
    await logout(); onOut();
  }, [onOut]);
  useEffect(() => {
    const h = (e) => setBlocked(e.detail || "This school account is suspended.");
    window.addEventListener("marian:suspended", h);
    return () => window.removeEventListener("marian:suspended", h);
  }, []);
  const to = (x) => () => setScr(x);
const [level, setLevel] = useState(null);
  useEffect(() => {
    if (!historyBooted) { historyBooted = true; window.history.replaceState({ scr }, ""); return; }
    if (!window.history.state || window.history.state.scr !== scr) window.history.pushState({ scr }, "");
  }, [scr]);
  useEffect(() => {
    const onPop = (e) => { if (e.state && e.state.scr) setScr(e.state.scr); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  if (offlineRequired && !offlineSession) return <OfflineUnlock onUnlock={(payload, passphrase) => { setOfflineSession({ payload, passphrase }); setOfflineRequired(false); }} onForget={forgetDevice} />;
  if (blocked) return (
    <div role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12, color: "inherit" }}>School account suspended</h1>
        <p style={{ marginBottom: 20 }}>{blocked}</p>
        <button onClick={async () => { await clearOfflineData().catch(() => {}); await logout(); setBlocked(null); onOut(); }} style={{ padding: "12px 20px", fontSize: 16 }}>Sign out</button>
      </div>
    </div>
  );
  if (ok) return <Suspense fallback={<Loading />}><Dash onOut={onOut} onOfflineBoot={onOfflineBoot} offlineSession={offlineSession} onForget={forgetDevice}
    onReconnect={() => { setOfflineSession(null); setOfflineRequired(false); setOk(true); }}
    onOfflinePrepared={() => {}} /></Suspense>;
  if (scr === "landing") return <SiteHome go={setScr} />;
  if (scr === "site-home") return <SiteHome go={setScr} />;
  if (scr === "site-school") return <SiteSchool go={setScr} />;
  if (scr === "site-cybersecurity") return <CyberAcademyPage key={scr} go={setScr} />;
  if (typeof scr === "string" && scr.startsWith("site-pathway-")) return <PathwayPage key={scr} go={setScr} slug={scr.slice(13)} />;
  if (scr === "site-learning") return <SiteLearning go={setScr} />;
  if (scr === "login") return <Login onDone={() => { if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search); setOk(true); }} onForgot={to("recovery")} onBack={to("landing")} onJoin={to("join")} onRegister={to("school-register")} />;
  if (scr === "recovery") return <PasswordRecovery onBack={to("login")} />;
  if (scr === "pathways") return <PathwayPicker go={setScr} onContinue={to("levels")} />;
if (scr === "levels") return <LevelPicker go={setScr} level={level} onContinue={(l) => { setLevel(l); setScr("learner-signup"); }} />;
if (scr === "learner-signup") return <LearnerSignup go={setScr} onSignIn={to("login")} />;
  if (scr === "join") {
    return <Join onBack={to("landing")} onSignIn={to("login")} />;
  }
  if (scr === "school-register") {
    return <SchoolRegistration onBack={to("landing")} onSignIn={to("login")} />;
  }
  if (scr === "school-status") {
    return <SchoolStatus onBack={to("landing")} onSignIn={to("login")} />;
  }
  if (scr === "learning-status") {
    return <IndependentLearningStatus onBack={to("landing")} onSignIn={to("login")} />;
  }
  if (scr === "privacy") return <LegalPage kind="privacy" onBack={to("landing")} />;
  if (scr === "terms-of-service") return <LegalPage kind="terms" onBack={to("landing")} />;
  return <Landing onPrivacy={to("privacy")} onTerms={to("terms-of-service")} onStatus={to("school-status")} onIndependentLearning={to("learning-status")} onStart={to("join")} onRegister={to("school-register")} onSignIn={to("login")} />;
}
