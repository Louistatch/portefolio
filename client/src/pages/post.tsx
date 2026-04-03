import { SEO } from "@/components/seo";
import { usePost, useComments, useCreateComment } from "@/hooks/use-posts";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Loader2, MessageSquare, Send, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ReadingProgress, estimateReadingTime } from "@/components/reading-progress";
import { SocialShare } from "@/components/social-share";
import { Reactions } from "@/components/reactions";
import { TableOfContents } from "@/components/table-of-contents";
import { RelatedPosts } from "@/components/related-posts";
import { CitationButton } from "@/components/citation-button";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  const { data: post, isLoading } = usePost(slug);
  const { data: comments } = useComments(post?.id);
  const createComment = useCreateComment(post?.id || 0);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  // Track view once
  useEffect(() => {
    if (!post?.id) return;
    const key = `viewed_post_${post.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/posts/${post.id}/view`, { method: "POST" }).catch(() => {});
  }, [post?.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-32 text-center">
        <h1 className="text-3xl font-bold mb-4">Article introuvable</h1>
        <p className="text-muted-foreground">L'article que vous cherchez n'existe pas.</p>
      </div>
    );
  }

  const readingTime = estimateReadingTime(post.content);

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;
    createComment.mutate(
      { author_name: authorName, content },
      {
        onSuccess: () => {
          setAuthorName("");
          setContent("");
          toast({
            title: "Commentaire publié",
            description: "Votre commentaire est maintenant visible. Merci de votre contribution !",
          });
        },
        onError: (err) => {
          toast({
            title: "Erreur",
            description: err.message || "Impossible d'envoyer le commentaire.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <>
      <ReadingProgress />
      <SEO
        title={post.title}
        description={post.summary || ""}
        type="article"
        path={`/blog/${post.slug}`}
        image={post.image_url || undefined}
        article={{ publishedTime: post.published_at || undefined, modifiedTime: post.modified_at || undefined, tags: post.tags || undefined, author: "Louis TATCHIDA", content: post.content }}
      />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Accueil",
              "item": typeof window !== 'undefined' ? window.location.origin : ''
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Blog",
              "item": `${typeof window !== 'undefined' ? window.location.origin : ''}/blog`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": post.title,
              "item": `${typeof window !== 'undefined' ? window.location.origin : ''}/blog/${post.slug}`
            }
          ]
        })}
      </script>

      <article className="max-w-3xl mx-auto px-6 py-12 lg:py-20">
        {/* Cover image */}
        {post.image_url && (
          <div className="rounded-3xl overflow-hidden mb-10 shadow-xl border border-border/50">
            <img src={post.image_url} alt={post.title} className="w-full h-64 lg:h-96 object-cover" />
          </div>
        )}

        {/* Header */}
        <header className="mb-12 text-center">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {post.tags?.map(tag => (
              <span key={tag} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.15]">
            {post.title}
          </h1>
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
            <span>Louis TATCHIDA</span>
            <span>·</span>
            <time dateTime={post.published_at || ""}>
              {post.published_at ? format(new Date(post.published_at), "d MMMM yyyy", { locale: fr }) : "Non publié"}
            </time>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {readingTime} min de lecture</span>
          </div>
        </header>

        {/* Floating action bar */}
        <div className="flex items-center justify-between mb-12 py-4 px-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm sticky top-2 z-40">
          <Reactions type="post" id={post.id} likesCount={post.likes_count} viewsCount={post.views_count} />
          <div className="flex items-center gap-2">
            <CitationButton title={post.title} url={`/api/og/blog/${post.slug}`} year={post.published_at ? new Date(post.published_at).getFullYear() : undefined} />
            <SocialShare url={`/api/og/blog/${post.slug}`} title={post.title} description={post.summary || ""} image={post.image_url || undefined} />
          </div>
        </div>

        {/* Article body */}
        <div className="prose prose-lg dark:prose-invert max-w-none font-serif article-body mb-16">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h2: ({node, children, ...props}) => {
                const text = String(children);
                const lines = post.content.split("\n");
                const idx = lines.findIndex(l => l.match(/^##\s+/) && l.includes(text));
                return <h2 id={`heading-${idx}`} className="font-sans font-bold mt-12 mb-6" {...props}>{children}</h2>;
              },
              h3: ({node, children, ...props}) => {
                const text = String(children);
                const lines = post.content.split("\n");
                const idx = lines.findIndex(l => l.match(/^###\s+/) && l.includes(text));
                return <h3 id={`heading-${idx}`} className="font-sans font-bold mt-8 mb-4" {...props}>{children}</h3>;
              },
              a: ({node, ...props}) => <a className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-6 italic text-muted-foreground my-8" {...props} />
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Table of Contents (floating) */}
        <TableOfContents content={post.content} />

        {/* Bottom share + reactions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-8 px-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-3xl border border-primary/20 mb-16">
          <div className="text-center sm:text-left">
            <p className="font-bold text-lg mb-1">Cet article vous a plu ?</p>
            <p className="text-sm text-muted-foreground">Partagez-le avec votre réseau professionnel</p>
          </div>
          <div className="flex items-center gap-4">
            <Reactions type="post" id={post.id} likesCount={post.likes_count} viewsCount={post.views_count} />
            <SocialShare url={`/api/og/blog/${post.slug}`} title={post.title} description={post.summary || ""} image={post.image_url || undefined} />
          </div>
        </div>

        {/* Related posts */}
        <RelatedPosts currentSlug={post.slug} tags={post.tags} />

        {/* Comments section */}
        <section className="border-t border-border/50 pt-16">
          <h3 className="text-2xl font-bold flex items-center gap-2 mb-8">
            <MessageSquare className="w-6 h-6 text-primary" />
            Commentaires ({comments?.length || 0})
          </h3>

          <form onSubmit={handleComment} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm mb-12">
            <h4 className="font-medium mb-4">Laisser un commentaire</h4>
            <div className="space-y-4">
              <Input placeholder="Votre nom" value={authorName} onChange={e => setAuthorName(e.target.value)} className="bg-background" required />
              <Textarea placeholder="Partagez votre avis sur cet article..." value={content} onChange={e => setContent(e.target.value)} className="bg-background min-h-[100px]" required />
              <Button type="submit" disabled={createComment.isPending} className="w-full sm:w-auto">
                {createComment.isPending ? "Envoi..." : (<>Publier <Send className="w-4 h-4 ml-2" /></>)}
              </Button>
            </div>
          </form>

          <div className="space-y-6">
            {comments?.length === 0 && (
              <p className="text-center text-muted-foreground py-8 font-serif">Soyez le premier à commenter cet article.</p>
            )}
            {comments?.map(comment => (
              <div key={comment.id} className="bg-background p-6 rounded-2xl border border-border/30">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </div>
                    <strong className="font-medium">{comment.author_name}</strong>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {comment.created_at ? format(new Date(comment.created_at), "d MMM yyyy", { locale: fr }) : ""}
                  </span>
                </div>
                <p className="text-muted-foreground font-serif text-sm leading-relaxed whitespace-pre-wrap pl-11">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </>
  );
}
