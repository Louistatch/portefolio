import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  Loader2, Video, VideoOff, Mic, MicOff, MonitorUp, MessageSquare, Hand,
  PhoneOff, Users, ArrowLeft, AlertCircle, Radio, Maximize2, MoreHorizontal,
  Settings, LayoutGrid, Send, X,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, getStudent } from "@/lib/student";

declare global { interface Window { JitsiMeetExternalAPI?: any } }

type P = { id: string; name: string; audio: boolean; video: boolean; hand: boolean; speaking: boolean; role?: string };

export default function AcademyLive() {
  const [, params] = useRoute("/academy/live/:id");
  const [, navigate] = useLocation();
  const [meeting, setMeeting] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [ready, setReady] = useState(false);

  // états média locaux
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [handUp, setHandUp] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPeople, setShowPeople] = useState(true);
  const [view, setView] = useState<"speaker" | "grid">("speaker");
  const [participants, setParticipants] = useState<P[]>([]);
  const [messages, setMessages] = useState<{ from: string; text: string; ts: number }[]>([]);
  const [draft, setDraft] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const jitsiRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const myIdRef = useRef<string>("");

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const r = await studentFetch(`/api/academy/meetings/${params?.id}`);
        if (!r.ok) { const d = await r.json(); setError(d.message || "Accès impossible."); return; }
        const d = await r.json();
        setMeeting(d.meeting); setDisplayName(d.displayName || getStudent()?.full_name || "Participant");
      } catch { setError("Erreur de chargement."); }
      finally { setLoading(false); }
    })();
  }, [params?.id]);

  // minuteur
  useEffect(() => {
    if (!joined) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [joined]);

  const refreshParticipants = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    try {
      const info = api.getParticipantsInfo?.() || [];
      setParticipants(prev => info.map((pi: any) => {
        const old = prev.find(p => p.id === pi.participantId);
        return { id: pi.participantId, name: pi.displayName || pi.formattedDisplayName || "Invité", audio: old?.audio ?? true, video: old?.video ?? true, hand: old?.hand ?? false, speaking: old?.speaking ?? false, role: pi.role };
      }));
    } catch {}
  }, []);

  function joinMeeting() {
    if (!meeting) return;
    setJoined(true);
    const start = () => {
      if (!jitsiRef.current || !window.JitsiMeetExternalAPI) return;
      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: meeting.room_name,
        parentNode: jitsiRef.current,
        width: "100%", height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: meeting.kind === "webinar",
          startWithVideoMuted: meeting.kind === "webinar",
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          toolbarButtons: [],          // on masque toute la toolbar Jitsi
          disableShortcuts: true,
          hideConferenceTimer: true,
          notifications: [],
          disableReactions: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [],         // aucune barre Jitsi → notre UI prend le relais
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          MOBILE_APP_PROMO: false,
          DEFAULT_BACKGROUND: "#0b1220",
          DISABLE_VIDEO_BACKGROUND: false,
          FILMSTRIP_ENABLED: true,
          VERTICAL_FILMSTRIP: true,
          DISABLE_FOCUS_INDICATOR: false,
          HIDE_INVITE_MORE_HEADER: true,
        },
      });
      apiRef.current = api;

      api.addEventListener("videoConferenceJoined", (e: any) => {
        myIdRef.current = e.id; setReady(true); refreshParticipants();
        if (meeting.kind === "webinar") { setMicOn(false); setCamOn(false); }
      });
      api.addEventListener("participantJoined", refreshParticipants);
      api.addEventListener("participantLeft", refreshParticipants);
      api.addEventListener("displayNameChange", refreshParticipants);
      api.addEventListener("audioMuteStatusChanged", (e: any) => setMicOn(!e.muted));
      api.addEventListener("videoMuteStatusChanged", (e: any) => setCamOn(!e.muted));
      api.addEventListener("screenSharingStatusChanged", (e: any) => setSharing(!!e.on));
      api.addEventListener("dominantSpeakerChanged", (e: any) => {
        setParticipants(prev => prev.map(p => ({ ...p, speaking: p.id === e.id })));
      });
      api.addEventListener("raiseHandUpdated", (e: any) => {
        setParticipants(prev => prev.map(p => p.id === e.id ? { ...p, hand: !!e.handRaised } : p));
        if (e.id === myIdRef.current) setHandUp(!!e.handRaised);
      });
      api.addEventListener("incomingMessage", (e: any) => {
        setMessages(m => [...m, { from: e.nick || e.from || "Invité", text: e.message, ts: Date.now() }]);
      });
      api.addEventListener("readyToClose", () => { cleanup(); navigate("/academy/dashboard"); });
    };
    if (window.JitsiMeetExternalAPI) { start(); return; }
    const s = document.createElement("script");
    s.src = "https://meet.jit.si/external_api.js";
    s.async = true; s.onload = start;
    s.onerror = () => setError("Impossible de charger le module vidéo. Vérifiez votre connexion.");
    document.body.appendChild(s);
  }

  function cleanup() { try { apiRef.current?.dispose?.(); } catch {} apiRef.current = null; }
  useEffect(() => cleanup, []);

  const cmd = (c: string, ...a: any[]) => { try { apiRef.current?.executeCommand(c, ...a); } catch {} };
  const toggleMic = () => cmd("toggleAudio");
  const toggleCam = () => cmd("toggleVideo");
  const toggleShare = () => cmd("toggleShareScreen");
  const toggleHand = () => cmd("toggleRaiseHand");
  const hangup = () => { cmd("hangup"); cleanup(); navigate("/academy/dashboard"); };
  const sendMsg = () => { if (!draft.trim()) return; cmd("sendChatMessage", draft.trim()); setMessages(m => [...m, { from: displayName + " (moi)", text: draft.trim(), ts: Date.now() }]); setDraft(""); };
  const setLayout = (v: "speaker" | "grid") => { setView(v); cmd("setTileView", v === "grid"); };

  const fmtTime = (s: number) => { const m = Math.floor(s / 60), ss = s % 60; return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`; };

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (error) return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-destructive" /></div>
      <p className="font-semibold mb-2">{error}</p>
      <Link href="/academy/dashboard"><Button variant="outline" size="sm" className="mt-2 gap-2"><ArrowLeft className="w-4 h-4" /> Retour</Button></Link>
    </div>
  );

  const isWebinar = meeting?.kind === "webinar";

  // ───────── Écran d'accueil (lobby) ─────────
  if (!joined) {
    const start = meeting?.starts_at ? new Date(meeting.starts_at) : null;
    return (
      <div className="max-w-2xl mx-auto px-5 py-10">
        <SEO title={`${meeting?.title || "Rencontre"} — DataMEAL Academy`} description="Rejoignez la rencontre en ligne." />
        <Link href="/academy/dashboard"><button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-6"><ArrowLeft className="w-4 h-4" /> Retour</button></Link>
        <div className="bg-card rounded-3xl border border-border/50 overflow-hidden">
          <div className="relative bg-gradient-to-br from-primary via-primary to-teal-700 p-8 text-white">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3 bg-white/20">
              {isWebinar ? <Radio className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {isWebinar ? "Webinaire" : "Rencontre interactive"}
            </span>
            <h1 className="text-2xl font-bold relative">{meeting?.title}</h1>
            {meeting?.description && <p className="text-white/80 text-sm mt-2 relative">{meeting.description}</p>}
          </div>
          <div className="p-6 space-y-5">
            {start && <p className="text-sm text-muted-foreground">{start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {meeting?.duration_min} min</p>}
            <div className="bg-muted/40 rounded-2xl p-4 text-sm text-muted-foreground">
              {isWebinar ? "Vous rejoindrez avec micro et caméra coupés. Levez la main pour demander la parole." : "Tout le monde peut parler et partager sa caméra. Autorisez le micro et la caméra quand le navigateur le demande."}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{displayName.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
              <div><p className="text-xs text-muted-foreground">Vous rejoignez en tant que</p><p className="text-sm font-medium">{displayName}</p></div>
            </div>
            <Button onClick={joinMeeting} size="lg" className="w-full gap-2"><Video className="w-5 h-5" /> Rejoindre la rencontre</Button>
          </div>
        </div>
      </div>
    );
  }

  // ───────── Salle custom (style Zoom/Meet) ─────────
  const me = participants.find(p => p.id === myIdRef.current);
  const others = participants.filter(p => p.id !== myIdRef.current);
  const handsUp = participants.filter(p => p.hand);

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1220] flex flex-col text-white">
      {/* Top bar */}
      <div className="h-14 px-4 flex items-center justify-between bg-[#0f172a]/80 backdrop-blur border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-sm font-bold shrink-0">D</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate flex items-center gap-2">{meeting?.title}
              {isWebinar && <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded">WEBINAIRE</span>}
            </p>
            <p className="text-[11px] text-white/50">{fmtTime(elapsed)} · {participants.length} participant{participants.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setLayout(view === "grid" ? "speaker" : "grid")} title="Disposition" className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center"><LayoutGrid className="w-4.5 h-4.5" /></button>
          <button onClick={() => setShowPeople(s => !s)} title="Participants" className={`w-9 h-9 rounded-xl flex items-center justify-center relative ${showPeople ? "bg-white/15" : "hover:bg-white/10"}`}>
            <Users className="w-4.5 h-4.5" />
            <span className="absolute -top-1 -right-1 text-[9px] bg-teal-500 rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">{participants.length}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Scène vidéo (Jitsi engine, UI masquée) */}
        <div className="flex-1 relative min-w-0">
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#0b1220]">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
              <p className="text-sm text-white/60">Connexion à la salle…</p>
            </div>
          )}
          <div ref={jitsiRef} className="absolute inset-0" />
          {/* indicateur "mains levées" flottant */}
          {handsUp.length > 0 && (
            <div className="absolute top-3 left-3 z-20 bg-amber-500/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg" style={{ animation: "fadeIn .3s" }}>
              <Hand className="w-3.5 h-3.5" /> {handsUp.length} main{handsUp.length > 1 ? "s" : ""} levée{handsUp.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Panneau latéral : participants / chat */}
        {(showPeople || showChat) && (
          <div className="w-80 bg-[#0f172a] border-l border-white/5 flex flex-col shrink-0" style={{ animation: "slideLeft .25s ease" }}>
            {/* onglets */}
            <div className="flex border-b border-white/5">
              <button onClick={() => { setShowPeople(true); setShowChat(false); }} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${showPeople && !showChat ? "text-teal-400 border-b-2 border-teal-400" : "text-white/50"}`}><Users className="w-4 h-4" /> Participants</button>
              <button onClick={() => { setShowChat(true); setShowPeople(false); }} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${showChat ? "text-teal-400 border-b-2 border-teal-400" : "text-white/50"}`}><MessageSquare className="w-4 h-4" /> Chat</button>
            </div>

            {/* liste participants */}
            {showPeople && !showChat && (
              <div className="flex-1 overflow-y-auto p-2">
                {handsUp.length > 0 && (
                  <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-amber-400 font-semibold">✋ Demandent la parole</div>
                )}
                {[...participants].sort((a, b) => Number(b.hand) - Number(a.hand)).map(p => (
                  <div key={p.id} className={`flex items-center gap-3 px-2 py-2 rounded-xl ${p.speaking ? "bg-teal-500/10 ring-1 ring-teal-500/30" : "hover:bg-white/5"}`}>
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold">{p.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
                      {p.speaking && <span className="absolute -inset-0.5 rounded-full ring-2 ring-teal-400 animate-pulse" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.name}{p.id === myIdRef.current ? " (moi)" : ""}</p>
                      {p.role === "moderator" && <p className="text-[10px] text-teal-400">Modérateur</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.hand && <Hand className="w-3.5 h-3.5 text-amber-400" />}
                      {p.audio ? <Mic className="w-3.5 h-3.5 text-white/40" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* chat */}
            {showChat && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 && <p className="text-xs text-white/30 text-center py-8">Aucun message. Lancez la conversation !</p>}
                  {messages.map((m, i) => (
                    <div key={i} className="text-sm">
                      <p className="text-[11px] text-teal-400 font-medium">{m.from}</p>
                      <p className="text-white/80 break-words">{m.text}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-white/5 flex gap-2">
                  <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()}
                    placeholder="Message…" className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 ring-teal-500" />
                  <button onClick={sendMsg} className="w-9 h-9 rounded-xl bg-teal-500 hover:bg-teal-600 flex items-center justify-center shrink-0"><Send className="w-4 h-4" /></button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Barre de contrôle (style Zoom/Meet) */}
      <div className="h-20 bg-[#0f172a]/90 backdrop-blur border-t border-white/5 flex items-center justify-center gap-2 sm:gap-3 px-4 shrink-0">
        <Ctrl active={micOn} onClick={toggleMic} on={Mic} off={MicOff} label={micOn ? "Couper" : "Activer"} danger={!micOn} />
        <Ctrl active={camOn} onClick={toggleCam} on={Video} off={VideoOff} label={camOn ? "Stopper" : "Démarrer"} danger={!camOn} />
        {!isWebinar && <Ctrl active={sharing} onClick={toggleShare} on={MonitorUp} off={MonitorUp} label="Partager" highlight={sharing} hideMobile />}
        <Ctrl active={handUp} onClick={toggleHand} on={Hand} off={Hand} label="Main" highlight={handUp} />
        <Ctrl active={showChat} onClick={() => { setShowChat(true); setShowPeople(false); }} on={MessageSquare} off={MessageSquare} label="Chat" hideMobile />
        <button onClick={hangup} className="h-12 px-5 rounded-2xl bg-red-500 hover:bg-red-600 flex items-center gap-2 font-medium transition-colors ml-1">
          <PhoneOff className="w-5 h-5" /> <span className="hidden sm:inline">Quitter</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px);} to {opacity:1;transform:translateY(0);} }
        @keyframes slideLeft { from { transform:translateX(20px); opacity:0;} to {transform:translateX(0);opacity:1;} }
      `}</style>
    </div>
  );
}

function Ctrl({ active, onClick, on: On, off: Off, label, danger, highlight, hideMobile }: any) {
  const Icon = active ? On : Off;
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-0.5 h-14 w-14 sm:w-16 rounded-2xl transition-all ${hideMobile ? "hidden sm:flex" : ""} ${
      danger ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : highlight ? "bg-teal-500 text-white" : "bg-white/8 hover:bg-white/15 text-white"}`}>
      <Icon className="w-5 h-5" />
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  );
}
