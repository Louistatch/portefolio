import { Link } from "wouter";
import { ArrowRight, BookOpen, Leaf, LineChart, Cpu, Droplets, ShieldCheck, Users, TrendingUp, Eye, Heart, Clock } from "lucide-react";
import { SEO } from "@/components/seo";
import { Newsletter, NewsletterHero } from "@/components/newsletter";
import { useQuery } from "@tanstack/react-query";
import { AnimatedCounter } from "@/components/animated-counter";
import { Testimonials } from "@/components/testimonials";
import { SearchBar } from "@/components/search";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { estimateReadingTime } from "@/components/reading-progress";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  full_name: string; title: string; bio: string; photo_url: string;
}

export default function Home() {
  const { data: profile } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => { const r = await fetch("/api/profile"); return r.json(); },
  });

  const { data: posts, isLoading } = useQuery<any[]>({
    queryKey: ["posts"],
    queryFn: async () => { const r = await fetch("/api/posts"); return r.json(); },
  });

  return (
    <>
      <SEO title="Accueil" description="Louis TATCHIDA - Agronome & Expert en Finance Agricole, Résilience Climatique et Digitalisation Agricole en Afrique de l'Ouest." path="/" />

      {/* Hero compact */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20 flex flex-col md:flex-row items-center gap-8">
          <img
            src={profile?.photo_url || "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=1000"}
            alt={profile?.full_name || "Louis TATCHIDA"}
            className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-primary/20 shadow-xl"
          />
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center rounded-full px-3 py-1 border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-3">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Disponible pour consulting
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
              {profile?.full_name || "Louis TATCHIDA"}
            </h1>
            <p className="text-lg text-muted-foreground font-serif mb-4 max-w-2xl">
              Agronome & Expert Finance Agricole · +11 ans en résilience climatique et digitalisation agricole en Afrique de l'Ouest.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/about" className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Mon parcours
              </Link>
              <Link href="/publications" className="inline-flex items-center px-5 py-2.5 text-sm font-medium border border-border bg-background hover:bg-muted text-foreground rounded-xl hover:-translate-y-0.5 transition-all">
                Publications
              </Link>
              <Link href="/booking" className="inline-flex items-center px-5 py-2.5 text-sm font-medium border border-border bg-background hover:bg-muted text-foreground rounded-xl hover:-translate-y-0.5 transition-all">
                Rendez-vous
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Chiffres clés — compact */}
      <section className="py-8 border-y border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: 11, suffix: "+", label: "Années d'expérience", icon: TrendingUp },
              { value: 3000, suffix: "+", label: "Agriculteurs accompagnés", icon: Users },
              { value: 200, suffix: "+", label: "Coopératives structurées", icon: ShieldCheck },
              { value: 500, suffix: "M+", label: "FCFA mobilisés", icon: LineChart },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <p className="text-2xl lg:text-3xl font-bold text-foreground">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BLOG — Section principale ═══ */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-2">Derniers Articles</h2>
              <p className="text-muted-foreground font-serif">Analyses et réflexions sur l'agriculture durable, la finance agricole et la digitalisation rurale.</p>
            </div>
            <SearchBar />
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          )}

          {posts && posts.length === 0 && (
            <div className="text-center py-16 bg-card rounded-3xl border border-dashed">
              <p className="text-muted-foreground font-serif">Aucun article pour le moment.</p>
            </div>
          )}

          {posts && posts.length > 0 && (
            <>
              {/* Featured post */}
              <Link href={`/blog/${posts[0].slug}`}
                className="group flex flex-col lg:flex-row bg-card rounded-3xl overflow-hidden border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 mb-8">
                {posts[0].image_url && (
                  <div className="lg:w-1/2 h-64 lg:h-auto overflow-hidden relative">
                    <img src={posts[0].image_url} alt={posts[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-3 text-white/90 text-xs">
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {posts[0].views_count}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {posts[0].likes_count}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {estimateReadingTime(posts[0].content)} min</span>
                    </div>
                  </div>
                )}
                <div className="p-8 lg:w-1/2 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    {posts[0].tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-xs font-bold uppercase tracking-wider text-primary">{tag}</span>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {posts[0].published_at ? format(new Date(posts[0].published_at), "d MMM yyyy", { locale: fr }) : ""}
                    </span>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">{posts[0].title}</h3>
                  <p className="text-muted-foreground font-serif line-clamp-3 mb-6">{posts[0].summary}</p>
                  <div className="flex items-center text-sm font-medium text-primary">
                    Lire l'article <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Other posts grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(1, 7).map((post: any) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}
                    className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    {post.image_url && (
                      <div className="h-44 overflow-hidden relative">
                        <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white/90 text-xs">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views_count}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes_count}</span>
                        </div>
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        {post.tags?.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-xs font-bold uppercase tracking-wider text-primary">{tag}</span>
                        ))}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {post.published_at ? format(new Date(post.published_at), "d MMM yyyy", { locale: fr }) : ""}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                      <p className="text-sm text-muted-foreground font-serif line-clamp-2 mb-4 flex-1">{post.summary}</p>
                      <div className="flex items-center text-sm font-medium text-primary">
                        Lire <ArrowRight className="ml-1 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {posts.length > 7 && (
                <div className="text-center mt-8">
                  <Link href="/blog" className="inline-flex items-center px-6 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all gap-2">
                    Voir tous les articles <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Expertise — compact */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">Domaines d'Expertise</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: LineChart, title: "Finance Agricole", desc: "Mobilisation de fonds, structuration de coopératives, assurance indicielle." },
              { icon: Droplets, title: "Résilience Climatique", desc: "Diagnostic hydrologique, irrigation raisonnée, techniques climato-intelligentes." },
              { icon: Cpu, title: "Digitalisation & S&E", desc: "QGIS, KoBoToolbox, Python, suivi-évaluation numérique." },
              { icon: Leaf, title: "Agronomie Durable", desc: "Chaînes de valeur, agroécologie, maraîchage biologique." }
            ].map((area, i) => (
              <div key={i} className="bg-card p-5 rounded-xl border border-border/50 hover:shadow-md hover:border-primary/30 transition-all group">
                <area.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-sm mb-1">{area.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{area.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* Newsletter */}
      <NewsletterHero />

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary -z-20" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center -z-10" />
        <div className="max-w-4xl mx-auto px-6 text-center text-primary-foreground">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Collaborons ensemble</h2>
          <p className="text-lg opacity-90 mb-8 font-serif max-w-2xl mx-auto">
            Partenariat de recherche, conseil en finance agricole, ou accompagnement technique sur le terrain.
          </p>
          <Link href="/booking" className="inline-flex items-center px-8 py-4 text-sm font-bold bg-background text-primary rounded-xl shadow-xl hover:scale-105 transition-transform gap-2">
            Prendre rendez-vous <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
