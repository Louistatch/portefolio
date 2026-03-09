import { SEO } from "@/components/seo";
import { Droplets, ShieldCheck, Smartphone, Leaf, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function Research() {
  const projects = [
    {
      title: "Résilience Hydrique et Irrigation Climato-Intelligente",
      icon: Droplets,
      status: "En cours",
      description: "Diagnostics hydrologiques sur les bassins des rivières Lassa, Sara et Landa au Togo. Conception et supervision de mini-diguettes en sacs de sable pour améliorer la rétention d'eau. Formation de 100+ agriculteurs aux pratiques d'irrigation raisonnée et de compostage.",
      tags: ["Hydrologie", "Irrigation", "Climat", "CEDEAO/Banque Mondiale"],
      context: "Programme FSRP / FENOMAT"
    },
    {
      title: "Digitalisation du Suivi Agricole à Grande Échelle",
      icon: Smartphone,
      status: "En cours",
      description: "Mise en œuvre du suivi numérique de 3 000+ agriculteurs géolocalisés via KoBoToolbox et QGIS. Traçabilité des impacts et gestion proactive des risques pour 58 coopératives maraîchères dans la région de Kara.",
      tags: ["QGIS", "KoBoToolbox", "S&E", "FIDA"],
      context: "Projet ProSMAT - FIDA / CTOP"
    },
    {
      title: "Finance Agricole et Structuration de Coopératives",
      icon: TrendingUp,
      status: "Réalisé",
      description: "Soutien de 200+ agriculteurs dans l'accès au crédit et acquisition de kits d'irrigation. Structuration de 150+ coopératives pour améliorer leur gouvernance et éligibilité aux financements. Suivi-évaluation numérique pour 1 000+ producteurs via la méthodologie Farmer Business School.",
      tags: ["Finance", "Coopératives", "Crédit agricole", "MIFA"],
      context: "MIFA SA - Mécanisme National (soutenu par le FIDA)"
    },
    {
      title: "Chaînes de Valeur Durables et Entrepreneuriat Agricole",
      icon: Leaf,
      status: "Réalisé",
      description: "Développement des chaînes de valeur du gingembre, cacao et maraîchage biologique. Intégration de solutions d'irrigation goutte-à-goutte réduisant la consommation d'eau de 25%. Formation de 80 jeunes et femmes aux techniques agroécologiques.",
      tags: ["Agroécologie", "Chaînes de valeur", "Entrepreneuriat"],
      context: "AGROCROWN SARLU"
    },
    {
      title: "Assurance Indicielle et Gestion des Risques Climatiques",
      icon: ShieldCheck,
      status: "Publication",
      description: "Recherche sur la planification d'irrigation climato-intelligente pour la production d'ananas en Afrique de l'Ouest. Analyse de la rentabilité économique et des techniques d'irrigation pour la production de rejets d'ananas au Togo.",
      tags: ["Assurance", "Climat", "Recherche", "Publication"],
      context: "Publications scientifiques (sous revue 2025)"
    },
    {
      title: "Conservation des Sols et Encadrement Technique",
      icon: Users,
      status: "Réalisé",
      description: "Introduction de pratiques de conservation des sols et de l'humidité (paillage, cordons pierreux) sur 50 hectares. Encadrement technique de jeunes maraîchers sur les cultures de soja et légumes.",
      tags: ["Conservation", "Formation", "Maraîchage"],
      context: "CCSAGROGREEN"
    }
  ];

  return (
    <>
      <SEO title="Recherche & Projets" description="Projets de recherche et terrain de Louis TATCHIDA en agriculture, finance agricole et résilience climatique." />
      
      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <div className="mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">Recherche & Projets</h1>
          <p className="text-xl text-muted-foreground max-w-3xl font-serif">
            Mes travaux se situent au croisement de l'agronomie, la finance agricole et la digitalisation, avec un ancrage terrain fort en Afrique de l'Ouest.
          </p>
        </div>

        <div className="space-y-8">
          {projects.map((project, idx) => (
            <div key={idx} className="group bg-card rounded-3xl p-8 lg:p-10 border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <project.icon className="w-8 h-8 text-primary" />
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-xs text-muted-foreground font-medium">{project.context}</span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      project.status === 'En cours' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                      : project.status === 'Publication' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      : 'bg-muted text-muted-foreground border border-border/50'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">{project.title}</h2>
                  
                  <p className="text-muted-foreground font-serif leading-relaxed mb-6">
                    {project.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-primary/5 text-primary/80 border border-primary/10 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/publications" className="inline-flex items-center text-primary font-medium hover:underline gap-1">
            Voir les publications scientifiques <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
