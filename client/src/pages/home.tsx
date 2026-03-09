import { Link } from "wouter";
import { ArrowRight, BookOpen, Leaf, LineChart, Cpu, Droplets, ShieldCheck, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { Newsletter } from "@/components/newsletter";
import { useQuery } from "@tanstack/react-query";

interface Profile {
  full_name: string; title: string; bio: string; photo_url: string;
}

export default function Home() {
  const { data: profile } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => { const r = await fetch("/api/profile"); return r.json(); },
  });

  return (
    <>
      <SEO title="Accueil" description="Louis TATCHIDA - Agronome & Expert en Finance Agricole, Résilience Climatique et Digitalisation Agricole en Afrique de l'Ouest." path="/" />
      
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center rounded-full px-4 py-1.5 border border-primary/20 bg-primary/5 text-primary text-sm font-medium">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Disponible pour consulting & collaboration
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
              {profile?.full_name || "Louis TATCHIDA"}<br/>
              <span className="text-gradient text-3xl lg:text-4xl font-semibold">
                Agronome & Expert Finance Agricole
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl font-serif">
              +8 ans d'expérience en résilience climatique et digitalisation des systèmes agricoles en Afrique de l'Ouest. 3 000+ agriculteurs accompagnés, 200+ coopératives structurées, 500M+ FCFA mobilisés.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/about" className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium transition-all bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0">
                Découvrir mon parcours
              </Link>
              <Link href="/booking" className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium transition-all border-2 border-border bg-background hover:bg-muted text-foreground rounded-xl hover:-translate-y-0.5 active:translate-y-0">
                Prendre rendez-vous
              </Link>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            <div className="aspect-square max-w-md mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-[2rem] rotate-6 opacity-20 blur-2xl" />
              <img 
                src={profile?.photo_url || "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=1000"} 
                alt={profile?.full_name || "Louis TATCHIDA"}
                className="relative rounded-[2rem] shadow-2xl object-cover w-full h-full border border-border/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Chiffres clés */}
      <section className="py-16 border-y border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "8+", label: "Années d'expérience", icon: TrendingUp },
              { value: "3 000+", label: "Agriculteurs accompagnés", icon: Users },
              { value: "200+", label: "Coopératives structurées", icon: ShieldCheck },
              { value: "500M+", label: "FCFA mobilisés", icon: LineChart },
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-3xl lg:text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domaines d'expertise */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Domaines d'Expertise</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Des approches interdisciplinaires alignées sur les priorités de développement en Afrique.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: LineChart, title: "Finance Agricole", desc: "Mobilisation de fonds, structuration de coopératives, assurance indicielle et ingénierie financière." },
              { icon: Droplets, title: "Résilience Climatique", desc: "Diagnostic hydrologique, irrigation raisonnée, techniques climato-intelligentes et conservation des sols." },
              { icon: Cpu, title: "Digitalisation & S&E", desc: "QGIS, KoBoToolbox, Python, suivi-évaluation numérique et tableaux de bord de performance." },
              { icon: Leaf, title: "Agronomie Durable", desc: "Chaînes de valeur agricoles, agroécologie, maraîchage biologique et formation des producteurs." }
            ].map((area, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <area.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{area.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{area.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parcours rapide */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Parcours Professionnel</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Des expériences terrain au service du développement agricole durable.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { role: "Consultant A2F & Résilience Hydrique", org: "FSRP / FENOMAT (CEDEAO/Banque Mondiale)", period: "2025" },
              { role: "Chargé de Projet Régional", org: "ProSMAT - FIDA / CTOP", period: "2024 - Présent" },
              { role: "Fondateur & Business Manager", org: "AGROCROWN SARLU", period: "2022 - 2024" },
              { role: "Conseiller en Financement Agricole", org: "MIFA SA (soutenu par le FIDA)", period: "2018 - 2022" },
              { role: "Coordonnateur de Programme", org: "CCSAGROGREEN", period: "2016 - 2018" },
              { role: "Stagiaire Agronome", org: "ONG AGIDE", period: "2016 - 2017" },
            ].map((exp, i) => (
              <div key={i} className="bg-card p-6 rounded-2xl border border-border/50 hover:shadow-md transition-shadow">
                <p className="text-xs text-primary font-bold mb-2">{exp.period}</p>
                <h3 className="font-bold mb-1">{exp.role}</h3>
                <p className="text-sm text-muted-foreground">{exp.org}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/about" className="inline-flex items-center text-primary font-medium hover:underline gap-1">
              Voir le parcours complet <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Newsletter */}
      <section className="py-20 bg-muted/30 border-y border-border/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Restez Informé</h2>
          <p className="text-muted-foreground mb-8 font-serif">Recevez les dernières publications sur l'agriculture, la finance agricole et la résilience climatique.</p>
          <div className="flex justify-center">
            <Newsletter />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary -z-20" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center -z-10" />
        
        <div className="max-w-4xl mx-auto px-6 text-center text-primary-foreground">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Collaborons ensemble</h2>
          <p className="text-xl opacity-90 mb-10 font-serif max-w-2xl mx-auto">
            Que ce soit pour un partenariat de recherche, du conseil en finance agricole, ou un accompagnement technique sur le terrain.
          </p>
          <Link href="/booking" className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold bg-background text-primary rounded-xl shadow-xl hover:scale-105 transition-transform gap-2">
            Prendre rendez-vous
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
