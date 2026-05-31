import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Loader2, Video, ArrowLeft, Calendar, Clock, Users, Radio, AlertCircle } from "lucide-react";
import { studentFetch, isStudentLoggedIn, getStudent } from "@/lib/student";

declare global { interface Window { JitsiMeetExternalAPI?: any } }

export default function AcademyLive() {
  const [, params] = useRoute("/academy/live/:id");
  const [, navigate] = useLocation();
  const [meeting, setMeeting] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

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

  // Charge le script Jitsi puis instancie la salle
  function joinMeeting() {
    if (!meeting) return;
    setJoined(true);
    const start = () => {
      if (!containerRef.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: meeting.room_name,
        parentNode: containerRef.current,
        width: "100%", height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: meeting.kind === "webinar",
          startWithVideoMuted: meeting.kind === "webinar",
          prejoinPageEnabled: true,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          DEFAULT_BACKGROUND: "#0f172a",
          TOOLBAR_BUTTONS: meeting.kind === "webinar"
            ? ["microphone", "camera", "raisehand", "chat", "tileview", "hangup", "fullscreen"]
            : ["microphone", "camera", "desktop", "raisehand", "chat", "tileview", "fullscreen", "hangup", "settings"],
        },
      });
      apiRef.current.addEventListener("readyToClose", () => { cleanup(); navigate("/academy/dashboard"); });
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

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (error) return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-destructive" /></div>
      <p className="font-semibold mb-2">{error}</p>
      <Link href="/academy/dashboard"><Button variant="outline" size="sm" className="mt-2 gap-2"><ArrowLeft className="w-4 h-4" /> Retour au tableau de bord</Button></Link>
    </div>
  );

  // Vue salle plein écran
  if (joined) return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );

  const start = meeting?.starts_at ? new Date(meeting.starts_at) : null;
  const isWebinar = meeting?.kind === "webinar";

  // Écran d'accueil avant de rejoindre
  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <SEO title={`${meeting?.title || "Rencontre"} — DataMEAL Academy`} description="Rejoignez la rencontre en ligne." />
      <Link href="/academy/dashboard"><button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-6"><ArrowLeft className="w-4 h-4" /> Retour</button></Link>

      <div className="bg-card rounded-3xl border border-border/50 overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary via-primary to-teal-700 p-8 text-white">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3 ${isWebinar ? "bg-white/20" : "bg-white/20"}`}>
            {isWebinar ? <Radio className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
            {isWebinar ? "Webinaire" : "Rencontre interactive"}
          </span>
          <h1 className="text-2xl font-bold relative">{meeting?.title}</h1>
          {meeting?.description && <p className="text-white/80 text-sm mt-2 relative">{meeting.description}</p>}
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-4 text-sm">
            {start && (
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /><span>{start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span></div>
            )}
            {start && (
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><span>{start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {meeting?.duration_min} min</span></div>
            )}
          </div>

          <div className="bg-muted/40 rounded-2xl p-4 text-sm text-muted-foreground">
            {isWebinar
              ? "Vous rejoindrez en tant que participant (micro et caméra coupés au départ). Vous pourrez lever la main et poser vos questions dans le chat."
              : "Tout le monde peut parler et partager sa caméra. Pensez à autoriser votre micro et votre caméra quand le navigateur le demande."}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{displayName.split(" ").map(n => n[0]).slice(0,2).join("")}</div>
            <div><p className="text-xs text-muted-foreground">Vous rejoignez en tant que</p><p className="text-sm font-medium">{displayName}</p></div>
          </div>

          <Button onClick={joinMeeting} size="lg" className="w-full gap-2"><Video className="w-5 h-5" /> Rejoindre la rencontre</Button>
          <p className="text-xs text-center text-muted-foreground">Aucun logiciel à installer — la session s'ouvre dans votre navigateur.</p>
        </div>
      </div>
    </div>
  );
}
