import { Link } from "wouter";
import { usePosts, Post } from "@/hooks/use-posts";
import { ArrowRight, Clock } from "lucide-react";
import { estimateReadingTime } from "@/components/reading-progress";

interface RelatedPostsProps {
  currentSlug: string;
  tags?: string[] | null;
}

export function RelatedPosts({ currentSlug, tags }: RelatedPostsProps) {
  const { data: allPosts } = usePosts();
  if (!allPosts || allPosts.length < 2) return null;

  // Score posts by tag overlap
  const scored = allPosts
    .filter(p => p.slug !== currentSlug)
    .map(p => {
      let score = 0;
      if (tags && p.tags) {
        score = p.tags.filter(t => tags.includes(t)).length * 3;
      }
      score += (p.views_count || 0) * 0.01;
      score += (p.likes_count || 0) * 0.1;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) return null;

  return (
    <section className="border-t border-border/50 pt-16 mt-16">
      <h3 className="text-2xl font-bold mb-8">Articles similaires</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scored.map(post => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all">
            {post.image_url && (
              <div className="h-36 overflow-hidden">
                <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                {post.tags?.slice(0, 2).map(t => (
                  <span key={t} className="text-[10px] font-bold uppercase tracking-wider text-primary">{t}</span>
                ))}
              </div>
              <h4 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {estimateReadingTime(post.content)} min</span>
                <span className="flex items-center gap-1 text-primary font-medium">Lire <ArrowRight className="w-3 h-3" /></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
