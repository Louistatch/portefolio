import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Video, VideoOff, Mic, MicOff, Volume2, Loader2, AlertCircle, Wifi,
} from "lucide-react";

/**
 * Le salon d'entrée — ce qu'on fait avant de pousser la porte.
 *
 * Il n'y en avait pas. `prejoinPageEnabled: false` désactive celui de Jitsi et rien ne le
 * remplaçait : on entrait sans avoir rien vérifié, et la première minute de chaque séance
 * se perdait en « tu m'entends ? ».
 *
 * Trois choses s'y règlent, dans l'ordre où elles comptent pour la promotion :
 *
 *   1. Est-ce que ma caméra et mon micro marchent — vu, pas supposé.
 *   2. Est-ce que ma connexion tient la vidéo, et sinon, comment entrer quand même.
 *   3. Combien cela va me coûter en données mobiles.
 *
 * Le troisième point n'existe sur aucune plateforme comparable. Il existe ici parce que la
 * promotion se connecte depuis le Togo en données mobiles, et que le prix du mégaoctet
 * décide plus souvent que la qualité de l'image.
 */

/** Débits observés d'une conférence Jitsi, pour l'estimation en mégaoctets. Volontairement
 *  hauts : mieux vaut annoncer 700 Mo et en consommer 500 que l'inverse. */
const DEBIT_VIDEO_KBPS = 1000;
const DEBIT_VOIX_KBPS = 60;

const mo = (kbps: number, minutes: number) => Math.round((kbps * 60 * minutes) / 8 / 1000);

type Etat = "demande" | "ok" | "refuse" | "absent" | "occupe" | "impossible";

type Reseau = { qualite: "bonne" | "moyenne" | "faible" | "inconnue"; detail: string };

/**
 * Ce que le navigateur sait du réseau. `navigator.connection` n'est pas standardisé et
 * n'existe pas sur Safari — mais il existe sur Chrome Android, c'est-à-dire sur la quasi-
 * totalité des appareils de la promotion. Quand il manque, on ne devine pas : on le dit.
 */
function lireReseau(): Reseau {
  const c = (navigator as any).connection;
  if (!c) return { qualite: "inconnue", detail: "Votre navigateur ne renseigne pas la qualité du réseau." };
  const type = String(c.effectiveType || "");
  const debit = Number(c.downlink);
  if (c.saveData) return { qualite: "faible", detail: "Votre appareil est en économiseur de données." };
  if (type === "4g" && debit >= 2) return { qualite: "bonne", detail: `≈ ${debit.toFixed(1)} Mb/s descendants.` };
  if (type === "4g") return { qualite: "moyenne", detail: `≈ ${debit.toFixed(1)} Mb/s — la vidéo risque de saccader.` };
  if (type === "3g") return { qualite: "moyenne", detail: "Réseau 3G — la vidéo passera mal." };
  if (type === "2g" || type === "slow-2g") return { qualite: "faible", detail: "Réseau très lent — la voix seule est vivement conseillée." };
  return { qualite: "inconnue", detail: "Qualité du réseau indéterminée." };
}

export function SalonEntree({ meeting, displayName, onRejoindre }: {
  meeting: any;
  displayName: string;
  /** `voixSeule` doit atteindre Jitsi : c'est lui qui décidera de ne pas ouvrir la caméra. */
  onRejoindre: (options: { voixSeule: boolean }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  const [etat, setEtat] = useState<Etat>("demande");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [niveau, setNiveau] = useState(0);
  const [voixSeule, setVoixSeule] = useState(false);
  const [testEnCours, setTestEnCours] = useState(false);
  const [reseau] = useState<Reseau>(() => lireReseau());

  const minutes = Number(meeting?.duration_min) || 90;
  const moVideo = mo(DEBIT_VIDEO_KBPS + DEBIT_VOIX_KBPS, minutes);
  const moVoix = mo(DEBIT_VOIX_KBPS, minutes);

  /**
   * Libère caméra et micro.
   *
   * Appelé au démontage ET juste avant de rejoindre. Le second appel est le plus important :
   * sans lui, la caméra reste tenue par cette page pendant que Jitsi la redemande, et sur
   * beaucoup d'appareils Android le second accès échoue — on entre dans la séance sans
   * image, précisément à cause de l'écran censé la vérifier.
   */
  const liberer = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    fluxRef.current?.getTracks().forEach(t => t.stop());
    fluxRef.current = null;
    // Fermer le contexte audio : chaque contexte laissé ouvert garde le micro actif dans
    // l'indicateur du système, ce qui inquiète légitimement.
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  useEffect(() => liberer, [liberer]);

  // ── Ouverture des périphériques ──
  useEffect(() => {
    let annule = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setEtat("impossible"); return; }
      try {
        const flux = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (annule) { flux.getTracks().forEach(t => t.stop()); return; }
        fluxRef.current = flux;
        if (videoRef.current) videoRef.current.srcObject = flux;
        setEtat("ok");

        // Le niveau du micro, mesuré en continu. C'est ce que Zoom et Meet ne font pas :
        // l'un enregistre puis rejoue, l'autre ne montre le niveau que dans sa salle
        // d'attente. Ici la barre bouge tant qu'on est dans le salon.
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = new Ctx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(flux);
        const analyseur = ctx.createAnalyser();
        analyseur.fftSize = 512;
        source.connect(analyseur);
        const donnees = new Uint8Array(analyseur.frequencyBinCount);

        // Le vumètre compte douze barres : il ne peut afficher que douze valeurs. Mesurer à
        // chaque image et pousser chaque mesure dans l'état, c'était soixante rendus par
        // seconde de tout cet écran — aperçu vidéo compris — pour une barre qui, la plupart
        // du temps, ne bouge pas. On quantifie sur les douze crans et on ne rend QUE si le
        // cran change. Sur un téléphone d'entrée de gamme, la différence se sent.
        //
        // La valeur retenue est aussi une descente lente : la voix humaine a des creux entre
        // les syllabes, et une barre qui retombe à zéro à chaque respiration donne
        // l'impression d'un micro qui coupe.
        let precedent = -1;
        let lisse = 0;
        const mesurer = () => {
          analyseur.getByteTimeDomainData(donnees);
          // Valeur efficace autour de 128 (le silence), pas un maximum : un maximum saute
          // sur le moindre craquement et ne dit rien de la voix.
          let somme = 0;
          for (let i = 0; i < donnees.length; i++) {
            const d = (donnees[i] - 128) / 128;
            somme += d * d;
          }
          const rms = Math.min(1, Math.sqrt(somme / donnees.length) * 3.2);
          lisse = rms > lisse ? rms : lisse * 0.82 + rms * 0.18;
          const cran = Math.round(lisse * 12);
          if (cran !== precedent) { precedent = cran; setNiveau(cran / 12); }
          rafRef.current = requestAnimationFrame(mesurer);
        };
        rafRef.current = requestAnimationFrame(mesurer);
      } catch (e: any) {
        if (annule) return;
        const nom = e?.name || "";
        setEtat(nom === "NotAllowedError" || nom === "SecurityError" ? "refuse"
          : nom === "NotFoundError" || nom === "OverconstrainedError" ? "absent"
          : nom === "NotReadableError" || nom === "AbortError" ? "occupe"
          : "impossible");
      }
    })();
    return () => { annule = true; };
  }, []);

  // Couper la caméra coupe la PISTE, pas seulement l'affichage : sinon la diode reste
  // allumée et l'étudiant a raison de ne pas nous croire.
  useEffect(() => {
    fluxRef.current?.getVideoTracks().forEach(t => { t.enabled = camOn && !voixSeule; });
  }, [camOn, voixSeule, etat]);
  useEffect(() => {
    fluxRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; });
  }, [micOn, etat]);

  /** Test du haut-parleur : une note brève, générée. Pas de fichier à charger — un test qui
   *  dépend du réseau ne teste plus le haut-parleur. */
  const testerHautParleur = useCallback(() => {
    if (testEnCours) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 528;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.85);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
      setTestEnCours(true);
      osc.onended = () => { setTestEnCours(false); ctx.close().catch(() => {}); };
    } catch { setTestEnCours(false); }
  }, [testEnCours]);

  const rejoindre = () => { liberer(); onRejoindre({ voixSeule }); };

  const initiales = (displayName || "").split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "ET";
  const camVisible = etat === "ok" && camOn && !voixSeule;
  const debut = meeting?.starts_at ? new Date(meeting.starts_at) : null;

  const messageEtat: Record<Etat, string> = {
    demande: "Autorisez la caméra et le micro quand votre navigateur le demande.",
    ok: "",
    refuse: "Caméra et micro refusés. Vous pouvez entrer quand même — vous écouterez sans être vu ni entendu. Pour les autoriser, touchez l'icône de cadenas dans la barre d'adresse.",
    absent: "Aucune caméra ni micro détectés sur cet appareil. Vous pouvez entrer pour suivre la séance.",
    occupe: "Votre caméra est déjà utilisée par une autre application. Fermez-la, puis rechargez cette page.",
    impossible: "Ce navigateur ne permet pas l'aperçu. Vous pouvez entrer directement.",
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-200 px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-[10px] bg-primary grid place-items-center text-sm font-extrabold text-white">L</span>
            <div>
              <div className="text-[13px] font-bold leading-tight">LouisFarm Learning</div>
              <div className="sur-titre text-slate-400">Salon d'entrée</div>
            </div>
          </div>
          <Link href="/academy/dashboard">
            <button className="flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Retour au tableau de bord</span>
            </button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-5 lg:gap-7">

          {/* ── Aperçu ── */}
          <div className="flex flex-col gap-4">
            <div className="relative bg-[#020617] rounded-2xl overflow-hidden border border-white/[0.07] aspect-video">
              <video ref={videoRef} autoPlay playsInline muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${camVisible ? "opacity-100" : "opacity-0"}`}
                style={{ transform: "scaleX(-1)" }} />

              {!camVisible && (
                <div className="absolute inset-0 grid place-items-center"
                  style={{ background: "radial-gradient(circle at 50% 42%, #1e293b, #020617 72%)" }}>
                  <div className="text-center px-6">
                    {etat === "demande" ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/20 grid place-items-center mx-auto mb-4 titre-affichage text-3xl sm:text-4xl font-semibold text-teal-300">
                        {initiales}
                      </div>
                    )}
                    <p className="text-sm text-slate-400 mt-3 max-w-sm leading-relaxed">
                      {etat === "ok" ? "Caméra coupée" : messageEtat[etat]}
                    </p>
                  </div>
                </div>
              )}

              {etat === "ok" && (
                <span className="absolute top-4 left-4 inline-flex items-center gap-2 bg-[#020617]/70 backdrop-blur px-3 py-1.5 rounded-full text-[11.5px] font-medium">
                  <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" /> Caméra prête
                </span>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5">
                <BoutonPeriph actif={micOn} onClick={() => setMicOn(v => !v)} desactive={etat !== "ok"}
                  on={<Mic className="w-[19px] h-[19px]" />} off={<MicOff className="w-[19px] h-[19px]" />}
                  titre={micOn ? "Couper le micro" : "Activer le micro"} />
                <BoutonPeriph actif={camOn && !voixSeule} onClick={() => setCamOn(v => !v)} desactive={etat !== "ok" || voixSeule}
                  on={<Video className="w-[19px] h-[19px]" />} off={<VideoOff className="w-[19px] h-[19px]" />}
                  titre={camOn ? "Couper la caméra" : "Activer la caméra"} />
              </div>
            </div>

            {/* Le niveau du micro */}
            <div className="bg-[#0f172a] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div className="text-[13.5px] font-bold">
                  {etat === "ok" && micOn ? "Dites quelque chose — la barre doit bouger" : "Niveau du micro"}
                </div>
                <button onClick={testerHautParleur} disabled={testEnCours}
                  className="flex items-center gap-1.5 bg-primary/20 text-teal-300 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50">
                  <Volume2 className="w-3.5 h-3.5" /> {testEnCours ? "Écoutez…" : "Tester le haut-parleur"}
                </button>
              </div>
              <NiveauMicro niveau={etat === "ok" && micOn ? niveau : 0} actif={etat === "ok" && micOn} />
              <p className="text-[11.5px] text-slate-500 mt-3 leading-relaxed">
                {etat === "ok" && micOn
                  ? "Le niveau reste visible tant que vous êtes ici."
                  : etat === "ok" ? "Micro coupé — réactivez-le pour vérifier." : messageEtat[etat]}
              </p>
            </div>
          </div>

          {/* ── Colonne de droite ── */}
          <div className="flex flex-col gap-4">

            <div className="bg-[#0f172a] border border-white/[0.06] rounded-2xl p-5">
              <div className="sur-titre text-slate-400 mb-2.5">Séance</div>
              <h1 className="titre-affichage text-[22px] font-semibold text-white mb-2">{meeting?.title}</h1>
              {debut && (
                <div className="text-[13px] text-slate-400 chiffres-tabulaires">
                  {debut.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  {" · "}{debut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}{minutes} min
                </div>
              )}
              {meeting?.kind === "webinar" && (
                <p className="text-[12.5px] text-slate-400 mt-3 leading-relaxed">
                  Webinaire : vous entrez avec micro et caméra coupés. Levez la main pour demander la parole.
                </p>
              )}
            </div>

            {/* Réseau et données — le point qui décide ici */}
            <div className="bg-[#0f172a] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13.5px] font-bold flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-slate-400" /> Votre connexion
                </div>
                <EtiquetteReseau qualite={reseau.qualite} />
              </div>
              <p className="text-[12.5px] text-slate-400 leading-relaxed">{reseau.detail}</p>

              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold mb-0.5">Entrer en voix seule</span>
                    <span className="block text-[11.5px] text-slate-500 chiffres-tabulaires">
                      ≈ {moVoix} Mo pour {minutes} min, au lieu de {moVideo} Mo
                    </span>
                  </span>
                  <span onClick={() => setVoixSeule(v => !v)}
                    className={`relative w-[46px] h-[27px] rounded-full shrink-0 transition-colors ${voixSeule ? "bg-primary" : "bg-white/15"}`}>
                    <span className={`absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white transition-all ${voixSeule ? "left-[22px]" : "left-[3px]"}`} />
                  </span>
                </label>
                {reseau.qualite !== "bonne" && reseau.qualite !== "inconnue" && !voixSeule && (
                  <div className="mt-3 bg-amber-500/10 rounded-xl px-4 py-3 text-[12.5px] text-amber-200/90 leading-relaxed">
                    Sur cette connexion, la vidéo risque de saccader. La voix seule garde le son net et le support lisible.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#0f172a] border border-white/[0.06] rounded-2xl px-5 py-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-primary/20 grid place-items-center text-[12.5px] font-extrabold text-teal-300 shrink-0">
                {initiales}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] text-slate-500">Vous entrez en tant que</span>
                <span className="block text-sm font-bold truncate">{displayName}</span>
              </span>
            </div>

            <button onClick={rejoindre}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white text-[15.5px] font-bold flex items-center justify-center gap-2.5 transition-colors pressable">
              <Video className="w-5 h-5" /> Rejoindre la séance
            </button>

            {(etat === "refuse" || etat === "absent") && (
              <p className="text-[12px] text-amber-200/80 leading-relaxed flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                Vous entrerez sans caméra ni micro. Vous verrez et entendrez la séance.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Le vumètre.
 *
 * Douze barres et non une jauge continue : une jauge lisse ne dit pas si le micro capte la
 * voix ou du souffle, alors qu'une barre qui monte par crans se lit d'un coup d'œil. La
 * douzième ne s'allume qu'à saturation — elle prévient qu'on est trop près du micro.
 */
function NiveauMicro({ niveau, actif }: { niveau: number; actif: boolean }) {
  const barres = 12;
  const allumees = Math.round(niveau * barres);
  return (
    <div className="flex gap-[3px] items-end h-8" role="meter" aria-label="Niveau du micro"
      aria-valuenow={Math.round(niveau * 100)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: barres }, (_, i) => {
        const active = actif && i < allumees;
        const sature = i >= barres - 2;
        return (
          <span key={i}
            className="flex-1 rounded-[2px] transition-[height,background-color] duration-75"
            style={{
              height: `${30 + (i / (barres - 1)) * 70}%`,
              background: active ? (sature ? "#f59e0b" : "hsl(var(--primary))") : "rgba(148,163,184,0.14)",
            }} />
        );
      })}
    </div>
  );
}

function EtiquetteReseau({ qualite }: { qualite: Reseau["qualite"] }) {
  const style = {
    bonne: { t: "Bonne", c: "#4ade80" },
    moyenne: { t: "Moyenne", c: "#fbbf24" },
    faible: { t: "Faible", c: "#f87171" },
    inconnue: { t: "Non mesurée", c: "#94a3b8" },
  }[qualite];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold" style={{ color: style.c }}>
      <span className="w-[7px] h-[7px] rounded-full" style={{ background: style.c }} /> {style.t}
    </span>
  );
}

function BoutonPeriph({ actif, onClick, on, off, titre, desactive }: {
  actif: boolean; onClick: () => void; on: React.ReactNode; off: React.ReactNode;
  titre: string; desactive?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={desactive} title={titre} aria-label={titre}
      className={`w-[46px] h-[46px] rounded-[14px] grid place-items-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
        actif ? "bg-white/10 hover:bg-white/[0.16] text-white" : "bg-red-500/25 hover:bg-red-500/35 text-red-200"
      }`}>
      {actif ? on : off}
    </button>
  );
}
