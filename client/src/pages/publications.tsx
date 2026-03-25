import { SEO } from "@/components/seo";
import { usePublications } from "@/hooks/use-publications";
import { BookOpen, FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialShare } from "@/components/social-share";
import { Reactions } from "@/components/reactions";
import { CitationButton } from "@/components/citation-button";
import { useEffect } from "react";

export default function Publications() {
  const { data: publications, isLoading } = usePublications();
  const categories = publications ? Array.from(new Set(publications.map(p => p.category))) : [];

  // Track views for all publications on page load
  useEffect(() => {
    if (!publications) return;
    publications.forEach(pub => {
      const key = `viewed_pub_${pub.id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      fetch(`/api/publications/${pub.id}/view`, { method: "POST" }).catch(() => {});
    });
  }, [publications]);

  return (
    <>
      <SEO title="Publications Scientifiques" description="Articles scientifiques, pensées et communications de recherche de Louis TATCHIDA sur l'agriculture durable en Afrique de l'Ouest." path="/publications" />

      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold">Publications</h1>
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl font-serif mt-4">
            Articles scientifiques, pensées et communications de recherche. Ces contenus sont des publications personnelles dont le contenu n'engage que l'auteur.
          </p>
          <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> {publications?.length || 0} publications</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
          </div>
        ) : publications?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-serif">La bibliothèque est en cours de mise à jour.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {categories.map(category => (
              <div key={category}>
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 border-b border-border/50 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  {category}
                </h2>
                <div className="space-y-6">
                  {publications?.filter(p => p.category === category).map(pub => (
                    <div key={pub.id} className="bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                      <div className="flex flex-col lg:flex-row">
                        {pub.image_url && (
                          <div className="lg:w-56 h-48 lg:h-auto shrink-0 overflow-hidden">
                            <img src={pub.image_url} alt={pub.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                        )}
                        <div className="p-6 lg:p-8 flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{pub.year}</span>
                            <Reactions type="publication" id={pub.id} likesCount={pub.likes_count} viewsCount={pub.views_count} />
                          </div>
                          <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{pub.title}</h3>
                          <p className="text-sm text-muted-foreground font-serif leading-relaxed mb-4 line-clamp-3">{pub.abstract}</p>

                          {pub.citation && (
                            <div className="bg-muted/50 p-4 rounded-xl border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto mb-4">
                              {pub.citation}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3">
                            {pub.pdf_url && (
                              <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full" variant="secondary" onClick={() => window.open(pub.pdf_url, "_blank")}>
                                <Download className="w-4 h-4 mr-2" /> Télécharger PDF
                              </Button>
                            )}
                            {pub.citation && (
                              <CitationButton title={pub.title} url={`/api/og/publication/${pub.id}`} year={pub.year} />
                            )}
                            <SocialShare
                              url={`/api/og/publication/${pub.id}`}
                              title={`${pub.title} — Louis TATCHIDA`}
                              description={pub.abstract?.slice(0, 120)}
                              image={pub.image_url || undefined}
                            />
                          </div>
                        </div>
                      </div>
                      <script type="application/ld+json">
                        {JSON.stringify({
                          "@context": "https://schema.org",
                          "@type": "ScholarlyArticle",
                          "name": pub.title,
                          "abstract": pub.abstract,
                          "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/api/og/publication/${pub.id}`,
                          "datePublished": pub.year.toString(),
                          "keywords": pub.category,
                          "author": { "@type": "Person", "name": "Louis TATCHIDA" },
                          "publisher": { "@type": "Person", "name": "Louis TATCHIDA" },
                          "pdf": pub.pdf_url
                        })}
                      </script>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
