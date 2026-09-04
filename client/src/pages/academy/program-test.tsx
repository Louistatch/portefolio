import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Loader2, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { isStudentLoggedIn, studentFetch } from "@/lib/student";
import { programById, type Program } from "@shared/programs";
import { BANQUES_ADMISSION } from "@shared/tests-parcours";

/**
 * Test d'admission d'un parcours.
 *
 * Une seule page pour tous les parcours ayant leur propre porte d'entrée : le parcours est un
 * paramètre d'adresse, les questions viennent d'un registre. Écrire une page par test aurait
 * produit trois copies à corriger séparément le jour où la navigation change.
 *
 * Le score est calculé CÔTÉ SERVEUR uniquement. Le navigateur n'a que les énoncés et les
 * options ; la clé de correction ne quitte jamais api/.
 *
 * ── Sur l'allure de cette page ──
 *
 * Registre visuel de l'épreuve écrite, pas de l'application : hiérarchie portée par la
 * typographie et l'espace plutôt que par des cartes empilées, filets d'un pixel, chiffres
 * tabulaires pour que les compteurs ne sautillent pas d'une question à l'autre, et une
 * seule couleur — l'accent du parcours — employée avec parcimonie.
 *
 * Ce n'est pas une préférence esthétique. Cette page annonce, en cas de réussite, une
 * attestation à 10 000 F CFA : le candidat doit avoir le sentiment d'avoir passé quelque
 * chose qui compte. Une page d'examen qui ressemble à un formulaire d'inscription à une
 * infolettre dévalue ce qu'elle délivre, et le prix devient plus difficile à défendre.
 *
 * La sélection d'une réponse ne repose JAMAIS sur la seule couleur : bordure appuyée, fond
 * léger et coche explicite. C'est ce qui la rend lisible en daltonisme, et sur les écrans
 * de téléphone en plein soleil — le cas courant de nos étudiants.
 */

/** Cadre commun des écrans d'état : filet accentué, label, contenu. */
function EcranAdministratif({ accent, label, children }: {
  accent: string; label: string; children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8 py-10 sm:py-16">
      <div className="border-t-2 pt-6 max-w-2xl" style={{ borderColor: accent }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function ProgramTest() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/academy/test/:id");
  const programId = params?.id ?? "";

  const [chargement, setChargement] = useState(true);
  const [statut, setStatut] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [reponses, setReponses] = useState<Record<number, number>>({});
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<any>(null);
  const [engage, setEngage] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const r = await studentFetch(`/api/academy/programs/${programId}/test-status`);
        const d = await r.json();
        // Vérifier la réponse plutôt que la supposer : un parcours dont le test n'est pas
        // encore disponible répond 503, et l'afficher comme « 0 bonne réponse » serait faux.
        if (!r.ok) { setErreur(d?.message || "Ce test n'est pas accessible."); return; }
        setStatut(d);
      } catch { setErreur("Impossible de charger le test. Vérifiez votre connexion."); }
      finally { setChargement(false); }
    })();
  }, [programId]);

  let parcours: Program | null = null;
  try { parcours = programById(programId); } catch { parcours = null; }
  const questions = BANQUES_ADMISSION[programId] ?? [];

  if (chargement) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-24">
        <div className="h-0.5 w-24 bg-muted overflow-hidden" role="status" aria-label="Chargement">
          <div className="h-full w-1/3 animate-pulse" style={{ background: parcours?.accent ?? "currentColor" }} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Chargement de l'épreuve…</p>
      </div>
    );
  }

  if (!parcours || questions.length === 0 || erreur) {
    return (
      <EcranAdministratif accent="#7f1d1d" label="Épreuve indisponible">
        <p className="mt-4 leading-7 text-muted-foreground">
          {erreur || "Ce parcours n'a pas de test d'admission en ligne pour le moment."}
        </p>
        <Button variant="outline" className="mt-6 gap-2 min-h-11 rounded-none"
          onClick={() => navigate("/academy/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Retour à mon espace
        </Button>
      </EcranAdministratif>
    );
  }

  const accent = parcours.accent;

  // ── Déjà admis ──
  if (statut?.passed && !resultat) {
    return (
      <EcranAdministratif accent={accent} label="Statut du dossier">
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">Admission acquise</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Votre admission au parcours « {parcours.title} » est active. Il n'y a pas lieu de
          repasser l'épreuve.
        </p>
        <Button className="mt-6 gap-2 min-h-11 rounded-none border-0 text-white"
          style={{ background: accent }}
          onClick={() => navigate(`/academy/parcours/${programId}`)}>
          Ouvrir le parcours <ArrowRight className="w-4 h-4" />
        </Button>
      </EcranAdministratif>
    );
  }

  // ── Délai de reprise en cours ──
  if (statut && !statut.canRetry && statut.nextTestAllowed && !resultat) {
    const quand = new Date(statut.nextTestAllowed).toLocaleDateString("fr-FR",
      { day: "numeric", month: "long", year: "numeric" });
    return (
      <EcranAdministratif accent={accent} label="Délai de reprise">
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
          Nouvelle tentative différée
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Vous avez déjà passé cette épreuve sans atteindre le score requis. Le délai
          d'une semaine existe pour vous laisser réviser, pas pour vous écarter.
        </p>
        <dl className="mt-6 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-muted-foreground">Tentatives</dt>
            <dd className="font-mono tabular-nums">{statut.attempts ?? 0}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-muted-foreground">Reprise possible à partir du</dt>
            <dd className="font-medium">{quand}</dd>
          </div>
        </dl>
        <Button variant="outline" className="mt-6 min-h-11 rounded-none"
          onClick={() => navigate("/academy/dashboard")}>
          Retour à mon espace
        </Button>
      </EcranAdministratif>
    );
  }

  // ── Résultat ──
  if (resultat) {
    const admis = resultat.passed;
    // Le tarif vient du serveur, jamais d'une constante recopiée ici : un prix écrit à
    // deux endroits finit par différer, et c'est l'étudiant qui découvre l'écart en payant.
    const prixAttestation = Number(resultat.prixAttestation ?? 0);
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-10 sm:py-16">
        <div className="border-t-2 pt-6" style={{ borderColor: accent }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
            Résultat de l'épreuve
          </p>

          {/* Le score est un fait administratif : composé comme tel, cadré à gauche, sans
              médaille ni cercle. Le chiffre porte l'information, la phrase dit la suite. */}
          <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <p className="font-mono text-6xl font-semibold tabular-nums tracking-tight leading-none">
                {resultat.score}
                <span className="text-2xl text-muted-foreground"> / {resultat.nbQuestions}</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Seuil d'admission : <span className="font-mono tabular-nums">{resultat.seuil}</span> bonnes
                réponses sur <span className="font-mono tabular-nums">{resultat.nbQuestions}</span>.
              </p>
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {admis ? "Vous êtes admis(e)" : "Score insuffisant"}
              </h1>
              <p className="mt-4 leading-7 text-muted-foreground">
                {admis
                  ? `Le parcours « ${parcours.title} » vous est ouvert. Vos premières leçons sont disponibles dès maintenant.`
                  : "Vous pourrez repasser l'épreuve dans une semaine. Les questions porteront sur les mêmes domaines."}
              </p>
              {admis && parcours.credential && (
                <p className="mt-4 text-sm leading-6">
                  Ce parcours mène au <strong>{parcours.credential}</strong>.
                </p>
              )}
              {resultat.message && (
                <p className="mt-4 text-sm text-destructive leading-6">{resultat.message}</p>
              )}
            </div>
          </div>

          {/* ── Le tarif, annoncé au sommet de l'engagement ──

              C'est ici que le prix doit être lu, et nulle part plus tard. La personne vient
              de réussir une épreuve et de s'entendre dire qu'elle est admise : c'est le
              moment où elle est le plus disposée à accepter une condition, et le seul où
              l'annonce reste honnête. À la semaine huit, la même somme découverte pour la
              première fois se lirait comme un piège — et un seul message de ce genre
              circulant sur WhatsApp coûte plus cher que dix inscriptions.

              La case n'est pas un verrou : l'admission est déjà accordée, la retirer à qui
              ne coche pas serait hostile. C'est un enregistrement — la date et le montant
              affiché à cet instant — parce que le tarif changera et que ce qui a été accepté
              ne doit pas changer avec lui. */}
          {admis && prixAttestation > 0 && (
            <section className="mt-12 max-w-2xl border-t border-border pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
                Conditions financières
              </p>
              <h2 className="mt-3 text-xl font-semibold">La formation est gratuite, l'attestation ne l'est pas</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                À la fin du parcours, l'attestation vérifiable — à votre nom, signée, avec son
                code de vérification — coûte{" "}
                <strong className="whitespace-nowrap text-foreground">
                  {prixAttestation.toLocaleString("fr-FR")} F CFA
                </strong>. Vous ne réglez rien avant de l'avoir terminé.
              </p>
              <label className="mt-6 flex min-h-14 items-start gap-3 border border-border p-4 text-sm leading-6 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 shrink-0"
                  style={{ accentColor: accent }}
                  checked={engage} onChange={e => setEngage(e.target.checked)} />
                <span>
                  Je m'engage à suivre {parcours.lessonsPerWeek === 1 ? "une leçon" : `${parcours.lessonsPerWeek} leçons`} par
                  semaine, et je sais que l'attestation coûte {prixAttestation.toLocaleString("fr-FR")} F CFA à la fin.
                </span>
              </label>
            </section>
          )}

          <div className="mt-8">
            <Button className="gap-2 min-h-11 rounded-none border-0 text-white disabled:opacity-50"
              style={{ background: accent }}
              disabled={admis && prixAttestation > 0 && !engage}
              onClick={async () => {
                if (admis && prixAttestation > 0 && engage) {
                  // L'enregistrement ne doit pas retenir l'étudiant : s'il échoue, on
                  // continue. Le rappel de mi-parcours reste là pour rattraper.
                  await studentFetch(`/api/academy/programs/${programId}/engagement`, { method: "POST" })
                    .catch(() => {});
                }
                navigate(admis ? `/academy/parcours/${programId}` : "/academy/dashboard");
              }}>
              {admis ? "Commencer le parcours" : "Retour à mon espace"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── L'épreuve ──
  const q = questions[idx];
  const choisie = reponses[idx];
  const repondues = Object.keys(reponses).length;
  const restantes = questions.length - repondues;

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const tableau = questions.map((_, i) => (reponses[i] ?? -1));
      const r = await studentFetch(`/api/academy/programs/${programId}/submit-test`, {
        method: "POST", body: JSON.stringify({ answers: tableau }),
      });
      const d = await r.json();
      // Le serveur explique pourquoi il refuse — déjà admis, délai non écoulé, test
      // indisponible. Afficher ce message vaut mieux qu'une erreur générique.
      if (!r.ok && typeof d?.score !== "number") { setErreur(d?.message || "Envoi impossible."); return; }
      setResultat(d);
    } catch { setErreur("Envoi impossible. Vérifiez votre connexion et réessayez."); }
    finally { setEnvoi(false); }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8 py-8 sm:py-12" translate="no">
      <SEO title={`Test d'admission — ${parcours.title}`} description={parcours.subtitle} />

      <header className="border-t-2 pt-6" style={{ borderColor: accent }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
          Épreuve d'admission
        </p>
        <h1 className="mt-2 text-xl font-semibold leading-tight">{parcours.title}</h1>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          <span className="font-mono tabular-nums">{statut?.nbQuestions ?? questions.length}</span> questions ·{" "}
          <span className="font-mono tabular-nums">{statut?.seuil ?? "—"}</span> bonnes réponses requises ·
          aucune pénalité en cas d'erreur
        </p>
      </header>

      {/* Deux colonnes à partir de lg : la progression tient dans une colonne étroite, la
          question occupe la principale. En dessous, tout s'empile — c'est l'écran de 390 px
          qui commande, puisque c'est celui de la plupart de nos étudiants. */}
      {/* ── L'ordre, et pourquoi il n'est pas le même selon l'écran ──

          Sur téléphone, la grille de vingt cases placée avant la question la repoussait
          sous la ligne de flottaison : on ouvrait l'épreuve et on voyait un damier, pas
          une question. La grille passe donc APRÈS sur mobile — c'est un moyen de
          navigation, pas le contenu — et revient dans la colonne de gauche à partir de
          lg, où la place ne manque plus. Constaté sur une capture à 390 px, pas supposé. */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
        <aside className="order-last lg:order-first border-t border-border pt-6 lg:border-t-0 lg:pt-0">
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {repondues} répondue{repondues > 1 ? "s" : ""} · {restantes} restante{restantes > 1 ? "s" : ""}
          </p>

          {/* Une seule expression de la progression : une grille de cases, comme le report
              de copies d'un examen. Cliquables, donc utiles — une barre ne l'aurait pas
              été, et afficher les deux aurait dit deux fois la même chose. */}
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {questions.map((_, i) => {
              const courante = i === idx;
              const faite = reponses[i] !== undefined;
              return (
                <button key={i} onClick={() => setIdx(i)}
                  aria-label={`Question ${i + 1}${faite ? ", répondue" : ""}`}
                  aria-current={courante ? "step" : undefined}
                  className={`flex min-h-11 items-center justify-center border font-mono text-xs tabular-nums transition-colors ${
                    courante
                      ? "border-2 font-bold"
                      : faite
                        ? "border-border bg-muted"
                        : "border-dashed border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                  style={courante ? { borderColor: accent } : undefined}>
                  {faite && !courante ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </button>
              );
            })}
          </div>
        </aside>

        <div>
          <p className="font-mono text-sm tabular-nums">
            Question {idx + 1} sur {questions.length}
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {q.domaine}
          </p>
          <p className="mt-3 text-2xl sm:text-3xl font-semibold leading-snug tracking-tight">{q.q}</p>

          <div className="mt-8 flex flex-col gap-2">
            {q.opts.map((o, i) => {
              const prise = choisie === i;
              return (
                // La clé inclut l'index de question : sans elle, React réutilise les nœuds
                // d'une question à l'autre et les options restent figées sur la première.
                <button key={`${idx}-${i}`}
                  onClick={() => setReponses({ ...reponses, [idx]: i })}
                  aria-pressed={prise}
                  className={`flex min-h-14 items-start gap-4 border px-4 py-3 text-left text-sm leading-6 transition-colors ${
                    prise ? "border-foreground bg-muted font-medium" : "border-border hover:bg-muted/50"
                  }`}>
                  <span className="flex w-6 h-6 shrink-0 items-center justify-center border font-mono text-xs"
                    style={prise ? { borderColor: accent, color: accent } : undefined}>
                    {["A", "B", "C", "D"][i]}
                  </span>
                  <span>{o}</span>
                  {prise && <Check className="ml-auto mt-0.5 w-4 h-4 shrink-0" style={{ color: accent }} />}
                </button>
              );
            })}
          </div>

          {erreur && <p className="mt-4 text-sm text-destructive">{erreur}</p>}

          <div className="mt-10 border-t border-border pt-5 flex items-center justify-between gap-3">
            <Button variant="outline" className="gap-1.5 min-h-11 rounded-none" disabled={idx === 0}
              onClick={() => setIdx(i => Math.max(0, i - 1))}>
              <ChevronLeft className="w-4 h-4" /> Précédente
            </Button>

            {idx < questions.length - 1 ? (
              <Button className="gap-1.5 min-h-11 rounded-none border-0 text-white" style={{ background: accent }}
                onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}>
                Suivante <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button className="gap-1.5 min-h-11 rounded-none border-0 text-white" style={{ background: accent }}
                disabled={envoi} onClick={envoyer}>
                {envoi ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Terminer et remettre
              </Button>
            )}
          </div>

          {restantes > 0 && idx === questions.length - 1 && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {restantes} question{restantes > 1 ? "s" : ""} sans réponse. Aucune pénalité :
              répondez au jugé plutôt que de laisser vide.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
