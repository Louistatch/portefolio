import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, Megaphone, Copy, Check, Users, Wallet, Award,
  Download, Lock, CheckCircle2, Sparkles, Briefcase, TrendingUp,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, downloadStudentFile } from "@/lib/student";

type Etat = {
  isAmbassador: boolean;
  eligible: boolean;
  joursDepuisAdmission: number | null;
  leconsTerminees: number;
  seuil: { jours: number; lecons: number };
  code?: string;
  since?: string;
  lien?: string;
  taux?: number;
  totalGagne?: number;
  totalPaye?: number;
  enAttente?: number;
  filleuls?: { id: number; full_name: string; created_at: string }[];
  commissions?: { id: number; filleul: string; amount: number; devise: string; status: string; created_at: string }[];
};

/**
 * Programme ambassadeur — page unique à deux visages.
 *
 * Avant l'adhésion, elle se lit comme une offre de stage : ce que le rôle apporte, ce qu'il
 * exige, où on en est par rapport au seuil. Après, elle devient un tableau de bord de
 * parrainage. Une seule page plutôt que deux : le passage de l'une à l'autre EST la
 * progression que le programme veut raconter.
 */
export default function AcademyAmbassador() {
  const [, navigate] = useLocation();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejoindre, setRejoindre] = useState(false);
  const [erreur, setErreur] = useState("");
  const [copie, setCopie] = useState(false);
  const [telechargement, setTelechargement] = useState(false);

  async function charger() {
    const r = await studentFetch("/api/academy/ambassador/me").then(r => r.json());
    setEtat(r);
  }

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    charger().finally(() => setLoading(false));
  }, []);

  async function rejoindreLeProgramme() {
    setRejoindre(true); setErreur("");
    try {
      const res = await studentFetch("/api/academy/ambassador/join", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setErreur(data.message || "Inscription impossible pour le moment."); return; }
      await charger();
    } catch { setErreur("Erreur réseau. Réessayez."); }
    finally { setRejoindre(false); }
  }

  function copierLien() {
    if (!etat?.lien) return;
    navigator.clipboard.writeText(etat.lien).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    });
  }

  async function telechargerCertificat() {
    setTelechargement(true);
    try { await downloadStudentFile("/api/academy/certificate/ambassador", "certificat-ambassadeur"); }
    catch { alert("Téléchargement impossible, réessayez."); }
    finally { setTelechargement(false); }
  }

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!etat) return null;

  const texteAPartager = etat.lien
    ? `J'apprends le MEAL gratuitement avec LouisFarm Learning — collecte de données, cartographie, automatisation du reporting, par la pratique. Si ça t'intéresse, inscris-toi avec mon lien : ${etat.lien}`
    : "";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <SEO title="Programme ambassadeur — LouisFarm Learning" description="Recommandez la formation, gagnez une commission, et faites-en une expérience professionnelle." />
      <button onClick={() => navigate("/academy/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Tableau de bord
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> Programme ambassadeur</h1>
        <p className="text-sm text-muted-foreground mt-1">Représentez LouisFarm Learning, touchez une commission, et construisez une vraie référence professionnelle.</p>
      </div>

      {!etat.isAmbassador ? (
        <>
          {/* ── Présentation, façon offre de mission ── */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Ce que le rôle apporte</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Avantage icone={Wallet} titre="20 % de commission" texte="Sur le prix de l'attestation payée par chaque personne que vous recrutez." />
              <Avantage icone={Award} titre="Un certificat" texte="Vos filleuls, vos conversions, vos gains — un document à mettre sur LinkedIn ou un CV." />
              <Avantage icone={Sparkles} titre="Liberté totale" texte="Aucune exclusivité : parlez-en où vous voulez, à qui vous voulez." />
            </div>
          </div>

          {/* ── Éligibilité ── */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 mb-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Conditions pour rejoindre</h2>
            <div className="space-y-4">
              <Critere
                fait={(etat.joursDepuisAdmission ?? 0) >= etat.seuil.jours}
                label={`Au moins ${etat.seuil.jours} jours depuis votre admission`}
                detail={etat.joursDepuisAdmission == null ? "Pas encore admis(e) à un parcours" : `${etat.joursDepuisAdmission} / ${etat.seuil.jours} jours`} />
              <Critere
                fait={etat.leconsTerminees >= etat.seuil.lecons}
                label={`Au moins ${etat.seuil.lecons} leçons terminées`}
                detail={`${etat.leconsTerminees} / ${etat.seuil.lecons} leçons`} />
            </div>

            {erreur && <p className="text-sm text-destructive mt-4">{erreur}</p>}

            <div className="mt-5">
              {etat.eligible ? (
                <Button className="gap-2" disabled={rejoindre} onClick={rejoindreLeProgramme}>
                  {rejoindre ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  Devenir ambassadeur
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
                  <Lock className="w-4 h-4 shrink-0" /> Pas encore éligible — continuez vos leçons, cette page se mettra à jour.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Tableau de bord ambassadeur ── */}
          <div className="bg-card rounded-2xl border border-primary/30 bg-primary/5 p-6 mb-6">
            <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Votre lien de parrainage</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 min-w-0 truncate text-sm bg-background border border-border/60 rounded-xl px-3 py-2.5">{etat.lien}</code>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={copierLien}>
                {copie ? <><Check className="w-3.5 h-3.5" /> Copié</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Code : <span className="font-mono font-medium text-foreground">{etat.code}</span> · Ambassadeur depuis le {etat.since ? new Date(etat.since).toLocaleDateString("fr-FR") : "—"}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat icone={Users} label="Filleuls" valeur={String(etat.filleuls?.length || 0)} />
            <Stat icone={Wallet} label="Gagné" valeur={`${(etat.totalGagne || 0).toLocaleString("fr-FR")} F`} accent />
            <Stat icone={TrendingUp} label="En attente" valeur={`${(etat.enAttente || 0).toLocaleString("fr-FR")} F`} />
          </div>

          {/* ── Texte prêt à partager ── */}
          <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Megaphone className="w-4 h-4 text-primary" /> À copier-coller</h2>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3.5 leading-relaxed">{texteAPartager}</p>
          </div>

          {/* ── Filleuls et commissions ── */}
          <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> Vos filleuls ({etat.filleuls?.length || 0})</h2>
            {!etat.filleuls?.length ? (
              <p className="text-sm text-muted-foreground py-2">Personne pour l'instant — partagez votre lien pour commencer.</p>
            ) : (
              <div className="space-y-1.5">
                {etat.filleuls.map(f => {
                  const commission = etat.commissions?.find(c => c.filleul === f.full_name);
                  return (
                    <div key={f.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                      <span className="truncate flex-1">{f.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{new Date(f.created_at).toLocaleDateString("fr-FR")}</span>
                      {commission && (
                        <span className={`text-xs font-semibold ml-3 px-2 py-0.5 rounded-full ${commission.status === "payee" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                          {commission.amount.toLocaleString("fr-FR")} F {commission.status === "payee" ? "· payée" : "· en attente"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Certificat ── */}
          <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-1.5"><Award className="w-4 h-4 text-primary" /> Certificat d'ambassadeur</h2>
              <p className="text-xs text-muted-foreground mt-1">À joindre à un CV ou publier sur LinkedIn.</p>
            </div>
            <Button size="sm" className="gap-1.5" disabled={telechargement} onClick={telechargerCertificat}>
              {telechargement ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Télécharger
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Avantage({ icone: Icone, titre, texte }: { icone: any; titre: string; texte: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
        <Icone className="w-4.5 h-4.5 text-primary" />
      </div>
      <p className="text-sm font-medium">{titre}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{texte}</p>
    </div>
  );
}

function Critere({ fait, label, detail }: { fait: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${fait ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        {fait ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function Stat({ icone: Icone, label, valeur, accent }: { icone: any; label: string; valeur: string; accent?: boolean }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 text-center">
      <Icone className={`w-4 h-4 mx-auto mb-1.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <p className={`text-lg font-bold ${accent ? "text-primary" : ""}`}>{valeur}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
