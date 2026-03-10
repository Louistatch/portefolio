import { SEO } from "@/components/seo";
import { useQuery } from "@tanstack/react-query";
import { usePosts } from "@/hooks/use-posts";
import { usePublications } from "@/hooks/use-publications";
import { AnimatedCounter } from "@/components/animated-counter";
import { BarChart3, Eye, Heart, FileText, BookOpen, Users, MessageSquare, TrendingUp } from "lucide-react";

export default function Stats() {
  const { data: posts } = usePosts();
  const { data: publications } = usePublications();
  const { data: subCount } = useQuery<{ count: number }>({
    queryKey: ["sub-count"],
    queryFn: async () => { const r = await fetch("/api/subscribers/count"); return r.json(); },
  });

  const totalViews = (posts || []).reduce((a, p) => a + (p.views_count || 0), 0)
    + (publications || []).reduce((a, p) => a + (p.views_count || 0), 0);
  const totalLikes = (posts || []).reduce((a, p) => a + (p.likes_count || 0), 0)
    + (publications || []).reduce((a, p) => a + (p.likes_count || 0), 0);

  const topPosts = [...(posts || [])].sort((a, b) => b.views_count - a.views_count).slice(0, 5);
  const topPubs = [...(publications || [])].sort((a, b) => b.views_count - a.views_count).slice(0, 5);

  // Publications by year
  const pubsByYear: Record<number, number> = {};
  (publications || []).forEach(p => { pubsByYear[p.year] = (pubsByYear[p.year] || 0) + 1; });
  const years = Object.keys(pubsByYear).sort();

  // Posts by tag
  const tagCounts: Record<string, number> = {};
  (posts || []).forEach(p => p.tags?.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <>
      <SEO title="Statistiques" description="Statistiques publiques du site de Louis TATCHIDA : vues, publications, engagement." path="/stats" />

      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold">Statistiques</h1>
          </div>
          <p className="text-xl text-muted-foreground font-serif mt-4">
            Transparence totale sur l'activité et l'engagement du site.
          </p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { icon: Eye, label: "Vues totales", value: totalViews, color: "text-blue-500" },
            { icon: Heart, label: "Likes totaux", value: totalLikes, color: "text-rose-500" },
            { icon: FileText, label: "Articles publiés", value: posts?.length || 0, color: "text-emerald-500" },
            { icon: BookOpen, label: "Publications", value: publications?.length || 0, color: "text-amber-500" },
          ].map((m, i) => (
            <div key={i} className="bg-card p-6 rounded-2xl border border-border/50 text-center">
              <m.icon className={`w-6 h-6 ${m.color} mx-auto mb-2`} />
              <p className="text-3xl font-bold"><AnimatedCounter end={m.value} /></p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Top articles */}
          <div className="bg-card p-6 rounded-2xl border border-border/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Articles les plus lus
            </h3>
            <div className="space-y-3">
              {topPosts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.views_count} vues · {p.likes_count} likes</p>
                  </div>
                </div>
              ))}
              {topPosts.length === 0 && <p className="text-sm text-muted-foreground">Aucun article encore.</p>}
            </div>
          </div>

          {/* Top publications */}
          <div className="bg-card p-6 rounded-2xl border border-border/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Publications les plus consultées
            </h3>
            <div className="space-y-3">
              {topPubs.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.views_count} vues · {p.likes_count} likes</p>
                  </div>
                </div>
              ))}
              {topPubs.length === 0 && <p className="text-sm text-muted-foreground">Aucune publication encore.</p>}
            </div>
          </div>
        </div>

        {/* Publications by year */}
        {years.length > 0 && (
          <div className="bg-card p-6 rounded-2xl border border-border/50 mb-16">
            <h3 className="font-bold text-lg mb-6">Publications par année</h3>
            <div className="flex items-end gap-4 h-40">
              {years.map(y => {
                const count = pubsByYear[Number(y)];
                const maxCount = Math.max(...Object.values(pubsByYear));
                const height = (count / maxCount) * 100;
                return (
                  <div key={y} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold">{count}</span>
                    <div className="w-full bg-primary/20 rounded-t-lg relative" style={{ height: `${height}%` }}>
                      <div className="absolute inset-0 bg-primary rounded-t-lg" />
                    </div>
                    <span className="text-xs text-muted-foreground">{y}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags cloud */}
        {topTags.length > 0 && (
          <div className="bg-card p-6 rounded-2xl border border-border/50 mb-16">
            <h3 className="font-bold text-lg mb-4">Thématiques populaires</h3>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count]) => (
                <span key={tag} className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {tag} <span className="text-primary/50 ml-1">({count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Community */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-8 rounded-3xl border border-primary/20 text-center">
          <Users className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-3xl font-bold mb-1"><AnimatedCounter end={subCount?.count || 0} /></p>
          <p className="text-muted-foreground">abonnés à la newsletter</p>
        </div>
      </div>
    </>
  );
}
