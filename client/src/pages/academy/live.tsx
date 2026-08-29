import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRoute, useLocation, Link } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  Loader2, Video, VideoOff, Mic, MicOff, MonitorUp, MessageSquare, Hand,
  PhoneOff, Users, ArrowLeft, AlertCircle,
  LayoutGrid, Send, Presentation, ChevronLeft, ChevronRight,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, getStudent } from "@/lib/student";
import { adminFetch, getToken } from "@/lib/admin";
import { SalonEntree } from "@/components/academy/salon-entree";
import { lireMessageProjection, texteDuMessage, expediteurDuMessage, APP_PROJECTION } from "@shared/projection";

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
  /**
   * Au bout de combien de temps on cesse de masquer Jitsi.
   *
   * Ce n'est pas un simple délai d'affichage : c'est ce qui rend visible le seul écran
   * capable de débloquer la séance. Huit secondes — assez pour qu'une connexion normale
   * aboutisse sans clignotement, assez peu pour ne pas laisser une salle muette.
   */
  const [attenteLongue, setAttenteLongue] = useState(false);

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

  // ── Support de séance ──
  // Le présentateur est reconnu à sa session d'administration, pas au rôle Jitsi : ce dernier
  // revient au premier arrivé, si bien qu'un étudiant entré avant l'animateur piloterait la
  // présentation de tout le monde.
  const [estPresentateur] = useState(() => !!getToken());
  const [vueSupport, setVueSupport] = useState(false);
  const [diapo, setDiapo] = useState(0);
  const reduire = useReducedMotion();
  // Le SENS du déplacement, pas seulement la position. Pour un étudiant, l'index change tout
  // seul — c'est le présentateur qui avance — et la diapositive qui entre par la droite dit
  // « on avance » là où un simple fondu ne dit rien. Une référence et non un état : elle est
  // lue pendant le rendu de la transition, la changer ne doit pas provoquer de rendu.
  const sens = useRef(1);
  const diapoPrec = useRef(0);
  useEffect(() => {
    sens.current = diapo >= diapoPrec.current ? 1 : -1;
    diapoPrec.current = diapo;
  }, [diapo]);
  const [vignettes, setVignettes] = useState(true);

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

  const diapos: { url: string; titre?: string }[] =
    Array.isArray(meeting?.slides) ? meeting.slides : [];

  // Position initiale : on reprend là où en est la projection, pour ne pas repartir de la
  // première diapositive en rejoignant une séance déjà commencée.
  useEffect(() => {
    if (meeting) setDiapo(Math.max(0, Math.min((meeting.current_slide ?? 0), Math.max(0, (meeting.slides?.length ?? 1) - 1))));
  }, [meeting?.id]);

  /**
   * La projection suivait le présentateur par consultation périodique : chaque participant
   * demandait à l'API, toutes les quatre secondes, quelle diapositive afficher. Pour une
   * séance de 90 minutes à 21 étudiants, 28 350 invocations serverless — et jusqu'à quatre
   * secondes entre le clic du formateur et l'écran de l'étudiant.
   *
   * Jitsi tient déjà une liaison directe entre tous les participants. Un message par
   * changement suffit, sans passer par nous.
   *
   * Le filet reste tendu, mais il dort. Tant qu'aucun message n'est arrivé, on interroge
   * l'API toutes les vingt secondes ; au PREMIER message reçu, on cesse définitivement. Un
   * canal muet — pare-feu d'entreprise, version de Jitsi sans canal de données — ne fait donc
   * pas perdre la séance, il la fait seulement suivre plus lentement. Et un canal qui marche
   * ne coûte plus rien du tout.
   */
  const canalVivant = useRef(false);

  useEffect(() => {
    if (estPresentateur || !joined || diapos.length === 0) return;
    let vivant = true;
    const lire = async () => {
      if (canalVivant.current) return;
      try {
        const r = await studentFetch(`/api/academy/meetings/${params?.id}/slide`);
        if (!r.ok || !vivant) return;
        const d = await r.json();
        if (typeof d.index === "number") setDiapo(d.index);
      } catch { /* la séance continue même si une lecture échoue */ }
    };
    lire();
    const t = setInterval(lire, 20000);
    return () => { vivant = false; clearInterval(t); };
  }, [estPresentateur, joined, diapos.length, params?.id]);

  /**
   * Le présentateur pousse la nouvelle position — aux autres d'abord, au serveur ensuite.
   *
   * L'affichage local change immédiatement : attendre une réponse ferait bégayer la
   * navigation en pleine explication.
   *
   * L'écriture en base reste, mais elle ne sert plus qu'à une chose — qu'un retardataire
   * reprenne à la bonne diapositive. C'est le seul rôle que l'API garde dans la projection.
   */
  const allerDiapo = useCallback((index: number) => {
    if (!diapos.length) return;
    const borne = Math.max(0, Math.min(index, diapos.length - 1));
    setDiapo(borne);
    if (!estPresentateur) return;

    // Destinataire vide = diffusion à toute la salle.
    try {
      apiRef.current?.executeCommand?.(
        "sendEndpointTextMessage", "",
        JSON.stringify({ app: APP_PROJECTION, t: "diapo", i: borne }),
      );
    } catch { /* le filet de sondage prend le relais */ }

    adminFetch(`/api/admin/academy/meetings/${params?.id}/slide`, {
      method: "POST", body: JSON.stringify({ index: borne }),
    }).catch(() => { /* la projection locale reste juste */ });
  }, [diapos.length, estPresentateur, params?.id]);

  // Flèches du clavier pour le présentateur — indispensable quand on parle en même temps.
  useEffect(() => {
    if (!estPresentateur || !vueSupport) return;
    const onKey = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA)$/.test(cible.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); allerDiapo(diapo + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); allerDiapo(diapo - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [estPresentateur, vueSupport, diapo, allerDiapo]);

  // Ouvrir le support d'office quand la séance en a un : c'est ce que les participants
  // viennent voir, pas la mosaïque de visages.
  useEffect(() => { if (diapos.length > 0) setVueSupport(true); }, [diapos.length]);

  // Le compte à rebours du voile de connexion. Remis à zéro dès que la salle s'ouvre : une
  // reconnexion en cours de séance ne doit pas rouvrir le message d'attente.
  useEffect(() => {
    if (!joined || ready) { setAttenteLongue(false); return; }
    const t = setTimeout(() => setAttenteLongue(true), 8000);
    return () => clearTimeout(t);
  }, [joined, ready]);

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

  function joinMeeting(options?: { voixSeule?: boolean }) {
    if (!meeting) return;
    const voixSeule = !!options?.voixSeule;
    setJoined(true);
    // Le choix du salon décide de l'état d'ENTRÉE, pas d'un réglage local : sans cela la
    // caméra s'ouvre une fraction de seconde avant d'être coupée — assez pour consommer, et
    // assez pour que la diode s'allume chez quelqu'un qui venait justement de dire non.
    if (voixSeule) setCamOn(false);
    const start = () => {
      if (!jitsiRef.current || !window.JitsiMeetExternalAPI) return;
      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: meeting.room_name,
        parentNode: jitsiRef.current,
        width: "100%", height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: meeting.kind === "webinar",
          startWithVideoMuted: meeting.kind === "webinar" || voixSeule,
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
        else if (voixSeule) setCamOn(false);
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

      /**
       * La projection, reçue par le canal de données.
       *
       * La forme de l'événement varie selon les versions de Jitsi — le texte se trouve tantôt
       * sous `eventData.text`, tantôt sous `data.eventData.text`, tantôt à la racine. On
       * essaie les trois plutôt que de parier sur une : cette page tourne sur l'instance
       * publique meet.jit.si, dont nous ne choisissons pas la version.
       *
       * Le message n'est suivi QUE s'il vient d'un modérateur. Sans ce filtre, n'importe quel
       * participant pourrait faire défiler les diapositives de toute la salle. Le garde-fou
       * n'est pas parfait — Jitsi accorde le rôle de modérateur au premier arrivé — mais il
       * relève sensiblement la barre, et la conséquence d'un contournement reste bénigne :
       * des écrans désynchronisés, que le formateur remet d'accord d'un clic. Rien n'est
       * exposé, et l'index reçu est borné avant d'être appliqué.
       */
      api.addEventListener("endpointTextMessageReceived", (e: any) => {
        if (estPresentateur) return;
        const emetteurs = api.getParticipantsInfo?.() || [];
        const auteur = emetteurs.find((p: any) => p.participantId === expediteurDuMessage(e));
        const lu = lireMessageProjection(
          texteDuMessage(e), auteur ? auteur.role : null, meeting.slides?.length ?? 0);
        if (!("index" in lu)) return;
        canalVivant.current = true;      // le filet de sondage peut cesser
        setDiapo(lu.index);
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

  if (loading) return (
    <div className="min-h-screen bg-[#0b1220] grid place-items-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0b1220] grid place-items-center px-6 text-center text-slate-200">
      <div className="max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="font-semibold mb-4">{error}</p>
        <Link href="/academy/dashboard">
          <Button variant="outline" size="sm" className="gap-2 bg-white/5 border-white/15 text-slate-200 hover:bg-white/10 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
          </Button>
        </Link>
      </div>
    </div>
  );

  const isWebinar = meeting?.kind === "webinar";

  // ───────── Salon d'entrée ─────────
  // Le composant vit à part : il ouvre caméra et micro, mesure, puis les RELÂCHE avant de
  // rendre la main. Cette libération est la raison d'être de la séparation — la laisser ici,
  // au milieu du cycle de vie de Jitsi, c'était la condition pour l'oublier un jour.
  if (!joined) {
    return (
      <>
        <SEO title={`${meeting?.title || "Rencontre"} — LouisFarm Learning`} description="Rejoignez la rencontre en ligne." />
        <SalonEntree meeting={meeting} displayName={displayName} onRejoindre={joinMeeting} />
      </>
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
            <p className="text-[11px] text-white/50 chiffres-tabulaires">{fmtTime(elapsed)} · {participants.length} participant{participants.length > 1 ? "s" : ""}{diapos.length > 0 && <> · diapo {diapo + 1}/{diapos.length}</>}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setLayout(view === "grid" ? "speaker" : "grid")} title="Disposition" className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center"><LayoutGrid className="w-[18px] h-[18px]" /></button>
          <button onClick={() => setShowPeople(s => !s)} title="Participants" className={`w-9 h-9 rounded-xl flex items-center justify-center relative ${showPeople ? "bg-white/15" : "hover:bg-white/10"}`}>
            <Users className="w-[18px] h-[18px]" />
            <span className="absolute -top-1 -right-1 text-[9px] bg-teal-500 rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">{participants.length}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Scène vidéo (Jitsi engine, UI masquée) */}
        <div className="flex-1 relative min-w-0">
          {/* Le voile de connexion ne couvre plus indéfiniment.
              Il était opaque, à `inset-0`, et ne se levait qu'à `videoConferenceJoined` —
              lequel ne survient JAMAIS tant que meet.jit.si attend un modérateur. Or depuis
              le 24 août 2023 l'instance publique exige que le créateur de la salle se
              connecte (Google, GitHub ou Facebook). Jitsi affichait donc « Waiting for a
              moderator — Log in » juste derrière ce rectangle plein : personne ne pouvait
              lire le message ni atteindre le bouton, et la salle « tournait » sans fin.
              Passé huit secondes on s'efface et on explique. */}
          {!ready && !attenteLongue && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#0b1220]">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
              <p className="text-sm text-white/60">Connexion à la salle…</p>
            </div>
          )}

          {!ready && attenteLongue && (
            // `pointer-events-none` sur le conteneur : les clics traversent vers l'écran de
            // Jitsi, où se trouve le bouton de connexion.
            <div className="absolute inset-x-0 top-0 z-20 p-3 sm:p-4 pointer-events-none">
              <div className="mx-auto max-w-2xl rounded-2xl bg-[#0f172a]/95 backdrop-blur border border-amber-500/25 p-4 sm:p-5 pointer-events-auto">
                <div className="flex gap-3.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 text-[13.5px] leading-relaxed">
                    {estPresentateur ? (
                      <>
                        <p className="font-bold text-amber-200 mb-1.5">La salle attend que vous vous connectiez</p>
                        <p className="text-slate-300">
                          Jitsi demande qu'un modérateur s'identifie avant d'ouvrir une salle.
                          Utilisez le bouton de connexion affiché ci-dessous — Google, GitHub ou
                          Facebook — une seule fois par séance. Les étudiants entreront ensuite
                          sans rien avoir à faire.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-amber-200 mb-1.5">La séance n'a pas encore été ouverte</p>
                        <p className="text-slate-300">
                          Elle attend que le formateur se connecte. Restez sur cette page&nbsp;:
                          elle démarrera d'elle-même, vous n'avez rien à faire.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={jitsiRef} className="absolute inset-0" />

          {/* Support projeté — en superposition, jamais en remplacement : démonter le
              conteneur Jitsi couperait l'appel de tout le monde. */}
          {vueSupport && diapos.length > 0 && (
            <div className="absolute inset-0 z-30 bg-black flex flex-col">
              <div className="flex-1 relative min-h-0 grid place-items-center p-3 overflow-hidden">
                {/* `mode="popLayout"` : la diapositive sortante quitte le flux immédiatement,
                    sinon les deux se disputent la case de la grille et l'image saute d'un
                    demi-écran pendant le croisement. En mouvement réduit, fondu seul — pas de
                    glissement, mais l'image doit finir visible. */}
                <AnimatePresence mode="popLayout" initial={false} custom={sens.current}>
                  <motion.img key={diapos[diapo]?.url}
                    src={diapos[diapo]?.url}
                    alt={diapos[diapo]?.titre || `Diapositive ${diapo + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg row-start-1 col-start-1"
                    custom={sens.current}
                    initial={reduire ? { opacity: 0 } : { opacity: 0, x: sens.current * 56, scale: 0.985 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={reduire ? { opacity: 0 } : { opacity: 0, x: sens.current * -56, scale: 0.985 }}
                    transition={{ duration: reduire ? 0.12 : 0.34, ease: [0.16, 1, 0.3, 1] }} />
                </AnimatePresence>

                {estPresentateur && (
                  <>
                    <button onClick={() => allerDiapo(diapo - 1)} disabled={diapo === 0}
                      aria-label="Diapositive précédente"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-25 grid place-items-center backdrop-blur">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => allerDiapo(diapo + 1)} disabled={diapo === diapos.length - 1}
                      aria-label="Diapositive suivante"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-25 grid place-items-center backdrop-blur">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur text-xs font-medium chiffres-tabulaires">
                    {diapo + 1} / {diapos.length}
                  </span>
                  {!estPresentateur && (
                    <span className="px-3 py-1 rounded-full bg-teal-500/80 backdrop-blur text-[11px] font-medium">
                      Suit le présentateur
                    </span>
                  )}
                </div>
              </div>

              {vignettes && diapos.length > 1 && (
                <div className="shrink-0 border-t border-white/10 bg-[#0b1220]/80 backdrop-blur p-2">
                  <div className="flex gap-2 overflow-x-auto">
                    {diapos.map((d, i) => (
                      <button key={`${d.url}-${i}`}
                        onClick={() => estPresentateur && allerDiapo(i)}
                        disabled={!estPresentateur}
                        aria-label={`Diapositive ${i + 1}`}
                        aria-current={i === diapo}
                        className={`relative shrink-0 w-24 aspect-[4/3] rounded-md overflow-hidden border-2 transition-colors ${
                          i === diapo ? "border-teal-400" : "border-transparent opacity-55"
                        } ${estPresentateur ? "hover:opacity-100 cursor-pointer" : "cursor-default"}`}>
                        <img src={d.url} alt="" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/70 text-[9px] font-bold">{i + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setVignettes(v => !v)}
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur text-[11px] font-medium">
                {vignettes ? "Masquer les vignettes" : "Vignettes"}
              </button>
            </div>
          )}
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
        {diapos.length > 0 && (
          <Ctrl active={vueSupport} onClick={() => setVueSupport(v => !v)} on={Presentation} off={Presentation}
            label={vueSupport ? "Vidéo" : "Support"} highlight={vueSupport} />
        )}
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
