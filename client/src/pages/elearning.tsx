import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import {
  GraduationCap, ChevronRight, ChevronLeft, CheckCircle2,
  Lock, PlayCircle, BookOpen, Trophy,
  ArrowRight, Terminal, Layers, ClipboardCheck,
  Cpu, Globe, Download, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SocialShare } from "@/components/social-share";
import { isStudentLoggedIn, getStudent, studentFetch, downloadStudentFile } from "@/lib/student";

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

  const passed = testStatus?.passed === true || (score !== null && score >= 21);
  const answeredCount = Object.keys(answers).length;

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); }, [view]);

  useEffect(() => {
    if (isStudentLoggedIn()) {
      studentFetch("/api/academy/test-status").then(r => r.json()).then(setTestStatus).catch(() => {});
    }
  }, []);

  // ── SUBMIT TEST (étudiant authentifié — score enregistré sur son compte)
  async function submitTest() {
    // Le score est calculé et vérifié CÔTÉ SERVEUR uniquement (le client n'a pas le corrigé) : on envoie
    // les réponses choisies et on attend le score officiel avant d'afficher un résultat.
    const answerArray = QUESTIONS.map((_, i) => (answers[i] ?? -1));
    setSubmitError(false);
    setSubmitErrorMsg(null);
    setSubmitting(true);
    setView("test-result");
    try {
      const res = await studentFetch("/api/academy/submit-test", {
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
      studentFetch("/api/academy/test-status").then(r => r.json()).then(setTestStatus).catch(() => {});
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

  // ── Vérifie l'authentification avant de démarrer le test
  function startTest() {
    if (!isStudentLoggedIn()) {
      navigate("/academy/register");
      return;
    }
    if (testStatus?.passed) { navigate("/academy/dashboard"); return; }
    if (testStatus && !testStatus.canRetry && testStatus.nextTestAllowed) {
      setView("test-result"); // affiche le message de verrou
      return;
    }
    setView("test");
  }

  // ─────────────────── RENDER HELPERS ──────────────────────────────────────

  function renderLanding() {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <SEO title="DataMEAL Academy" description="Plateforme eLearning gratuite MEAL — KoboCollect, Python, QGIS. Apprenez par les projets terrain." />

        {/* Bandeau authentification */}
        {!isStudentLoggedIn() ? (
          <div className="bg-card border border-border/50 rounded-2xl p-4 mb-8 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Connexion requise</span> — créez un compte pour passer le test d'aptitude.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/academy/login")}>Se connecter</Button>
              <Button size="sm" onClick={() => navigate("/academy/register")}>Créer un compte</Button>
            </div>
          </div>
        ) : (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm">Connecté en tant que <span className="font-medium">{getStudent()?.full_name}</span>. Vous pouvez passer le test.</p>
          </div>
        )}

        {/* Hero */}
        <div className="mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full mb-6">
            <GraduationCap className="w-3.5 h-3.5" /> Accès gratuit · Sur sélection · 30 questions
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Maîtrisez le <span className="text-primary">MEAL terrain</span><br className="hidden lg:block" /> par les projets
          </h1>
          <p className="text-xl text-muted-foreground font-serif max-w-2xl mb-8 leading-relaxed">
            Une formation gratuite et intensive par projets sur KoboCollect, Python et QGIS pour construire des systèmes de Suivi-Évaluation dans les contextes humanitaires et de développement.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" className="gap-2" onClick={startTest}>
              <PlayCircle className="w-5 h-5" /> Passer le test de sélection
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>
              Comment ça marche <ChevronRight className="w-4 h-4" />
            </Button>
            <SocialShare
              url="/elearning"
              title="Formation MEAL gratuite par projets (KoboCollect, Python, QGIS) — DataMEAL Academy"
              description="Apprends à construire des systèmes de Suivi-Évaluation pour l'humanitaire et le développement. Formation gratuite, par projets, certifiante. Inscris-toi sur DataMEAL Academy !"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { n: "30", l: "Questions de sélection", icon: ClipboardCheck },
            { n: "3", l: "Projets terrain complets", icon: Layers },
            { n: "100%", l: "Gratuit & certifié", icon: Trophy },
            { n: "Notebooks", l: "Intégrés Python + QGIS", icon: Terminal },
          ].map((s) => (
            <div key={s.l} className="bg-card rounded-2xl p-5 border border-border/50 flex flex-col gap-2">
              <s.icon className="w-5 h-5 text-primary" />
              <div className="text-2xl font-bold">{s.n}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div id="how" className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Comment ça marche</h2>
          <div className="grid lg:grid-cols-4 gap-4">
            {[
              { step: "01", title: "Test de sélection", desc: "30 questions sur le MEAL, KoboCollect, Python et QGIS. Score minimum 70%.", icon: ClipboardCheck },
              { step: "02", title: "Accès aux projets", desc: "3 projets terrain progressifs, chacun avec un notebook interactif intégré.", icon: BookOpen },
              { step: "03", title: "Notebook + exécution", desc: "Écrivez et exécutez du code Python/PyQGIS directement dans votre navigateur.", icon: Terminal },
              { step: "04", title: "Attestation", desc: "Finissez un projet et demandez votre attestation de compétence signée.", icon: Trophy },
            ].map((s) => (
              <div key={s.step} className="bg-card rounded-2xl p-6 border border-border/50 relative">
                <div className="text-5xl font-black text-muted/30 mb-3 font-serif">{s.step}</div>
                <s.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">Les trois piliers du MEAL moderne</h2>
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              { title: "KoboCollect", icon: Cpu, tags: ["XLSForm", "ODK", "API REST"], desc: "Conception de formulaires XLSForm, déploiement d'enquêtes, collecte GPS et gestion des soumissions via l'API KoboToolbox.", color: "bg-primary/10 text-primary" },
              { title: "Python MEAL", icon: Terminal, tags: ["pandas", "matplotlib", "openpyxl"], desc: "Nettoyage et analyse des données terrain, visualisation des indicateurs SMART, génération automatique de rapports de suivi.", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
              { title: "QGIS + PyQGIS", icon: Globe, tags: ["PyQGIS", "PostGIS", "Atlas"], desc: "Cartographie des zones d'intervention, analyse spatiale des bénéficiaires, cartes pour les rapports bailleurs de fonds.", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
            ].map((t) => (
              <div key={t.title} className="group bg-card rounded-3xl p-8 border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl ${t.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <t.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{t.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {t.tags.map(tag => <span key={tag} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Témoignages */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Ils ont suivi la formation</h2>
          <p className="text-muted-foreground mb-8">Des professionnels du MEAL en Afrique de l'Ouest, formés par les projets.</p>
          <div className="grid lg:grid-cols-3 gap-5">
            {[
              {
                name: "Aïcha D.", role: "Agent de suivi-évaluation", org: "ONG nutrition · Lomé, Togo",
                initials: "AD",
                quote: "Je partais de zéro en informatique. Aujourd'hui je conçois mes propres formulaires KoboCollect et je sors les indicateurs MUAC toute seule. Sur le terrain à Agoè, ça a tout changé : plus de papier, des données fiables le jour même.",
              },
              {
                name: "Boukari S.", role: "Chargé de projets WASH", org: "Coopératives · Kara, Togo",
                initials: "BS",
                quote: "Le projet QGIS m'a permis d'identifier 7 villages sans point d'eau à moins de 2 km. J'ai présenté la carte au bailleur, et les forages ont été budgétisés. Une compétence qui se voit immédiatement sur le terrain.",
              },
              {
                name: "Fatoumata K.", role: "Coordinatrice MEAL", org: "ONG régionale · Ouagadougou, Burkina Faso",
                initials: "FK",
                quote: "Avant, je passais deux semaines par trimestre sur les rapports. Le pipeline automatisé du Projet 3 me fait tout en un clic : données Kobo, cartes, Excel, PDF. Je consacre enfin ce temps à l'accompagnement des équipes.",
              },
            ].map((t) => (
              <div key={t.name} className="bg-card rounded-3xl p-6 border border-border/50 flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-amber-500">★</span>)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed font-serif italic flex-1">« {t.quote} »</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/40">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{t.initials}</div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role} · {t.org}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="bg-primary/5 rounded-3xl p-10 border border-primary/20 text-center">
          <GraduationCap className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Prêt(e) à rejoindre la formation ?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">La formation est entièrement gratuite. Passez le test de 30 questions pour être sélectionné(e).</p>
          <Button size="lg" className="gap-2" onClick={startTest}>
            Commencer le test <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  function renderTest() {
    const q = QUESTIONS[qIdx];
    const chosen = answers[qIdx];
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Question {qIdx + 1} / {QUESTIONS.length}</span>
            <span className="text-sm text-muted-foreground">{answeredCount} réponses</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((qIdx + 1) / QUESTIONS.length) * 100}%` }} />
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {QUESTIONS.map((_, i) => (
              <button key={i} onClick={() => setQIdx(i)}
                className={`w-5 h-1.5 rounded-full transition-colors cursor-pointer ${answers[i] !== undefined ? "bg-primary" : i === qIdx ? "bg-primary/40" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm mb-6">
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">{q.domain}</span>
          <p className="text-lg font-medium mt-5 mb-6 leading-relaxed">{q.q}</p>
          <div className="space-y-3">
            {q.opts.map((opt, i) => (
              <button key={i} onClick={() => setAnswers(prev => ({ ...prev, [qIdx]: i }))}
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
          {qIdx < QUESTIONS.length - 1 ? (
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
          <p className="text-sm mb-8">Vous pourrez le repasser a partir du <strong className="text-primary">{when}</strong> (delai d'une semaine).</p>
          <Button variant="outline" onClick={() => setView("landing")}>Retour a l'accueil</Button>
        </div>
      );
    }
    const pct = Math.round((score! / QUESTIONS.length) * 100);
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
            {QUESTIONS.map((q, i) => {
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
      <SEO title="DataMEAL Academy" description="Plateforme eLearning MEAL — KoboCollect, Python, QGIS" />

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
