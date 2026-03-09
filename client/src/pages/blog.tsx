import { SEO } from "@/components/seo";
import { usePosts } from "@/hooks/use-posts";
import { Link } from "wouter";
import { format } from "date-fns";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogList() {
  const { data: posts, isLoading, error } = usePosts();

  return (
    <>
      <SEO title="Scientific Blog" description="Articles and essays on AI, climate, and agriculture." />
      
      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <h1 className="text-4xl lg:text-5xl font-bold mb-6">Scientific Blog</h1>
        <p className="text-xl text-muted-foreground font-serif mb-12 max-w-2xl">
          Thoughts, analyses, and deep-dives into recent developments in agricultural technology and climate finance.
        </p>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load posts. Please try again later.</AlertDescription>
          </Alert>
        )}

        {posts && posts.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
            <p className="text-muted-foreground font-serif">No posts published yet. Check back soon.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts?.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col bg-card rounded-3xl overflow-hidden border border-border/50 hover-elevate">
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  {post.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs font-bold uppercase tracking-wider text-primary">
                      {tag}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : 'Draft'}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                
                <p className="text-muted-foreground font-serif line-clamp-3 mb-6 flex-1">
                  {post.summary}
                </p>
                
                <div className="flex items-center text-sm font-medium text-primary mt-auto">
                  Read article <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
