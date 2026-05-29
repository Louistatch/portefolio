import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import {
  GraduationCap, ChevronRight, ChevronLeft, CheckCircle2,
  Lock, PlayCircle, BookOpen, Map, FlaskConical, Trophy,
  ArrowRight, Terminal, FileCode2, Layers, ClipboardCheck,
  Star, Cpu, Globe, BarChart3, Download, Send, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStudentLoggedIn, getStudent, studentFetch } from "@/lib/student";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type View = "landing" | "test" | "test-result" | "dashboard" | "notebook" | "cert";

interface Answer { qIdx: number; chosen: number; }

interface CellState { output: string; ran: boolean; error?: boolean; }

// ─── QUIZ DATA (30 questions) ─────────────────────────────────────────────────
const QUESTIONS = [
  { domain: "KoboCollect / XLSForm", q: "Dans un formulaire XLSForm, quelle colonne définit le type de question ?", opts: ["name", "type", "label", "hint"], ans: 1 },
  { domain: "KoboCollect / XLSForm", q: "Quel type de question XLSForm capture des coordonnées GPS ?", opts: ["text", "integer", "geopoint", "select_one"], ans: 2 },
  { domain: "KoboCollect / XLSForm", q: "L'onglet 'choices' dans un XLSForm sert à :", opts: ["Définir les types de questions", "Lister les options de réponse pour les questions à choix", "Configurer les contraintes", "Ajouter des médias"], ans: 1 },
  { domain: "KoboCollect / API", q: "Quelle méthode HTTP est utilisée pour soumettre des données via l'API KoboToolbox ?", opts: ["GET", "DELETE", "PUT", "POST"], ans: 3 },
  { domain: "KoboCollect / XLSForm", q: "Quelle expression de contrainte XLSForm vérifie qu'une valeur est supérieure à 0 ?", opts: ["value > 0", ". > 0", "${value} > 0", "check(. > 0)"], ans: 1 },
  { domain: "KoboCollect / Logique", q: "La colonne 'relevant' dans XLSForm permet de :", opts: ["Rendre une question obligatoire", "Afficher une question conditionnellement", "Valider la réponse", "Masquer l'identifiant"], ans: 1 },
  { domain: "KoboCollect / Déploiement", q: "Avant de collecter avec KoboCollect sur Android, quelle étape est nécessaire ?", opts: ["Installer PostgreSQL", "Configurer le serveur URL KoboToolbox dans les paramètres", "Activer le Bluetooth", "Créer un compte Gmail"], ans: 1 },
  { domain: "MEAL — Concepts", q: "L'acronyme MEAL signifie :", opts: ["Monitoring, Evaluation, Accountability, Learning", "Measure, Evaluate, Analyze, Link", "Monitor, Estimate, Audit, Log", "Manage, Evaluate, Account, Learn"], ans: 0 },
  { domain: "MEAL — Indicateurs", q: "Un indicateur SMART doit être :", opts: ["Simple, Mesurable, Applicable, Réaliste, Temporel", "Spécifique, Mesurable, Atteignable, Réaliste, Temporel", "Statistique, Modifiable, Analytique, Réel, Tabulé", "Systémique, Mesurable, Ajusté, Réel, Temporaire"], ans: 1 },
  { domain: "MEAL — Théorie du changement", q: "La théorie du changement décrit :", opts: ["Les budgets du projet", "La logique causale entre activités et impacts", "Le planning RH", "Les indicateurs financiers"], ans: 1 },
  { domain: "MEAL — Cadre logique", q: "Dans un cadre logique, les 'outputs' correspondent à :", opts: ["Les ressources mobilisées", "Les résultats directs des activités", "L'impact à long terme", "Les bénéficiaires visés"], ans: 1 },
  { domain: "MEAL — Redevabilité", q: "Le mécanisme de redevabilité vise principalement à :", opts: ["Auditer les finances", "Donner aux bénéficiaires un moyen de donner un retour", "Contrôler les équipes terrain", "Produire les rapports bailleurs"], ans: 1 },
  { domain: "MEAL — Évaluation", q: "Une évaluation à mi-parcours est conduite :", opts: ["Avant le démarrage du projet", "Pendant la mise en œuvre pour ajuster le projet", "Après la clôture", "Annuellement sans lien avec la phase"], ans: 1 },
  { domain: "Python — pandas", q: "Quelle commande pandas permet de lire un fichier CSV ?", opts: ["pd.open_csv()", "pd.read_csv()", "pd.load_file()", "pd.import_csv()"], ans: 1 },
  { domain: "Python — pandas", q: "Pour afficher les 5 premières lignes d'un DataFrame df, on utilise :", opts: ["df.show(5)", "df.top(5)", "df.head()", "df.view(5)"], ans: 2 },
  { domain: "Python — pandas", q: "Comment calculer la moyenne d'une colonne 'age' dans un DataFrame df ?", opts: ["df['age'].avg()", "df.mean('age')", "df['age'].mean()", "average(df, 'age')"], ans: 2 },
  { domain: "Python — pandas", q: "Quelle méthode permet de supprimer les valeurs manquantes (NaN) d'un DataFrame ?", opts: ["df.remove_na()", "df.dropna()", "df.fillna(None)", "df.clean()"], ans: 1 },
  { domain: "Python — visualisation", q: "Quelle bibliothèque Python est couramment utilisée pour créer des graphiques ?", opts: ["numpy", "scipy", "matplotlib", "requests"], ans: 2 },
  { domain: "Python — pandas", q: "Pour filtrer un DataFrame où 'statut' vaut 'actif', on écrit :", opts: ["df.filter(statut='actif')", "df[df['statut'] == 'actif']", "df.where('statut', 'actif')", "df.select(statut='actif')"], ans: 1 },
  { domain: "Python — MEAL", q: "Dans un contexte MEAL, que permet pandas.groupby() ?", opts: ["Créer une boucle", "Agréger des données par catégorie (ex: district, sexe)", "Visualiser des cartes", "Envoyer des emails"], ans: 1 },
  { domain: "QGIS — Bases", q: "QGIS est :", opts: ["Un logiciel payant de statistiques", "Un SIG open-source de cartographie", "Une base de données spatiale", "Un langage de programmation"], ans: 1 },
  { domain: "QGIS — Données", q: "Quel format vectoriel remplace le Shapefile dans QGIS ?", opts: [".geotiff", ".kml", ".gpkg (GeoPackage)", ".csv"], ans: 2 },
  { domain: "QGIS — Analyse spatiale", q: "La jointure spatiale permet de :", opts: ["Fusionner deux tableaux par un ID", "Associer des attributs selon la position des entités", "Découper une couche", "Changer le système de projection"], ans: 1 },
  { domain: "QGIS — Projections", q: "Le système WGS84 (EPSG:4326) utilise des coordonnées en :", opts: ["Mètres", "Kilomètres", "Degrés (latitude/longitude)", "Pieds"], ans: 2 },
  { domain: "QGIS — PyQGIS", q: "En PyQGIS, quelle ligne permet de charger une couche vectorielle ?", opts: ["layer = openFile('path.gpkg')", "layer = QgsVectorLayer('path.gpkg', 'nom', 'ogr')", "layer = QGIS.load('path.gpkg')", "layer = addLayer('path.gpkg')"], ans: 1 },
  { domain: "QGIS — Atlas", q: "La fonctionnalité Atlas dans QGIS permet de :", opts: ["Télécharger des données OSM", "Générer automatiquement des cartes en série par entité", "Analyser des rasters", "Éditer des attributs en masse"], ans: 1 },
  { domain: "QGIS — Données terrain", q: "Pour importer des données GPS KoboCollect dans QGIS, on peut utiliser :", opts: ["Un fichier XLSForm directement", "Un CSV avec colonnes latitude/longitude ou un GeoJSON", "Un fichier .docx", "Une connexion Bluetooth"], ans: 1 },
  { domain: "MEAL — Terrain", q: "Le MUAC < 115 mm chez un enfant de 6-59 mois indique :", opts: ["Une obésité", "Une malnutrition aiguë sévère (MAS)", "Un développement normal", "Une malnutrition chronique"], ans: 1 },
  { domain: "MEAL — Échantillonnage", q: "L'échantillonnage LQAS est utilisé pour :", opts: ["Analyser des données financières", "Évaluer rapidement si un programme atteint un seuil de couverture", "Former les équipes terrain", "Cartographier les bénéficiaires"], ans: 1 },
  { domain: "MEAL — Restitution", q: "Un 'learning review' dans le MEAL a pour objectif de :", opts: ["Publier un rapport final", "Capitaliser sur les enseignements pour améliorer la pratique", "Contrôler les agents terrain", "Auditer le budget"], ans: 1 },
];

// ─── PROJECTS DATA ────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    id: 0,
    num: "01",
    title: "Enquête nutritionnelle — Région de Lomé",
    icon: FlaskConical,
    tools: ["KoboCollect", "Python", "pandas"],
    desc: "Concevoir un formulaire XLSForm, simuler 200 observations terrain, analyser les indicateurs MUAC et Z-scores selon les seuils SPHERE/OMS.",
    totalCells: 6,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    id: 1,
    num: "02",
    title: "Cartographie des bénéficiaires WASH",
    icon: Map,
    tools: ["QGIS", "PyQGIS", "KoboAPI"],
    desc: "Importer les coordonnées GPS des points d'eau, réaliser une analyse de couverture spatiale et produire des cartes d'intervention par district.",
    totalCells: 9,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: 2,
    num: "03",
    title: "Système de reporting MEAL automatisé",
    icon: BarChart3,
    tools: ["Python", "openpyxl", "QGIS Atlas"],
    desc: "Construire un pipeline complet : extraction KoboAPI → analyse Python → génération de rapport PDF avec cartes QGIS intégrées.",
    totalCells: 14,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
];

// ─── NOTEBOOK CHAPTERS (Projet 01) ────────────────────────────────────────────
const CHAPTERS = [
  {
    title: "Introduction & contexte",
    cells: [
      {
        type: "md",
        content: `## Contexte\n\nCe projet simule une **enquête nutritionnelle** dans la région de Lomé, Togo. Vous allez concevoir un formulaire KoboCollect, simuler la collecte de 200 observations, puis analyser les indicateurs nutritionnels clés.\n\n**Objectif MEAL :** Mesurer la prévalence de la malnutrition aiguë (MUAC < 125mm) chez les enfants de 6-59 mois.`,
      },
      {
        type: "code",
        lang: "python",
        code: `import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n\nprint("✓ Bibliothèques chargées")\nprint(f"pandas : {pd.__version__}")`,
        output: "✓ Bibliothèques chargées\npandas : 2.1.4",
      },
    ],
  },
  {
    title: "Formulaire KoboCollect",
    cells: [
      {
        type: "md",
        content: `## Conception du formulaire XLSForm\n\nLe formulaire collecte : identité de l'enfant, **MUAC**, poids, taille, coordonnées GPS.\n\n- **type** : geopoint, decimal, select_one\n- **constraint** : '. >= 6 and . <= 59' pour l'âge\n- **relevant** : affichage conditionnel par sexe`,
      },
      {
        type: "code",
        lang: "python",
        code: `xlsform = {\n  'survey': [\n    {'type': 'text',     'name': 'child_name', 'label': "Nom de l'enfant"},\n    {'type': 'integer',  'name': 'age_months', 'label': 'Âge (mois)', 'constraint': '. >= 6 and . <= 59'},\n    {'type': 'select_one sexe', 'name': 'sexe', 'label': 'Sexe'},\n    {'type': 'decimal',  'name': 'muac_mm',    'label': 'MUAC (mm)'},\n    {'type': 'geopoint', 'name': 'gps',        'label': 'Position GPS'},\n  ]\n}\ndf = pd.DataFrame(xlsform['survey'])\nprint(df[['type','name','label']].to_string(index=False))`,
        output: "          type       name           label\n          text child_name Nom de l'enfant\n       integer age_months      Âge (mois)\nselect_one sexe       sexe            Sexe\n       decimal    muac_mm       MUAC (mm)\n      geopoint        gps    Position GPS",
      },
    ],
  },
  {
    title: "Simulation de données",
    cells: [
      {
        type: "code",
        lang: "python",
        code: `np.random.seed(42)\nN = 200\ndistricts = ['Agoè', 'Golfe', 'Zio', 'Bas-Mono', 'Lacs']\n\ndata = {\n  'child_id': [f'TG-LME-{str(i).zfill(3)}' for i in range(1, N+1)],\n  'district': np.random.choice(districts, N, p=[.3,.25,.2,.15,.1]),\n  'age_months': np.random.randint(6, 60, N),\n  'sexe': np.random.choice(['M','F'], N),\n  'muac_mm': np.random.normal(130, 18, N).clip(60, 200).round(1),\n  'latitude': np.random.uniform(6.05, 6.45, N).round(6),\n  'longitude': np.random.uniform(1.10, 1.55, N).round(6),\n}\n\ndf = pd.DataFrame(data)\nprint(f"✓ {len(df)} observations générées")\nprint(df.head(3))`,
        output: "✓ 200 observations générées\n  child_id district  age_months sexe  muac_mm  latitude  longitude\n0 TG-LME-001     Agoè          23    M    127.3  6.183421   1.342156\n1 TG-LME-002    Golfe          41    F    145.2  6.221034   1.421893\n2 TG-LME-003      Zio          15    M    118.6  6.094512   1.198734",
      },
    ],
  },
  {
    title: "Analyse des indicateurs",
    cells: [
      {
        type: "md",
        content: `## Classification nutritionnelle OMS/SPHERE\n\n| Seuil MUAC | Statut |\n|---|---|\n| < 115 mm | MAS — Malnutrition Aiguë Sévère |\n| 115 – 125 mm | MAM — Malnutrition Aiguë Modérée |\n| ≥ 125 mm | Normal |`,
      },
      {
        type: "code",
        lang: "python",
        code: `def classify_muac(m):\n  if m < 115: return 'MAS'\n  elif m < 125: return 'MAM'\n  return 'Normal'\n\ndf['statut'] = df['muac_mm'].apply(classify_muac)\nstats = df['statut'].value_counts()\npct  = (stats / len(df) * 100).round(1)\n\nfor s, p in pct.items():\n  print(f"  {s:8s}: {stats[s]:3d} enfants ({p}%)")\nprint(f"\\nPrévalence MAG (MAS+MAM): {pct.get('MAS',0)+pct.get('MAM',0):.1f}%")\nprint("Seuil urgence SPHERE > 15% → ⚠ ALERTE")`,
        output: "  Normal  : 148 enfants (74.0%)\n  MAM     :  36 enfants (18.0%)\n  MAS     :  16 enfants (8.0%)\n\nPrévalence MAG (MAS+MAM): 26.0%\nSeuil urgence SPHERE > 15% → ⚠ ALERTE",
      },
    ],
  },
  {
    title: "Visualisation",
    cells: [
      {
        type: "code",
        lang: "python",
        code: `fig, axes = plt.subplots(1, 3, figsize=(15, 5))\nfig.suptitle('Rapport Nutritionnel — Lomé 2024', fontsize=14)\n\n# Distribution MUAC\naxes[0].hist(df['muac_mm'], bins=25, color='#0d9488', alpha=0.8)\naxes[0].axvline(115, color='red', linestyle='--', label='MAS')\naxes[0].axvline(125, color='orange', linestyle='--', label='MAM')\naxes[0].set_title('Distribution MUAC'); axes[0].legend()\n\n# Par district\ndistrict_mag = df.groupby('district')['statut'].apply(\n  lambda x: (x!='Normal').mean()*100\n).sort_values()\ndistrict_mag.plot(kind='barh', ax=axes[1], color='#0d9488')\naxes[1].set_title('Prévalence MAG par district (%)')\n\n# Camembert\ndf['statut'].value_counts().plot(\n  kind='pie', ax=axes[2], colors=['#4ade80','#fb923c','#f87171'], autopct='%1.1f%%'\n)\naxes[2].set_title('Répartition')\n\nplt.tight_layout()\nprint("✓ rapport_nutrition.png exporté")`,
        output: "✓ rapport_nutrition.png exporté\n📊 3 graphiques générés :\n   - Distribution MUAC avec seuils OMS\n   - Prévalence MAG par district (Bas-Mono: 38% ⚠)\n   - Répartition MAS/MAM/Normal",
      },
    ],
  },
  {
    title: "Export & rapport bailleur",
    cells: [
      {
        type: "code",
        lang: "python",
        code: `summary = {\n  'Indicateur': ['Enfants enquêtés','MAS (MUAC<115mm)','MAM (115-125mm)','Prévalence MAG'],\n  'Valeur':     [200, '8.0%', '18.0%', '26.0%'],\n  'Seuil SPHERE':['—','< 2%','< 10%','< 15%'],\n  'Statut':     ['—','⚠ ALERTE','⚠ ALERTE','🔴 URGENCE'],\n}\n\ndf_summary = pd.DataFrame(summary)\nprint(df_summary.to_string(index=False))\ndf_summary.to_excel('nutrition_lome_2024.xlsx', index=False)\nprint("\\n✓ nutrition_lome_2024.xlsx exporté")\nprint("✓ Rapport prêt pour soumission bailleur")`,
        output: "      Indicateur    Valeur Seuil SPHERE     Statut\nEnfants enquêtés       200            —          —\n MAS (MUAC<115mm)     8.0%        < 2%  ⚠ ALERTE\n MAM (115-125mm)      18.0%       < 10%  ⚠ ALERTE\n  Prévalence MAG      26.0%       < 15% 🔴 URGENCE\n\n✓ nutrition_lome_2024.xlsx exporté\n✓ Rapport prêt pour soumission bailleur",
      },
    ],
  },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ELearning() {
  const [view, setView] = useState<View>("landing");
  const [, navigate] = useLocation();
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [chapter, setChapter] = useState(0);
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [certName, setCertName] = useState("");
  const [certEmail, setCertEmail] = useState("");
  const [certOrg, setCertOrg] = useState("");
  const [certSent, setCertSent] = useState(false);
  const [openProject, setOpenProject] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const passed = score !== null && score >= 21;
  const answeredCount = Object.keys(answers).length;
  const totalPython = CHAPTERS.reduce((s, ch) => s + ch.cells.filter(c => c.type === "code").length, 0);
  const ranCount = Object.keys(cells).length;
  const nbProgress = Math.round(ranCount / totalPython * 100);

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); }, [view, chapter]);

  // ── SUBMIT TEST (étudiant authentifié — score enregistré sur son compte)
  async function submitTest() {
    let s = 0;
    QUESTIONS.forEach((q, i) => { if (answers[i] === q.ans) s++; });
    setScore(s);
    setView("test-result");
    try {
      await studentFetch("/api/academy/submit-test", {
        method: "POST",
        body: JSON.stringify({ score: s }),
      });
    } catch (e) { /* géré par studentFetch (redirige si session expirée) */ }
  }

  // ── Vérifie l'authentification avant de démarrer le test
  function startTest() {
    if (!isStudentLoggedIn()) {
      navigate("/academy/login");
      return;
    }
    setView("test");
  }

  // ── RUN CELL
  function runCell(key: string, output: string) {
    setCells(prev => ({ ...prev, [key]: { output, ran: true } }));
  }

  // ── CERT SUBMIT
  function sendCert() {
    if (!certName || !certEmail) return;
    setCertSent(true);
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
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="gap-2" onClick={startTest}>
              <PlayCircle className="w-5 h-5" /> Passer le test de sélection
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>
              Comment ça marche <ChevronRight className="w-4 h-4" />
            </Button>
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
            ? `Score : ${pct}% — Vous êtes admis(e) ! Votre score a été enregistré sur votre compte.`
            : `Score : ${pct}% — Score requis : 70% (21/30). Révisez le MEAL, KoboCollect, Python et QGIS.`}
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-10">
          {passed
            ? <Button size="lg" className="gap-2" onClick={() => navigate("/academy/dashboard")}><GraduationCap className="w-4 h-4" /> Accéder à mes cours</Button>
            : <Button size="lg" className="gap-2" onClick={() => { setAnswers({}); setQIdx(0); setScore(null); setView("test"); }}>↺ Reprendre le test</Button>}
          <Button variant="outline" onClick={() => setView("landing")}>← Retour</Button>
        </div>


        {/* Détail */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 text-left">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Détail des réponses</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {QUESTIONS.map((q, i) => {
              const ok = answers[i] === q.ans;
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

  function renderDashboard() {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">Tableau de bord apprenant</span>
          <h2 className="text-3xl font-bold mt-4 mb-2">Mes projets MEAL</h2>
          <p className="text-muted-foreground font-serif">Chaque projet est un cas terrain complet. Finissez toutes les cellules du notebook pour débloquer l'attestation.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {PROJECTS.map((proj, idx) => {
            const locked = idx > 0 && !(idx === 1 && nbProgress === 100);
            return (
              <div key={proj.id}
                className={`group bg-card rounded-3xl p-7 border border-border/50 shadow-sm transition-all duration-300 ${locked ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl hover:border-primary/30 cursor-pointer"}`}
                onClick={() => { if (!locked) { setOpenProject(proj.id); setChapter(0); setView("notebook"); } }}>
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl ${proj.bg} flex items-center justify-center ${locked ? "" : "group-hover:scale-110 transition-transform duration-300"}`}>
                    <proj.icon className={`w-6 h-6 ${proj.color}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {locked
                      ? <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full"><Lock className="w-3 h-3" /> Verrouillé</span>
                      : idx === 0 ? <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full">En cours</span>
                      : <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Disponible</span>}
                  </div>
                </div>
                <div className="text-xs font-mono text-muted-foreground mb-1">PROJET {proj.num}</div>
                <h3 className="font-semibold mb-2 leading-snug">{proj.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{proj.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {proj.tools.map(t => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">{t}</span>)}
                </div>
                {idx === 0 && (
                  <>
                    <div className="h-1 bg-muted rounded-full mb-1">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${nbProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{nbProgress}% complété</span>
                      <span>{ranCount} / {totalPython} cellules</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Skills sidebar */}
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h4 className="font-semibold mb-4">Progression des compétences</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { name: "KoboCollect", pct: Math.min(nbProgress, 70) },
              { name: "Python/pandas", pct: Math.min(nbProgress, 55) },
              { name: "QGIS", pct: 0 },
              { name: "Analyse MEAL", pct: Math.min(nbProgress, 60) },
            ].map(s => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{s.name}</span><span className="text-xs font-mono">{s.pct}%</span></div>
                <div className="h-1.5 bg-muted rounded-full"><div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderNotebook() {
    const ch = CHAPTERS[chapter];
    const isLast = chapter === CHAPTERS.length - 1;
    const allRan = CHAPTERS.every((c, ci) => c.cells.filter(cell => cell.type === "code").every((_, ki) => cells[`${ci}-${ki}`]?.ran));

    return (
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border/50 bg-muted/30 pt-6 px-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">Projet 01 — Nutrition</div>
          <nav className="space-y-1">
            {CHAPTERS.map((c, i) => {
              const isDone = c.cells.filter(cell => cell.type === "code").every((_, ki) => cells[`${i}-${ki}`]?.ran);
              return (
                <button key={i} onClick={() => setChapter(i)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 ${chapter === i ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary" />}
                  <span>{i + 1}. {c.title}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-auto pb-6 pt-4 border-t border-border/50 mt-6">
            <div className="text-xs text-muted-foreground mb-1">{nbProgress}% complété</div>
            <div className="h-1.5 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${nbProgress}%` }} /></div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <button onClick={() => setView("dashboard")} className="hover:text-primary transition-colors">Mes projets</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{ch.title}</span>
          </div>

          <h2 className="text-2xl font-bold mb-6">{ch.title}</h2>

          {/* Cells */}
          <div className="space-y-4 mb-8">
            {ch.cells.map((cell, ci) => {
              const key = `${chapter}-${ci}`;
              if (cell.type === "md") {
                return (
                  <div key={ci} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30">
                      <FileCode2 className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground font-mono">markdown</span>
                    </div>
                    <div className="px-5 py-4 text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                      {cell.content!.split("\n").map((line, li) => {
                        if (line.startsWith("## ")) return <h3 key={li} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>;
                        if (line.startsWith("| ")) return <div key={li} className="font-mono text-xs bg-muted px-2 py-0.5 my-0.5 rounded">{line}</div>;
                        if (line.startsWith("- ")) return <div key={li} className="ml-3 text-muted-foreground">• {line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1")}</div>;
                        return <p key={li} className="text-muted-foreground">{line.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
                      })}
                    </div>
                  </div>
                );
              }
              // Code cell
              const state = cells[key];
              return (
                <div key={ci} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      <span className="text-xs text-muted-foreground font-mono">{cell.lang}</span>
                    </div>
                    <Button size="sm" variant={state?.ran ? "outline" : "default"}
                      className={`h-7 text-xs gap-1.5 ${state?.ran ? "text-primary border-primary/40" : ""}`}
                      onClick={() => runCell(key, cell.output!)}>
                      {state?.ran ? <><CheckCircle2 className="w-3 h-3" /> Exécuté</> : <><PlayCircle className="w-3 h-3" /> Exécuter</>}
                    </Button>
                  </div>
                  <pre className="px-5 py-4 text-xs font-mono overflow-x-auto bg-[#0d1117] text-slate-300 leading-relaxed">
                    <code>{cell.code}</code>
                  </pre>
                  {state?.ran && (
                    <div className="border-t border-border/50">
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/20">
                        <Star className="w-3 h-3 text-primary" />
                        <span className="text-xs text-muted-foreground font-mono">output</span>
                      </div>
                      <pre className="px-5 py-3 text-xs font-mono text-primary/80 leading-relaxed whitespace-pre-wrap">{state.output}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <Button variant="outline" disabled={chapter === 0} onClick={() => setChapter(c => c - 1)} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </Button>
            {isLast ? (
              allRan
                ? <Button className="gap-2" onClick={() => setView("cert")}><Trophy className="w-4 h-4" /> Demander l'attestation</Button>
                : <Button variant="outline" disabled className="gap-2 text-muted-foreground"><Lock className="w-3.5 h-3.5" /> Exécutez toutes les cellules</Button>
            ) : (
              <Button onClick={() => setChapter(c => c + 1)} className="gap-2">
                Suivant <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  function renderCert() {
    if (certSent) {
      return (
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3">Demande envoyée !</h2>
          <p className="text-muted-foreground font-serif mb-8">Votre attestation pour <strong className="text-foreground">{certName}</strong> sera émise et envoyée à <em>{certEmail}</em> dans 24-48h après vérification.</p>
          <Button onClick={() => setView("dashboard")} className="gap-2">← Retour au tableau de bord</Button>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">Attestation de compétence</span>
          <h2 className="text-3xl font-bold mt-4 mb-3">Demander mon attestation</h2>
          <p className="text-muted-foreground font-serif">Après avoir complété un projet, renseignez vos informations pour recevoir votre attestation numérique.</p>
        </div>

        {/* Preview */}
        <div className="bg-card rounded-3xl border-2 border-primary/30 p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">DataMEAL Academy</span>
            <div className="flex-1 h-px bg-border/50 ml-2" />
          </div>
          <p className="text-sm text-muted-foreground mb-2 mt-4">Atteste que</p>
          <p className="text-2xl font-bold font-serif mb-3 text-foreground">{certName || "Votre nom complet"}</p>
          <p className="text-sm text-muted-foreground mb-3">a complété avec succès le projet :<br /><strong className="text-foreground">Enquête nutritionnelle — Région de Lomé</strong></p>
          <div className="flex flex-wrap gap-2 mb-4">
            {["KoboCollect", "Python/pandas", "MEAL Framework", "Analyse terrain"].map(s =>
              <span key={s} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{s}</span>)}
          </div>
          <p className="text-xs text-muted-foreground font-mono">Score du test : {score ?? "—"}/30 &nbsp;|&nbsp; {new Date().toLocaleDateString("fr-FR")}</p>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-8">
          {[
            { label: "Nom complet *", val: certName, set: setCertName, ph: "Louis TATCHIDA", type: "text" },
            { label: "Email professionnel *", val: certEmail, set: setCertEmail, ph: "vous@organisation.org", type: "email" },
            { label: "Organisation / Institution", val: certOrg, set: setCertOrg, ph: "ONG, Gouvernement, Université…", type: "text" },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
            </div>
          ))}
        </div>

        <Button size="lg" className="w-full gap-2" onClick={sendCert} disabled={!certName || !certEmail}>
          <Send className="w-4 h-4" /> Soumettre ma demande d'attestation
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">L'attestation est émise après vérification de votre notebook complété.</p>
      </div>
    );
  }

  // ─── TABS TOPBAR ────────────────────────────────────────────────────────────
  const showTabs = view !== "landing";
  const tabs: { key: View; label: string }[] = [
    { key: "test", label: "Test de sélection" },
    { key: "dashboard", label: "Mes projets" },
    { key: "notebook", label: "Notebook" },
    { key: "cert", label: "Attestation" },
  ];

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
              {tabs.map(t => {
                const active = view === t.key || (t.key === "notebook" && view === "notebook");
                const disabled = !passed && t.key !== "test";
                return (
                  <button key={t.key}
                    disabled={disabled}
                    onClick={() => !disabled && setView(t.key)}
                    className={`shrink-0 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                      active ? "border-primary text-primary font-medium" : disabled ? "border-transparent text-muted-foreground/40 cursor-not-allowed" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}>
                    {disabled && t.key !== "test" && <Lock className="w-3 h-3 inline mr-1" />}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === "landing" && renderLanding()}
      {view === "test" && renderTest()}
      {view === "test-result" && renderTestResult()}
      {view === "dashboard" && renderDashboard()}
      {view === "notebook" && renderNotebook()}
      {view === "cert" && renderCert()}
    </div>
  );
}
