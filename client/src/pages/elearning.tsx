import { useState, useEffect, useRef } from "react";
import { Spotlight } from "@/components/motion";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import {
  GraduationCap, ChevronRight, ChevronLeft, CheckCircle2,
  Lock, BookOpen, ArrowRight, ClipboardCheck,
  Download, X, Clock, Target, Users, Award, Sprout, FileText, Check, LayoutDashboard,
  MapPin, Rocket, CalendarDays, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SocialShare } from "@/components/social-share";
import { isStudentLoggedIn, getStudent, studentFetch, downloadStudentFile } from "@/lib/student";
import {
  Section, CarteBenefice, CarteModule, CarteValeur, CarteSession, Etape, Chiffre,
  AvisAdmissionContinue, VERT_FONCE, VERT_FONCE_2, VERT_CLAIR,
} from "@/components/academy/landing-parts";
import {
  CHAPITRES, LIVRET_TITRE, LIVRET_SOUS_TITRE, LIVRET_AUTEUR, LIVRET_FONCTION, LIVRET_FICHIER,
} from "@shared/revision";
import { QUESTIONS_TOF } from "@shared/tof-test";
import { QUESTIONS_FCA } from "@shared/fca-test";
import { QUESTIONS_FCQ } from "@shared/fcq-test";
import { QUESTIONS_COOP } from "@shared/coop-test";
import { programById } from "@shared/programs";

/**
 * Banques de questions des parcours ayant leur porte propre.
 *
 * Le cursus MEAL n'y figure pas : son test vit dans QUESTIONS, plus bas, et son admission
 * sur les colonnes de `students` plutôt que dans academy_program_admissions.
 *
 * Un registre plutôt qu'un booléen. La page ne connaissait que deux parcours, distingués
 * par un `surTof` ; le troisième aurait demandé un second booléen, le quatrième un
 * troisième, et chaque ajout aurait touché une dizaine d'endroits. Ici, ouvrir un parcours
 * revient à ajouter une ligne.
 *
 * Hors du composant : ce tableau ne dépend d'aucun état et le reconstruire à chaque rendu
 * ne servirait à rien.
 */
const BANQUES_PARCOURS: Record<string, { domain: string; q: string; opts: string[] }[]> = {
  tof: QUESTIONS_TOF.map(x => ({ domain: x.domaine, q: x.q, opts: x.opts })),
  fca: QUESTIONS_FCA.map(x => ({ domain: x.domaine, q: x.q, opts: x.opts })),
  fcq: QUESTIONS_FCQ.map(x => ({ domain: x.domaine, q: x.q, opts: x.opts })),
  coop: QUESTIONS_COOP.map(x => ({ domain: x.domaine, q: x.q, opts: x.opts })),
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
// Le parcours réel (cours, progression, attestations) vit dans /academy/* : cette page
// couvre la présentation du programme et le test d'admission.
type View = "landing" | "test" | "test-result";

// ─── QUIZ DATA (30 questions) ─────────────────────────────────────────────────
const QUESTIONS = [
  { domain: "KoboCollect / XLSForm", q: "Dans un formulaire XLSForm, quelle colonne définit le type de question ?", opts: ["name", "type", "label", "hint"] },
  { domain: "KoboCollect / XLSForm", q: "Quel type de question XLSForm capture des coordonnées GPS ?", opts: ["text", "integer", "geopoint", "select_one"] },
  { domain: "KoboCollect / XLSForm", q: "L'onglet 'choices' dans un XLSForm sert à :", opts: ["Définir les types de questions", "Lister les options de réponse pour les questions à choix", "Configurer les contraintes", "Ajouter des médias"] },
  { domain: "KoboCollect / API", q: "Quelle méthode HTTP est utilisée pour soumettre des données via l'API KoboToolbox ?", opts: ["GET", "DELETE", "PUT", "POST"] },
  { domain: "KoboCollect / XLSForm", q: "Quelle expression de contrainte XLSForm vérifie qu'une valeur est supérieure à 0 ?", opts: ["value > 0", ". > 0", "${value} > 0", "check(. > 0)"] },
  { domain: "KoboCollect / Logique", q: "La colonne 'relevant' dans XLSForm permet de :", opts: ["Rendre une question obligatoire", "Afficher une question conditionnellement", "Valider la réponse", "Masquer l'identifiant"] },
  { domain: "KoboCollect / Déploiement", q: "Avant de collecter avec KoboCollect sur Android, quelle étape est nécessaire ?", opts: ["Installer PostgreSQL", "Configurer le serveur URL KoboToolbox dans les paramètres", "Activer le Bluetooth", "Créer un compte Gmail"] },
  { domain: "MEAL — Concepts", q: "L'acronyme MEAL signifie :", opts: ["Monitoring, Evaluation, Accountability, Learning", "Measure, Evaluate, Analyze, Link", "Monitor, Estimate, Audit, Log", "Manage, Evaluate, Account, Learn"] },
  { domain: "MEAL — Indicateurs", q: "Un indicateur SMART doit être :", opts: ["Simple, Mesurable, Applicable, Réaliste, Temporel", "Spécifique, Mesurable, Atteignable, Réaliste, Temporel", "Statistique, Modifiable, Analytique, Réel, Tabulé", "Systémique, Mesurable, Ajusté, Réel, Temporaire"] },
  { domain: "MEAL — Théorie du changement", q: "La théorie du changement décrit :", opts: ["Les budgets du projet", "La logique causale entre activités et impacts", "Le planning RH", "Les indicateurs financiers"] },
  { domain: "MEAL — Cadre logique", q: "Dans un cadre logique, les 'outputs' correspondent à :", opts: ["Les ressources mobilisées", "Les résultats directs des activités", "L'impact à long terme", "Les bénéficiaires visés"] },
  { domain: "MEAL — Redevabilité", q: "Le mécanisme de redevabilité vise principalement à :", opts: ["Auditer les finances", "Donner aux bénéficiaires un moyen de donner un retour", "Contrôler les équipes terrain", "Produire les rapports bailleurs"] },
  { domain: "MEAL — Évaluation", q: "Une évaluation à mi-parcours est conduite :", opts: ["Avant le démarrage du projet", "Pendant la mise en œuvre pour ajuster le projet", "Après la clôture", "Annuellement sans lien avec la phase"] },
  { domain: "Python — pandas", q: "Quelle commande pandas permet de lire un fichier CSV ?", opts: ["pd.open_csv()", "pd.read_csv()", "pd.load_file()", "pd.import_csv()"] },
  { domain: "Python — pandas", q: "Pour afficher les 5 premières lignes d'un DataFrame df, on utilise :", opts: ["df.show(5)", "df.top(5)", "df.head()", "df.view(5)"] },
  { domain: "Python — pandas", q: "Comment calculer la moyenne d'une colonne 'age' dans un DataFrame df ?", opts: ["df['age'].avg()", "df.mean('age')", "df['age'].mean()", "average(df, 'age')"] },
  { domain: "Python — pandas", q: "Quelle méthode permet de supprimer les valeurs manquantes (NaN) d'un DataFrame ?", opts: ["df.remove_na()", "df.dropna()", "df.fillna(None)", "df.clean()"] },
  { domain: "Python — visualisation", q: "Quelle bibliothèque Python est couramment utilisée pour créer des graphiques ?", opts: ["numpy", "scipy", "matplotlib", "requests"] },
  { domain: "Python — pandas", q: "Pour filtrer un DataFrame où 'statut' vaut 'actif', on écrit :", opts: ["df.filter(statut='actif')", "df[df['statut'] == 'actif']", "df.where('statut', 'actif')", "df.select(statut='actif')"] },
  { domain: "Python — MEAL", q: "Dans un contexte MEAL, que permet pandas.groupby() ?", opts: ["Créer une boucle", "Agréger des données par catégorie (ex: district, sexe)", "Visualiser des cartes", "Envoyer des emails"] },
  { domain: "QGIS — Bases", q: "QGIS est :", opts: ["Un logiciel payant de statistiques", "Un SIG open-source de cartographie", "Une base de données spatiale", "Un langage de programmation"] },
  { domain: "QGIS — Données", q: "Quel format vectoriel remplace le Shapefile dans QGIS ?", opts: [".geotiff", ".kml", ".gpkg (GeoPackage)", ".csv"] },
  { domain: "QGIS — Analyse spatiale", q: "La jointure spatiale permet de :", opts: ["Fusionner deux tableaux par un ID", "Associer des attributs selon la position des entités", "Découper une couche", "Changer le système de projection"] },
  { domain: "QGIS — Projections", q: "Le système WGS84 (EPSG:4326) utilise des coordonnées en :", opts: ["Mètres", "Kilomètres", "Degrés (latitude/longitude)", "Pieds"] },
  { domain: "QGIS — PyQGIS", q: "En PyQGIS, quelle ligne permet de charger une couche vectorielle ?", opts: ["layer = openFile('path.gpkg')", "layer = QgsVectorLayer('path.gpkg', 'nom', 'ogr')", "layer = QGIS.load('path.gpkg')", "layer = addLayer('path.gpkg')"] },
  { domain: "QGIS — Atlas", q: "La fonctionnalité Atlas dans QGIS permet de :", opts: ["Télécharger des données OSM", "Générer automatiquement des cartes en série par entité", "Analyser des rasters", "Éditer des attributs en masse"] },
  { domain: "QGIS — Données terrain", q: "Pour importer des données GPS KoboCollect dans QGIS, on peut utiliser :", opts: ["Un fichier XLSForm directement", "Un CSV avec colonnes latitude/longitude ou un GeoJSON", "Un fichier .docx", "Une connexion Bluetooth"] },
  { domain: "MEAL — Terrain", q: "Le MUAC < 115 mm chez un enfant de 6-59 mois indique :", opts: ["Une obésité", "Une malnutrition aiguë sévère (MAS)", "Un développement normal", "Une malnutrition chronique"] },
  { domain: "MEAL — Échantillonnage", q: "L'échantillonnage LQAS est utilisé pour :", opts: ["Analyser des données financières", "Évaluer rapidement si un programme atteint un seuil de couverture", "Former les équipes terrain", "Cartographier les bénéficiaires"] },
  { domain: "MEAL — Restitution", q: "Un 'learning review' dans le MEAL a pour objectif de :", opts: ["Publier un rapport final", "Capitaliser sur les enseignements pour améliorer la pratique", "Contrôler les agents terrain", "Auditer le budget"] },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ELearning() {
  const [view, setView] = useState<View>("landing");
  const [testStatus, setTestStatus] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [, navigate] = useLocation();
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);
  const [needVerification, setNeedVerification] = useState(false);
  const [nextLesson, setNextLesson] = useState<any>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [pageData, setPageData] = useState<any>(null);
  const [pageEtat, setPageEtat] = useState<"chargement" | "ok" | "erreur">("chargement");
  const [compact, setCompact] = useState(false);
  const [moduleDetail, setModuleDetail] = useState<any>(null);
  // Trois parcours, trois tests, un seul moteur. Dupliquer l'écran de QCM aurait fait
  // autant de corrections d'affichage à porter à chaque fois — et l'une d'elles aurait fini
  // par être oubliée. Le parcours en cours d'examen commande la banque de questions et
  // l'adresse d'envoi ; tout le reste est commun.
  const [parcoursTest, setParcoursTest] = useState<string>("meal");
  const [statutsParcours, setStatutsParcours] = useState<Record<string, any>>({});

  const TOF = programById("tof");
  const surMeal = parcoursTest === "meal";
  // Toutes les banques exposent la même forme au moteur : domaine, énoncé, options.
  const BANQUE: { domain: string; q: string; opts: string[] }[] =
    surMeal ? QUESTIONS : (BANQUES_PARCOURS[parcoursTest] ?? []);
  // Le seuil du MEAL reste écrit ici : il vit dans l'API historique, pas dans le registre.
  const SEUIL = surMeal ? 21 : programById(parcoursTest).admission.seuil;
  const statutCourant = surMeal ? testStatus : statutsParcours[parcoursTest];

  const passed = statutCourant?.passed === true || (score !== null && score >= SEUIL);
  const answeredCount = Object.keys(answers).length;

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); }, [view]);

  // Les deux admissions sont indépendantes : on lit les deux statuts, sans quoi la page ne
  // saurait pas dire à un étudiant admis au MEAL qu'il lui reste à passer le second test.
  function rafraichirStatuts() {
    if (!isStudentLoggedIn()) return;
    studentFetch("/api/academy/test-status").then(r => r.json()).then(setTestStatus).catch(() => {});
    // Le MEAL garde sa route historique ; les autres parcours passent par la route générique
    // /api/academy/programs/:id/*. Les statuts sont lus tous ensemble : sans quoi la page ne
    // saurait pas dire à un étudiant admis au MEAL quels tests il lui reste à passer.
    for (const id of Object.keys(BANQUES_PARCOURS)) {
      studentFetch(`/api/academy/programs/${id}/test-status`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d) setStatutsParcours(s => ({ ...s, [id]: d })); })
        .catch(() => {});
    }
  }
  useEffect(() => { rafraichirStatuts(); }, []);

  // Contenu de la page : modules, chiffres et calendrier viennent tous du serveur, pour que
  // la vitrine ne puisse pas se désynchroniser du catalogue réel.
  // Trois états distincts, et non « données ou pas de données » : un chargement lent et un
  // serveur en panne demandent deux affichages différents. Confondre les deux laisse le
  // visiteur devant des squelettes qui ne se rempliront jamais.
  useEffect(() => {
    fetch("/api/academy/landing")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => { setPageData(d); setPageEtat("ok"); })
      .catch(() => setPageEtat("erreur"));
  }, []);

  // La navigation se compacte au défilement. passive: true — l'écouteur n'annule jamais
  // l'évènement, et le préciser évite au navigateur d'attendre pour faire défiler.
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── SUBMIT TEST (étudiant authentifié — score enregistré sur son compte)
  async function submitTest() {
    // Le score est calculé et vérifié CÔTÉ SERVEUR uniquement (le client n'a pas le corrigé) : on envoie
    // les réponses choisies et on attend le score officiel avant d'afficher un résultat.
    const answerArray = BANQUE.map((_, i) => (answers[i] ?? -1));
    setSubmitError(false);
    setSubmitErrorMsg(null);
    setSubmitting(true);
    setView("test-result");
    try {
      const res = await studentFetch(surMeal
        ? "/api/academy/submit-test"
        : `/api/academy/programs/${parcoursTest}/submit-test`, {
        method: "POST",
        body: JSON.stringify({ answers: answerArray }),
      });
      const data = await res.json();
      setSubmitResult(data);
      if (typeof data.score === "number") setScore(data.score);
      else {
        // Le serveur explique pourquoi il refuse (email non vérifié, déjà admis, délai d'une
        // semaine non écoulé) : afficher ce message plutôt qu'une erreur générique.
        setSubmitError(true);
        setSubmitErrorMsg(data?.message || null);
        setNeedVerification(!!data?.needVerification);
      }
      rafraichirStatuts();
      // Admis : on récupère tout de suite la leçon débloquée pour pouvoir enchaîner d'un clic,
      // au lieu de renvoyer l'étudiant chercher son point d'entrée dans le tableau de bord.
      if (data?.passed) loadNextLesson();
    } catch (e) {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function loadNextLesson() {
    try {
      const sched = await studentFetch("/api/academy/lesson-schedule").then(r => r.json());
      const list = Array.isArray(sched) ? sched : [];
      const avail = list.find((s: any) => s.status === "available") || list[0];
      if (avail) setNextLesson(avail);
    } catch { /* le tableau de bord reste la porte d'entrée de repli */ }
  }

  // ── Démarrage d'un test, pour l'un ou l'autre parcours ──
  //
  // Chaque parcours a sa porte. Une seule fonction les ouvre, pour que les vérifications
  // — compte requis, admission déjà obtenue, délai de reprise — ne s'écrivent qu'une fois.
  function demarrerTest(parcours: string) {
    if (!isStudentLoggedIn()) {
      navigate("/academy/register");
      return;
    }
    const statut = parcours === "meal" ? testStatus : statutsParcours[parcours];
    if (statut?.passed) { navigate("/academy/dashboard"); return; }

    // Changer de banque remet le questionnaire à zéro. Sans cela, les réponses données au
    // test précédent partiraient comme réponses du nouveau — et seraient corrigées.
    setParcoursTest(parcours);
    setQIdx(0);
    setAnswers({});
    setScore(null);
    setSubmitResult(null);
    setSubmitError(false);
    setSubmitErrorMsg(null);

    if (statut && !statut.canRetry && statut.nextTestAllowed) {
      setView("test-result"); // affiche le message de verrou
      return;
    }
    setView("test");
  }

  function startTest() { demarrerTest("meal"); }

  // ─────────────────── RENDER HELPERS ──────────────────────────────────────

  // Le rail ne liste que les sections de CETTE page. Accueil, Ressources et « à propos »
  // vivent dans l'en-tête du site, juste au-dessus : les répéter ici brouillerait la
  // frontière entre naviguer dans le site et naviguer dans la page.
  const ANCRES = [
    { label: "Modules", id: "modules" },
    { label: "Formateurs", id: "formateurs" },
    { label: "Pourquoi nous", id: "pourquoi" },
    { label: "Sessions", id: "sessions" },
    { label: "Parcours", id: "parcours" },
    { label: "Ressources", id: "ressources" },
  ];

  function versSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /**
   * Rail des sections de la page.
   *
   * Ce n'est délibérément PAS un en-tête : ni marque, ni menu hamburger, ni bouton de
   * connexion. L'en-tête du site, juste au-dessus, porte déjà tout cela, et empiler les deux
   * donnait deux marques et deux hamburgers l'un sur l'autre. Il ne reste ici que ce que
   * l'en-tête du site ne peut pas offrir : circuler entre les sections d'une page longue, et
   * l'inscription toujours à portée de pouce.
   *
   * Sur petit écran les ancres défilent horizontalement plutôt que de se replier dans un
   * menu — un rail qui glisse se comprend d'un coup d'œil, là où un second hamburger sous
   * celui du site sème le doute sur lequel des deux fait quoi.
   */
  function renderNav() {
    return (
      <div className={`sticky top-[60px] z-30 -mt-6 transition-shadow ${compact ? "shadow-sm" : ""}`}>
        <div className="bg-background/85 backdrop-blur-md border-y border-border/50">
          <div className="max-w-6xl mx-auto pl-5 pr-3 sm:px-6 h-12 flex items-center gap-3">
            <nav aria-label="Sections de la page"
              className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {ANCRES.map(a => (
                <button key={a.label} onClick={() => versSection(a.id)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  {a.label}
                </button>
              ))}
            </nav>

            <Button size="sm" onClick={startTest} className="shrink-0 gap-1.5 h-8 text-[13px]">
              {isStudentLoggedIn() ? "Passer le test" : "S'inscrire"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /** Squelette d'une carte de module — occupe la place réelle pour éviter le saut de page. */
  function SqueletteModule() {
    return (
      <div className="bg-card rounded-3xl border border-border/60 overflow-hidden animate-pulse">
        <div className="h-1.5 bg-muted" />
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-muted" />
          <div className="h-5 w-1/2 rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="h-16 rounded-2xl bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  function renderModules() {
    if (pageEtat === "chargement") {
      return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map(i => <SqueletteModule key={i} />)}
        </div>
      );
    }
    // Panne du catalogue : on ne remplace pas par une liste écrite en dur, qui mentirait le jour
    // où le programme change. On le dit, et on garde l'inscription accessible.
    if (pageEtat === "erreur") {
      return (
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center">
          <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Le catalogue n'a pas pu être chargé</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
            Le programme reste inchangé — KoboCollect, QGIS et Python. Rechargez la page, ou
            inscrivez-vous dès maintenant : rien ne dépend de cet affichage.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
            Recharger
          </Button>
        </div>
      );
    }
    const modules = pageData?.modules ?? [];
    if (modules.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center">
          <BookOpen className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Les modules arrivent</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            Le programme est en cours de publication. Créez votre compte pour être prévenu(e) à l'ouverture.
          </p>
        </div>
      );
    }
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((m: any) => (
          <CarteModule key={m.code} module={m} onDetail={() => setModuleDetail(m)} />
        ))}
      </div>
    );
  }

  function renderDetailModule() {
    if (!moduleDetail) return null;
    const m = moduleDetail;
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6"
        role="dialog" aria-modal="true" aria-label={`Module ${m.outil}`}>
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setModuleDetail(null)} />
        <div className="relative bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-border/60 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="h-1.5 rounded-t-3xl" style={{ background: m.accent }} />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xl font-bold">{m.outil}</h3>
                <p className="text-sm text-muted-foreground">{m.objectif}</p>
              </div>
              <button onClick={() => setModuleDetail(null)} aria-label="Fermer"
                className="w-9 h-9 rounded-xl hover:bg-muted grid place-items-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-muted/50">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Projet fil rouge</p>
              <p className="font-medium mt-1">{m.titreProjet}</p>
              {m.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{m.description}</p>}
            </div>

            <p className="text-sm font-semibold mt-5 mb-2">Ce que vous saurez faire</p>
            <ul className="space-y-2">
              {m.competences.map((c: string) => (
                <li key={c} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: m.accent }} />
                  <span className="text-muted-foreground">{c}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-5 pt-4 border-t border-border/50 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{m.lecons}</strong> leçons</span>
              {m.exercices > 0 && <span><strong className="text-foreground">{m.exercices}</strong> exercices notés</span>}
              <span className="font-mono">{m.code}</span>
            </div>

            <Button className="w-full mt-5 gap-2" onClick={() => { setModuleDetail(null); startTest(); }}>
              Rejoindre la formation <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Visuel du héros — les trois outils comme objets, dessinés et non photographiés.
   *
   * Un mobile pour KoboCollect, un écran d'analyse pour Python, une carte pour QGIS : la
   * composition dit la chaîne « collecter → analyser → cartographier » avant qu'on ait lu
   * le sous-titre. Tout est en SVG et en balisage, donc rien à télécharger, rien qui décale
   * la mise en page, et le rendu reste net sur un écran dense.
   */
  function VisuelHeros() {
    return (
      <div className="relative select-none" aria-hidden>
        <div className="absolute inset-0 rounded-[2rem] blur-2xl opacity-40"
          style={{ background: `radial-gradient(60% 60% at 60% 40%, ${VERT_CLAIR}, transparent 70%)` }} />

        <div className="relative flex items-end justify-center gap-3 sm:gap-4">
          {/* KoboCollect — collecte mobile */}
          <div className="w-[86px] sm:w-[104px] shrink-0 rounded-[1.25rem] bg-white/95 shadow-2xl p-2 rotate-[-4deg]">
            <div className="rounded-[0.9rem] bg-[#0d9488] p-2.5 text-white">
              <p className="text-[8px] font-semibold opacity-80">KoboCollect</p>
              <div className="mt-2 space-y-1.5">
                {[100, 70, 85].map((w, i) => (
                  <div key={i} className="h-1.5 rounded-full bg-white/40" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="mt-2.5 flex gap-1">
                <span className="w-3 h-3 rounded-full border-2 border-white/70" />
                <span className="w-3 h-3 rounded-full bg-white" />
              </div>
              <div className="mt-2.5 h-4 rounded-md bg-white/90" />
            </div>
          </div>

          {/* Python — analyse */}
          <div className="w-[150px] sm:w-[190px] shrink-0 rounded-[1.25rem] bg-white/95 shadow-2xl p-2.5">
            <div className="rounded-[0.9rem] bg-slate-900 p-3">
              <div className="flex gap-1 mb-2.5">
                {["#f87171", "#fbbf24", "#4ade80"].map(c => (
                  <span key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="flex items-end gap-1.5 h-14">
                {[38, 62, 45, 80, 55, 92].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm"
                    style={{ height: `${h}%`, background: i % 2 ? "#7c3aed" : VERT_CLAIR }} />
                ))}
              </div>
              <div className="mt-2 space-y-1">
                <div className="h-1 w-4/5 rounded-full bg-white/25" />
                <div className="h-1 w-3/5 rounded-full bg-white/15" />
              </div>
            </div>
          </div>

          {/* QGIS — carte */}
          <div className="w-[86px] sm:w-[104px] shrink-0 rounded-[1.25rem] bg-white/95 shadow-2xl p-2 rotate-[4deg]">
            <div className="rounded-[0.9rem] bg-[#2563eb]/10 p-2 relative overflow-hidden aspect-square">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M12 20 L46 10 L70 24 L88 16 L84 76 L58 88 L30 76 L14 84 Z"
                  fill="#2563eb" fillOpacity="0.18" stroke="#2563eb" strokeWidth="2.5" />
                <path d="M46 10 L44 74" stroke="#2563eb" strokeWidth="1.5" strokeOpacity="0.4" />
                <path d="M70 24 L58 88" stroke="#2563eb" strokeWidth="1.5" strokeOpacity="0.4" />
                <circle cx="36" cy="42" r="5" fill="#16a34a" />
                <circle cx="64" cy="58" r="5" fill="#16a34a" />
                <circle cx="52" cy="28" r="4" fill="#f59e0b" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderLanding() {
    const c = pageData?.chiffres;
    const cal = pageData?.calendrier;
    const sessions: any[] = cal?.sessions ?? [];
    const courante = cal?.courante ?? null;
    const prochaine = cal?.prochaine ?? null;
    const seuil = pageData?.seuilAdmission ?? 21;
    const questions = pageData?.questionsTest ?? QUESTIONS.length;
    const mois = pageData?.moisAcces ?? 3;   // ADMISSION_MONTHS côté serveur
    const seuilEx = pageData?.seuilExercices ?? 70;
    const connecte = isStudentLoggedIn();
    // Une seule vérité pour le mois de démarrage annoncé : la session ouverte s'il y en a une,
    // sinon la prochaine. Le calendrier, le bandeau d'avis et l'appel final la partagent.
    const sessionVisee = courante ?? prochaine;
    const moisDemarrage = sessionVisee?.moisDemarrage?.replace(/ \d{4}$/, "") ?? null;

    return (
      <div>
        <SEO title="LouisFarm Learning — Formation MEAL gratuite"
          description="Formation gratuite et par projets aux outils du MEAL : KoboCollect, QGIS et Python. Inscription ouverte en permanence, admission sur test." />

        {renderNav()}
        {renderDetailModule()}

        {/* ── Héros ──
            Sobre, et non plus en aplat dégradé vert. La page s'adresse à des agents de
            crédit et des chargés de suivi-évaluation qui jugent un dispositif, pas à des
            visiteurs à séduire : ce qui convainc est la règle du jeu, pas la promesse. */}
        <section className="max-w-6xl mx-auto px-5 sm:px-6 pt-24 pb-12 sm:pt-28">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-7 min-w-0">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="w-7 h-px bg-accent" />
                <span className="text-[11px] tracking-[0.14em] uppercase text-primary font-bold">
                  LouisFarm Learning
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[46px] font-semibold leading-[1.16] tracking-tight mb-5 text-pretty">
                Une école, pas une bibliothèque de vidéos
              </h1>
              <p className="text-base lg:text-[17px] leading-relaxed text-foreground/80 mb-7 max-w-2xl text-pretty">
                L'entrée se mérite par un test, le rythme est hebdomadaire, chaque leçon est corrigée
                sur les réponses produites et trois travaux collectifs jalonnent le parcours. Le
                certificat atteste d'un relevé de notes, pas d'une inscription.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={startTest}
                  className="inline-flex items-center px-6 py-3.5 text-[15px] font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Passer le test d'admission
                </button>
                <a href="/academy/verify-certificate"
                  className="inline-flex items-center px-6 py-3.5 text-[15px] font-semibold border border-border rounded-lg hover:bg-muted transition-colors">
                  Vérifier un certificat
                </a>
              </div>
            </div>

            {/* Le dispositif en chiffres : les règles auxquelles l'étudiant s'engage. */}
            <div className="lg:col-span-5 min-w-0">
              <div className="border border-border rounded-lg bg-card p-6">
                <div className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-bold mb-4">
                  Le dispositif en bref
                </div>
                <div className="flex flex-col gap-3.5">
                  {[
                    [`${mois} mois`, "fenêtre d'admission pour terminer un parcours"],
                    ["1 sem.", "par leçon — le rythme est conseillé, jamais un couperet"],
                    ["3 GW", "travaux de groupe, équipe tirée au sort à chaque fois"],
                    [`${Math.round((seuil / questions) * 100)} %`, "seuil d'admission, corrigé côté serveur"],
                  ].map(([valeur, texte]) => (
                    <div key={texte} className="flex gap-3 items-baseline">
                      <span className="font-serif text-xl font-semibold text-primary w-[74px] shrink-0">{valeur}</span>
                      <span className="text-[13px] text-foreground/80 leading-snug">{texte}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Les parcours ──
            Chaque parcours a sa banque de questions et sa route d'admission, et toutes les
            portes s'ouvrent. FCA-01 est resté un temps sans bouton, sa banque n'étant pas
            écrite — proposer une porte qui ne s'ouvre pas est pire que ne rien proposer.
            La grille passe à trois colonnes avec le cinquième parcours : 3 + 2 se lit mieux
            que 4 + 1, et laisse aux cartes la largeur qu'exige leur tableau. */}
        <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-14">
          <div className="flex items-baseline gap-4 mb-6">
            <h2 className="font-serif text-2xl sm:text-[28px] font-semibold tracking-tight">
              Cinq parcours, cinq portes d'entrée
            </h2>
            <span className="flex-1 h-px bg-border" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                code: "MEAL-01 · 02 · 03", teinte: "#0D9488", titre: "Cursus MEAL",
                texte: "Concevoir une collecte, cartographier les résultats, automatiser le reporting. Trois projets terrain enchaînés.",
                lignes: [["Leçons", "20"], ["Rythme", "2 / semaine"], ["Test d'entrée", "30 questions · 21"], ["Prérequis", "Aucun code"]],
                titreDelivre: "Certificat Super-Expert MEAL", fond: "bg-primary/5", encre: "text-primary",
                action: { libelle: "Passer le test", onClick: () => demarrerTest("meal") },
              },
              {
                code: "FCA-01", teinte: "#B45309", titre: "Finance climatique agricole",
                texte: "Calculer une perte attendue, mesurer une concentration, auditer un produit indiciel, écrire la note qui débloque un financement.",
                lignes: [["Leçons", "6"], ["Rythme", "1 / semaine"], ["Test d'entrée", "20 questions · 14"], ["Public", "Agents de crédit"]],
                titreDelivre: "Certificat d'Analyste du Risque Climatique Agricole",
                fond: "bg-amber-50 dark:bg-amber-950/30", encre: "text-amber-800 dark:text-amber-300",
                action: { libelle: "Passer le test", onClick: () => demarrerTest("fca") },
              },
              {
                code: "FCQ-01", teinte: "#7C2D12", titre: "Finance climatique quantitative",
                texte: "Le même portefeuille que le parcours analyste, prêt par prêt : simuler une distribution de pertes, chiffrer l'effet de la corrélation, auditer le risque de base d'un produit indiciel.",
                lignes: [["Leçons", "7"], ["Rythme", "1 / semaine"], ["Test d'entrée", "20 questions · 14"], ["Prérequis", "Python"]],
                titreDelivre: "Certificat de Quantitativiste du Risque Climatique Agricole",
                fond: "bg-amber-100/70 dark:bg-amber-950/50", encre: "text-amber-900 dark:text-amber-200",
                action: { libelle: "Passer le test", onClick: () => demarrerTest("fcq") },
              },
              {
                code: "TOF-FIN-01", teinte: "#7C3AED", titre: "Formation de formateurs",
                texte: "Concevoir et animer des sessions de gestion financière adaptées aux réalités paysannes, avec les outils du terrain.",
                lignes: [["Leçons", "12"], ["Rythme", "1 / semaine"], ["Test d'entrée", "15 questions · 11"], ["Public", "Animateurs ruraux"]],
                titreDelivre: "Attestation de fin de parcours",
                fond: "bg-violet-50 dark:bg-violet-950/30", encre: "text-violet-800 dark:text-violet-300",
                action: { libelle: "Passer le test", onClick: () => demarrerTest("tof") },
              },
              {
                code: "COOP-01", teinte: "#1E3A8A", titre: "Coopératives et organisation des acteurs",
                texte: "Passer d'un groupement de fait à une organisation solide et reconnue : choisir la forme juridique, rédiger des statuts conformes, immatriculer, affecter les excédents, fédérer — puis organiser les acteurs de la filière autour d'elle.",
                // Le prix est annoncé ICI, avant l'inscription, et non découvert à la
                // semaine huit. Un tarif révélé à la fin se lit comme un piège, et un seul
                // message — « j'ai fait huit semaines et à la fin ils réclament 10 000 » —
                // coûte plus cher que dix inscriptions. Annoncé au premier écran, le même
                // fait se lit comme de la clarté. Celui que la somme rebute part maintenant,
                // et il ne coûte rien.
                lignes: [["Leçons", "8"], ["Rythme", "1 / semaine"], ["Test d'entrée", "20 questions · 14"],
                         ["Formation", "Gratuite"], ["Attestation", "10 000 F CFA"]],
                titreDelivre: "Certificat de Spécialiste en Organisation des Acteurs et Structuration des Filières",
                fond: "bg-blue-50 dark:bg-blue-950/30", encre: "text-blue-900 dark:text-blue-300",
                action: { libelle: "Passer le test", onClick: () => demarrerTest("coop") },
              },
            ].map(p => (
              <Spotlight key={p.code} className="lift border border-border rounded-lg bg-card overflow-hidden flex flex-col">
                <div className="h-1" style={{ background: p.teinte }} />
                <div className="p-6 flex flex-col flex-1">
                  <div className="font-mono text-xs text-muted-foreground tracking-wide">{p.code}</div>
                  <h3 className="font-serif text-xl font-semibold mt-2 mb-2.5 leading-snug">{p.titre}</h3>
                  <p className="text-sm leading-relaxed text-foreground/80 mb-4">{p.texte}</p>
                  <table className="w-full text-[13px] mb-4">
                    <tbody>
                      {p.lignes.map(([cle, val]) => (
                        <tr key={cle} className="border-t border-muted">
                          <td className="py-2 text-muted-foreground">{cle}</td>
                          <td className="py-2 text-right font-semibold">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className={`rounded-md px-3.5 py-3 text-xs leading-snug font-semibold ${p.fond} ${p.encre}`}>
                    {p.titreDelivre}
                  </div>
                  <div className="mt-4 pt-1">
                    {p.action ? (
                      <button onClick={p.action.onClick}
                        className="w-full py-2.5 text-[13px] font-semibold border border-border rounded-lg hover:bg-muted transition-colors">
                        {p.action.libelle}
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2.5">
                        Test d'admission en préparation
                      </p>
                    )}
                  </div>
                </div>
              </Spotlight>
            ))}
          </div>
        </section>

        {/* ── Comment on est évalué ──
            La question que pose tout employeur devant une attestation en ligne. Y répondre
            en quatre points est ce qui sépare un certificat d'un badge. */}
        <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-14">
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-muted/40">
              <h2 className="font-serif text-xl sm:text-[22px] font-semibold">Comment un étudiant est évalué</h2>
              <p className="text-[13px] text-muted-foreground mt-1.5">
                Chaque note figure sur le relevé, vérifiable par un tiers avec le numéro de certificat.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-border">
              {[
                ["1 · Admission", `Test corrigé côté serveur — la clé de réponses ne quitte jamais le serveur. Échec : une nouvelle tentative après sept jours.`],
                ["2 · Leçons", `Exercices « faire faire », corrigés à la réponse produite, ${seuilEx} % pour valider. Une leçon ne se valide pas en cliquant.`],
                ["3 · Travaux de groupe", "Trois rendus collectifs notés sur 100 par grille, plus l'évaluation des coéquipiers sur quatre critères."],
                ["4 · Certificat", "Numéro unique et page de vérification publique. Un recruteur contrôle sans passer par vous."],
              ].map(([titre, texte]) => (
                <div key={titre} className="p-6">
                  <div className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground font-bold mb-2.5">{titre}</div>
                  <p className="text-[13px] leading-relaxed text-foreground/80">{texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bandeau de bénéfices immédiats ── */}
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 -mt-8">
          <div className="bg-card rounded-3xl border border-border/60 shadow-lg p-2 sm:p-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
              <CarteBenefice icone={Target} titre="Formation 100 % pratique"
                texte="On apprend en faisant, sur des données réelles." />
              <CarteBenefice icone={MapPin} titre="Projets réels"
                texte="Trois projets de terrain menés du début à la fin." />
              <CarteBenefice icone={Award} titre="Attestation incluse"
                texte="Vérifiable en ligne par un employeur, et gratuite." />
              <CarteBenefice icone={Users} titre="Accompagnement"
                texte="Des séances en visio et un canal d'entraide." />
            </div>
          </div>
        </div>

        {/* ── Modules ── */}
        <Section id="modules" titre="Nos modules de formation"
          sousTitre="Chaque module se termine par un livrable que vous pouvez montrer : un formulaire déployé, une carte, un rapport automatisé.">
          {renderModules()}
        </Section>

        {/* ── Pourquoi nous ── */}
        <Section id="pourquoi" vert titre="Pourquoi choisir LouisFarm Learning ?"
          sousTitre="Elle est née d'un constat de terrain : les outils s'apprennent en les utilisant sur des données qui comptent.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <CarteValeur icone={Target} titre="Compétences recherchées"
              texte="KoboCollect, QGIS et Python figurent dans la plupart des offres MEAL." />
            <CarteValeur icone={ClipboardCheck} titre="Apprentissage par la pratique"
              texte={`Les exercices sont notés : il faut ${seuilEx} % pour valider une leçon.`} />
            <CarteValeur icone={Clock} titre="Flexibilité"
              texte={`${mois} mois d'accès, à votre rythme, sans horaire imposé.`} />
            <CarteValeur icone={Rocket} titre="Ouverture de carrières"
              texte="Vos livrables constituent un portfolio présentable en entretien." />
          </div>
        </Section>

        {/* ── Calendrier des sessions ── */}
        <Section id="sessions">
          <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-8">
            <div className="grid lg:grid-cols-[minmax(0,17rem)_1fr] gap-8 lg:gap-10 items-start">
              <div>
                <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
                  <CalendarDays className="w-6 h-6" />
                </span>
                <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                  6 périodes d'inscription par module
                </h2>
                <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
                  Une nouvelle promotion démarre tous les deux mois
                  {moisDemarrage ? <> — la prochaine en <span className="capitalize">{moisDemarrage}</span></> : null}.
                  Vous, vous n'attendez pas : l'inscription est ouverte en permanence.
                </p>
                <Button className="mt-5 gap-2" onClick={startTest}>
                  {connecte ? "Passer le test" : "Rejoindre la formation"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <p className="flex items-center gap-2 text-sm font-semibold mb-4">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Calendrier des inscriptions
                </p>

                {pageEtat === "chargement" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 animate-pulse" aria-busy="true">
                    {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-44 rounded-2xl bg-muted" />)}
                  </div>
                ) : sessions.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                      {sessions.map((s, i) => (
                        <CarteSession key={s.id} session={s} rang={i + 1}
                          prochaine={!!prochaine && s.id === prochaine.id} />
                      ))}
                    </div>
                    <p className="flex items-start gap-2 mt-4 text-[11px] text-muted-foreground">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                      Chaque période d'inscription dure un mois ; la promotion démarre au début
                      du mois suivant.
                    </p>
                    <AvisAdmissionContinue prochaine={sessionVisee} />
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="font-medium">Le calendrier n'est pas disponible</p>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Sans conséquence : l'inscription est ouverte en permanence et vos leçons
                      s'ouvrent dès le test réussi.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Parcours apprenant ── */}
        <Section id="parcours" fond titre="Ce qui se passe après l'inscription"
          sousTitre="Cinq étapes, de la création du compte à l'attestation.">
          <div className="grid lg:grid-cols-2 gap-x-12">
            <div>
              <Etape n={1} titre="Créez votre compte"
                texte="Nom, e-mail, mot de passe. Vous confirmez ensuite votre adresse en un clic." />
              <Etape n={2} titre="Passez le test d'admission"
                texte={`${questions} questions sur le MEAL, KoboCollect, QGIS et Python. Il faut ${seuil} bonnes réponses. En cas d'échec, une nouvelle tentative est possible après une semaine.`} />
              <Etape n={3} titre="Vos premières leçons s'ouvrent"
                texte="Immédiatement, sans attendre une date. Le tableau de bord vous indique par où commencer." />
            </div>
            <div>
              <Etape n={4} titre="Vous progressez, vous êtes noté(e)"
                texte={`Chaque leçon se valide par ses exercices, à ${seuilEx} % minimum. La leçon suivante s'ouvre alors, et un e-mail vous le signale.`} />
              <Etape n={5} titre="Vous obtenez votre attestation"
                texte="Une attestation par module terminé, et un certificat final à l'issue des trois. Chacun porte un code de vérification." />
              <div className="flex gap-3.5">
                <div className="flex flex-col items-center shrink-0">
                  <span className="w-8 h-8 rounded-full grid place-items-center bg-primary/10 text-primary">
                    <Rocket className="w-4 h-4" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">Et ensuite</p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    Vous gardez l'accès à vos notebooks et à vos livrables : ils constituent un
                    portfolio que vous pouvez présenter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Second parcours : formation de formateurs ── */}
        {/*
            Volontairement à part, et non parmi les modules MEAL. C'est un autre métier, un
            autre public et un autre certificat : le présenter au même rang laissait croire
            qu'il comptait pour le cursus MEAL, ce qu'il n'a jamais fait. Sa porte d'entrée
            est son propre test, plus court, sur son propre contenu.
        */}
        <Section id="formateurs" fond>
          <div className="rounded-3xl border overflow-hidden"
            style={{ borderColor: `${TOF.accent}40` }}>
            <div className="px-6 sm:px-8 py-5 flex flex-wrap items-center gap-3"
              style={{ background: `${TOF.accent}14` }}>
              <span className="w-10 h-10 rounded-2xl grid place-items-center shrink-0"
                style={{ background: TOF.accent, color: "#fff" }}>
                <Users className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: TOF.accent }}>
                  Second parcours · indépendant du cursus MEAL
                </p>
                <h2 className="text-xl sm:text-2xl font-bold leading-tight mt-0.5">{TOF.title}</h2>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-card">
              <div className="grid lg:grid-cols-[1fr_minmax(0,19rem)] gap-8 lg:gap-12 items-start">
                <div>
                  <p className="text-base text-muted-foreground leading-relaxed">{TOF.subtitle}</p>
                  <p className="text-sm mt-3 leading-relaxed">{TOF.outcome}</p>

                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mt-6 mb-3">
                    Ce que vous apprenez à animer
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {["Budget familial", "Épargne communautaire", "Tontines",
                      "Crédit agricole", "Planification de campagne", "Conduite de session"].map(t => (
                      <li key={t} className="flex items-start gap-2 text-[13px]">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: TOF.accent }} />
                        <span className="text-muted-foreground">{t}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="flex items-start gap-2.5 mt-6 p-3.5 rounded-2xl bg-muted/50 text-[13px] text-muted-foreground leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TOF.accent }} />
                    <span>
                      Ce parcours est <strong className="text-foreground">totalement séparé du
                      cursus MEAL</strong> : son propre test d'admission, son propre certificat.
                      Rien n'oblige à suivre l'un pour accéder à l'autre.
                    </span>
                  </p>
                </div>

                {/* La carte d'admission propre au parcours */}
                <div className="rounded-2xl border border-border/60 p-5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Titre délivré
                  </p>
                  <p className="font-semibold text-sm leading-snug mt-1">{TOF.credential}</p>

                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2.5 text-[13px] text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <ClipboardCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TOF.accent }} />
                      Test d'admission : {TOF.admission.seuil} bonnes réponses sur {TOF.admission.nbQuestions}
                    </p>
                    <p className="flex items-start gap-2">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TOF.accent }} />
                      Une leçon par semaine, à votre rythme
                    </p>
                    <p className="flex items-start gap-2">
                      <Award className="w-4 h-4 shrink-0 mt-0.5" style={{ color: TOF.accent }} />
                      Gratuit, comme le reste de la plateforme
                    </p>
                  </div>

                  {/* L'état de l'admission à CE parcours, jamais celui du MEAL : un étudiant
                      admis au cursus MEAL n'est pas admis ici, et le lui laisser croire le
                      renverrait vers un tableau de bord sans ce cours. */}
                  {statutsParcours.tof?.passed ? (
                    <div className="mt-5">
                      <p className="flex items-center gap-2 text-[13px] font-medium"
                        style={{ color: TOF.accent }}>
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Vous êtes admis(e)
                      </p>
                      <Button className="w-full mt-3 gap-2" variant="outline"
                        onClick={() => navigate("/academy/dashboard")}>
                        <LayoutDashboard className="w-4 h-4" /> Ouvrir mon espace
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full mt-5 gap-2 border-0 text-white"
                      style={{ background: TOF.accent }}
                      onClick={() => demarrerTest("tof")}>
                      {isStudentLoggedIn() ? "Passer le test formateurs" : "S'inscrire à ce parcours"}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Ressources ── */}
        <Section id="ressources" titre="Ressources pour préparer le test"
          sousTitre="Beaucoup de candidats échouent sur des notions qu'ils connaissent, faute d'avoir revu le vocabulaire. Ce livret est là pour ça.">
          <div className="grid lg:grid-cols-[minmax(0,20rem)_1fr] gap-8 lg:gap-12 items-start">

            {/* La carte de téléchargement — l'objet principal de la section */}
            <div className="rounded-3xl border border-border/60 bg-card overflow-hidden">
              <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${VERT_FONCE} 0%, ${VERT_FONCE_2} 100%)` }}>
                <p className="text-[10px] font-bold tracking-wider" style={{ color: VERT_CLAIR }}>
                  LOUISFARM LEARNING
                </p>
                <p className="text-xl font-bold leading-tight mt-3">{LIVRET_TITRE}</p>
                <p className="text-[13px] text-white/70 mt-1.5 leading-snug">{LIVRET_SOUS_TITRE}</p>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> PDF · 10 pages
                  </span>
                  <span aria-hidden>·</span>
                  <span>Gratuit</span>
                  <span aria-hidden>·</span>
                  <span>Optionnel</span>
                </div>

                <p className="text-[13px] text-muted-foreground mt-4 leading-relaxed">
                  Rédigé par <span className="font-medium text-foreground">{LIVRET_AUTEUR}</span>,{" "}
                  {LIVRET_FONCTION.toLowerCase()}.
                </p>

                {/* Un lien, pas un bouton avec téléchargement piloté par script : le fichier
                    est servi en statique, et un lien simple fonctionne partout — y compris
                    dans les navigateurs intégrés des applications de messagerie. */}
                <a href={LIVRET_FICHIER} target="_blank" rel="noopener noreferrer"
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  <Download className="w-4 h-4" /> Télécharger le livret
                </a>

                <p className="text-[11px] text-muted-foreground mt-3 text-center leading-snug">
                  Vous n'y trouverez aucune question du test, ni ses réponses.
                </p>
              </div>
            </div>

            {/* Le sommaire, lu depuis la même source que le PDF */}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-4">
                Ce que couvre le livret
              </p>
              <ul className="space-y-2.5">
                {CHAPITRES.map(c => (
                  <li key={c.numero}
                    className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/60 bg-card">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">
                      {c.numero}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-tight">{c.titre}</p>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{c.objectif}</p>
                    </div>
                    {c.questionsAuTest > 0 && (
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground shrink-0 whitespace-nowrap">
                        {c.questionsAuTest} question{c.questionsAuTest > 1 ? "s" : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <p className="flex items-start gap-2.5 mt-4 p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-[13px] text-muted-foreground leading-relaxed">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Le livret se termine par <strong className="text-foreground">dix questions
                  d'entraînement</strong> — différentes de celles du test — avec un corrigé
                  commenté et un plan de révision sur cinq jours.
                </span>
              </p>
            </div>
          </div>
        </Section>

        {/* ── Appel final ── */}
        <section className="py-14 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <div className="rounded-3xl p-8 sm:p-12 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${VERT_FONCE} 0%, ${VERT_FONCE_2} 100%)` }}>
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                <span className="w-20 h-20 rounded-3xl grid place-items-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.1)" }} aria-hidden>
                  <GraduationCap className="w-10 h-10" style={{ color: VERT_CLAIR }} />
                </span>

                <div className="flex-1 text-center lg:text-left">
                  <h2 className="text-white text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                    Prêt(e) à développer vos compétences MEAL terrain ?
                  </h2>
                  <p className="text-white/70 mt-3 leading-relaxed max-w-2xl">
                    Créez votre compte, passez le test, et vos premières leçons s'ouvrent dans la
                    foulée. C'est gratuit, et ça le restera.
                  </p>
                </div>

                <div className="shrink-0 text-center">
                  <Button size="lg" className="gap-2 border-0 w-full sm:w-auto"
                    style={{ background: VERT_CLAIR, color: VERT_FONCE }} onClick={startTest}>
                    {connecte ? "Passer le test d'admission" : "S'inscrire maintenant"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-white/60 mt-3">
                    <Users className="w-3.5 h-3.5" />
                    {c?.admis > 0
                      ? <>{c.admis} {c.admis > 1 ? "apprenants ont" : "apprenant a"} déjà rejoint</>
                      : <>Inscription ouverte en permanence</>}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <SocialShare
                url="/elearning"
                title="Formation MEAL gratuite par projets (KoboCollect, QGIS, Python) — LouisFarm Learning"
                description="Apprends à construire des systèmes de Suivi-Évaluation pour l'humanitaire et le développement. Formation gratuite, par projets, certifiante."
              />
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderTest() {
    const q = BANQUE[qIdx];
    const chosen = answers[qIdx];
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Question {qIdx + 1} / {BANQUE.length}</span>
            <span className="text-sm text-muted-foreground">{answeredCount} réponses</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((qIdx + 1) / BANQUE.length) * 100}%` }} />
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {BANQUE.map((_, i) => (
              <button key={i} onClick={() => setQIdx(i)}
                className={`w-5 h-1.5 rounded-full transition-colors cursor-pointer ${answers[i] !== undefined ? "bg-primary" : i === qIdx ? "bg-primary/40" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Card
            translate="no" : le QCM ne doit jamais passer par un traducteur automatique.
            Deux raisons. D'abord les énoncés portent des termes techniques qui sont des
            noms de colonnes ou de fonctions — 'relevant', 'name', 'label', 'hint' — qu'une
            traduction rend faux : « la colonne 'pertinent' » ne désigne plus rien dans
            XLSForm. Ensuite Google Traduction remplace les nœuds de texte du DOM, ce que
            React ne voit pas : au changement de question, les options traduites de la
            question précédente restaient affichées, et l'étudiant répondait à côté. */}
        <div translate="no" className="notranslate bg-card rounded-3xl p-8 border border-border/50 shadow-sm mb-6">
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">{q.domain}</span>
          <p className="text-lg font-medium mt-5 mb-6 leading-relaxed">{q.q}</p>
          <div className="space-y-3">
            {q.opts.map((opt, i) => (
              <button key={`${qIdx}-${i}`} onClick={() => setAnswers(prev => ({ ...prev, [qIdx]: i }))}
                className={`w-full text-left px-5 py-3.5 rounded-2xl border text-sm transition-all duration-150 ${
                  chosen === i
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/40 hover:bg-muted/50 text-foreground"
                }`}>
                <span className="font-mono text-xs text-muted-foreground mr-3">{String.fromCharCode(65+i)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={qIdx === 0} onClick={() => setQIdx(q => q - 1)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </Button>
          {qIdx < BANQUE.length - 1 ? (
            <Button onClick={() => setQIdx(q => q + 1)} className="gap-2">
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submitTest} className="gap-2 bg-primary">
              <CheckCircle2 className="w-4 h-4" /> Soumettre le test
            </Button>
          )}
        </div>
      </div>
    );
  }

  function renderTestResult() {
    if (submitting) {
      return (
        <div className="max-w-md mx-auto text-center py-32 px-6">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-6" />
          <p className="text-muted-foreground">Calcul de votre score…</p>
        </div>
      );
    }
    if (submitError) {
      return (
        <div className="max-w-md mx-auto text-center py-32 px-6">
          <h2 className="text-xl font-bold mb-2">{submitErrorMsg ? "Test non enregistré" : "Une erreur est survenue"}</h2>
          <p className="text-muted-foreground mb-6">{submitErrorMsg || "Impossible de récupérer votre score. Réessayez."}</p>
          {needVerification
            ? <Button onClick={() => navigate("/academy/profile")}>Vérifier mon email</Button>
            : <Button onClick={submitTest}>Réessayer</Button>}
        </div>
      );
    }
    if (score === null && testStatus && !testStatus.canRetry && testStatus.nextTestAllowed) {
      const when = new Date(testStatus.nextTestAllowed).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      return (
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-9 h-9 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Patientez avant de reessayer</h2>
          <p className="text-muted-foreground mb-2">Vous avez deja passe le test d'admission sans atteindre le score requis.</p>
          <p className="text-sm mb-6">Vous pourrez le repasser a partir du <strong className="text-primary">{when}</strong> (delai d'une semaine).</p>
          {/* Le délai d'une semaine n'a de sens que s'il sert à réviser : on donne ici de quoi
              le faire, au moment précis où la personne cherche quoi faire ensuite. */}
          <a href={LIVRET_FICHIER} target="_blank" rel="noopener noreferrer"
            className="block text-left rounded-2xl border border-border/60 bg-card p-4 mb-6 hover:shadow-md transition-shadow">
            <p className="flex items-center gap-2 font-semibold text-sm">
              <FileText className="w-4 h-4 text-primary shrink-0" /> Profitez de cette semaine
            </p>
            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              Le livret de révision reprend les quatre domaines du test en 10 pages, avec dix
              questions d'entraînement et leur corrigé.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary mt-2.5">
              <Download className="w-3.5 h-3.5" /> Télécharger le livret
            </span>
          </a>
          <Button variant="outline" onClick={() => setView("landing")}>Retour a l'accueil</Button>
        </div>
      );
    }
    const pct = Math.round((score! / BANQUE.length) * 100);
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <div className={`w-28 h-28 rounded-full mx-auto mb-6 flex flex-col items-center justify-center border-4 ${passed ? "border-primary" : "border-destructive"}`}>
          <span className="text-3xl font-black">{score}</span>
          <span className="text-xs text-muted-foreground">sur 30</span>
        </div>
        <h2 className="text-2xl font-bold mb-3">{passed ? "🎉 Félicitations !" : "📚 Continue à réviser"}</h2>
        <p className="text-muted-foreground mb-8 font-serif">
          {passed
            ? "Score : " + pct + "% — Vous etes admis(e) ! Votre attestation d\u0027admission (valable 3 mois) est disponible. Une lecon se debloque chaque semaine."
            : "Score : " + pct + "% — Score requis : 70% (21/30). Vous pourrez repasser le test dans une semaine."}
        </p>
        {/* Non admis : plutôt que de renvoyer réviser sans rien, on donne le support. */}
        {!passed && (
          <a href={LIVRET_FICHIER} target="_blank" rel="noopener noreferrer"
            className="block text-left bg-card border border-border/60 rounded-2xl p-5 mb-8 max-w-lg mx-auto hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Pour la prochaine fois</p>
            <p className="font-semibold mb-1">Le livret de révision</p>
            <p className="text-sm text-muted-foreground mb-3">
              10 pages sur les quatre domaines du test, dix questions d'entraînement avec leur
              corrigé, et un plan de révision sur cinq jours. Gratuit.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <Download className="w-4 h-4" /> Télécharger le livret
            </span>
          </a>
        )}
        {/* Admis : l'enchaînement immédiat est la première leçon, pas un menu. */}
        {passed && (
          <div className="bg-primary/5 border border-primary/25 rounded-2xl p-5 mb-8 text-left max-w-lg mx-auto">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Prochaine étape</p>
            <p className="font-semibold mb-1">
              {nextLesson ? nextLesson.sms_lessons?.title || "Votre première leçon" : "Votre première leçon vous attend"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Chaque leçon se termine par des exercices à faire vous-même : c'est ce travail qui donne votre note.
              {nextLesson?.due_at && ` À rendre avant le ${new Date(nextLesson.due_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`}
            </p>
            <Button size="lg" className="gap-2 w-full sm:w-auto"
              onClick={() => navigate(nextLesson ? `/academy/classroom/${nextLesson.course_id}?lesson=${nextLesson.lesson_id}` : "/academy/dashboard")}>
              <GraduationCap className="w-4 h-4" /> Commencer ma première leçon
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center mb-10">
          {passed
            ? <>
                <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate("/academy/dashboard")}>Mon tableau de bord</Button>
                <Button size="lg" variant="outline" className="gap-2" onClick={() => downloadStudentFile("/api/academy/certificate/admission", "attestation-admission").catch(() => alert("Téléchargement impossible, réessayez."))}>
                  <Download className="w-4 h-4" /> Mon attestation
                </Button>
              </>
            : <Button size="lg" className="gap-2" onClick={() => setView("landing")}>Retour a l'accueil</Button>}
        </div>


        {/* Détail */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 text-left">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Détail des réponses</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {BANQUE.map((q, i) => {
              const ok = !!submitResult?.correct?.[i];
              return (
                <div key={i} className="flex items-start gap-3 text-sm py-1.5 border-b border-border/30 last:border-0">
                  <span className={`mt-0.5 shrink-0 ${ok ? "text-primary" : "text-destructive"}`}>
                    {ok ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </span>
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{q.domain.split("—")[0].trim()}</span>
                  <span className="text-muted-foreground text-xs">{q.q.slice(0, 55)}…</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }


  // ─── TABS TOPBAR ────────────────────────────────────────────────────────────
  const showTabs = view !== "landing";

  return (
    <div ref={topRef}>
      <SEO title="LouisFarm Learning" description="Plateforme eLearning MEAL — KoboCollect, Python, QGIS" />

      {/* Sub-nav */}
      {showTabs && (
        <div className="border-b border-border/50 bg-muted/20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-1 overflow-x-auto py-0 scrollbar-none">
              <button onClick={() => setView("landing")} className="shrink-0 px-4 py-3 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" /> Accueil
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={startTest}
                className={`shrink-0 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                  view === "test" || view === "test-result" ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                Test de sélection
              </button>
              {/* Les cours, la progression et les attestations vivent dans l'espace étudiant :
                  y renvoyer plutôt que d'en présenter une copie locale non enregistrée. */}
              <button
                disabled={!passed}
                onClick={() => passed && navigate("/academy/dashboard")}
                className={`shrink-0 px-4 py-3 text-sm border-b-2 border-transparent transition-colors whitespace-nowrap ${
                  passed ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
                }`}>
                {!passed && <Lock className="w-3 h-3 inline mr-1" />}
                Mes cours et attestations
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "landing" && renderLanding()}
      {view === "test" && renderTest()}
      {view === "test-result" && renderTestResult()}
    </div>
  );
}
