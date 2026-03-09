import { SEO } from "@/components/seo";
import { usePosts } from "@/hooks/use-posts";
import { SearchBar } from "@/components/search";
import { Link } from "wouter";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogList() {
  const { data: posts, isLoading, error } = usePosts();

  return (
    <>
      <SEO title="Blog Scientifique" description="Articles sur l'agriculture, la finance agricole et la digitalisation rurale." path="/blog" />

      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">Blog Scientifique</h1>
            <p className="text-xl text-muted-foreground font-serif max-w-2xl">
              Analyses et réflexions sur l'agriculture durable et la technologie.
            </p>
          </div>
          <SearchBar />
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>Impossible de charger les articles.</AlertDescription>
          </Alert>
        )}

        {posts && posts.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed">
            <p className="text-muted-foreground font-serif">Aucun article pour le moment.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts?.map((post, i) => (
            <Link key={post.id} href={`/blog/${post.slug}`}
              className={`group flex flex-col bg-card rounded-3xl overflow-hidden border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 ${i === 0 ? "md:col-span-2" : ""}`}>
              {post.image_url && (
                <div className={`overflow-hidden ${i === 0 ? "h-64" : "h-48"}`}>
                  <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  {post.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs font-bold uppercase tracking-wider text-primary">{tag}</span>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {post.published_at ? format(new Date(post.published_at), "d MMM yyyy", { locale: fr }) : "Brouillon"}
                  </span>
                </div>
                <h2 className={`font-bold mb-3 group-hover:text-primary transition-colors ${i === 0 ? "text-3xl" : "text-2xl"}`}>{post.title}</h2>
                <p className="text-muted-foreground font-serif line-clamp-3 mb-6 flex-1">{post.summary}</p>
                <div className="flex items-center text-sm font-medium text-primary mt-auto">
                  Lire l'article <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
