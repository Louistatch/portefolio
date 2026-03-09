import { SEO } from "@/components/seo";
import { usePost, useComments, useCreateComment } from "@/hooks/use-posts";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  const { data: post, isLoading } = usePost(slug);
  const { data: comments } = useComments(post?.id);
  const createComment = useCreateComment(post?.id || 0);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");

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

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;
    createComment.mutate(
      { author_name: authorName, content },
      { onSuccess: () => { setAuthorName(""); setContent(""); } }
    );
  };

  return (
    <>
      <SEO
        title={post.title}
        description={post.summary || ""}
        type="article"
        path={`/blog/${post.slug}`}
        article={{ publishedTime: post.published_at || undefined, tags: post.tags || undefined }}
      />

      <article className="max-w-3xl mx-auto px-6 py-12 lg:py-20">
        {post.image_url && (
          <div className="rounded-3xl overflow-hidden mb-10 shadow-xl border border-border/50">
            <img src={post.image_url} alt={post.title} className="w-full h-64 lg:h-80 object-cover" />
          </div>
        )}

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
          <div className="text-muted-foreground flex items-center justify-center gap-4 text-sm font-medium">
            <span>Louis TATCHIDA</span>
            <span>·</span>
            <time dateTime={post.published_at || ""}>
              {post.published_at ? format(new Date(post.published_at), "d MMMM yyyy", { locale: fr }) : "Non publié"}
            </time>
          </div>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none font-serif article-body mb-20">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h2: ({node, ...props}) => <h2 className="font-sans font-bold mt-12 mb-6" {...props} />,
              h3: ({node, ...props}) => <h3 className="font-sans font-bold mt-8 mb-4" {...props} />,
              a: ({node, ...props}) => <a className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-6 italic text-muted-foreground my-8" {...props} />
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        <section className="border-t border-border/50 pt-16">
          <h3 className="text-2xl font-bold flex items-center gap-2 mb-8">
            <MessageSquare className="w-6 h-6 text-primary" />
            Commentaires ({comments?.length || 0})
          </h3>

          <form onSubmit={handleComment} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm mb-12">
            <h4 className="font-medium mb-4">Laisser un commentaire</h4>
            <div className="space-y-4">
              <Input placeholder="Votre nom" value={authorName} onChange={e => setAuthorName(e.target.value)} className="bg-background" required />
              <Textarea placeholder="Partagez votre avis..." value={content} onChange={e => setContent(e.target.value)} className="bg-background min-h-[100px]" required />
              <Button type="submit" disabled={createComment.isPending} className="w-full sm:w-auto">
                {createComment.isPending ? "Envoi..." : (<>Publier <Send className="w-4 h-4 ml-2" /></>)}
              </Button>
            </div>
          </form>

          <div className="space-y-6">
            {comments?.map(comment => (
              <div key={comment.id} className="bg-background p-6 rounded-2xl border border-border/30">
                <div className="flex justify-between items-center mb-3">
                  <strong className="font-medium">{comment.author_name}</strong>
                  <span className="text-xs text-muted-foreground">
                    {comment.created_at ? format(new Date(comment.created_at), "d MMM yyyy", { locale: fr }) : ""}
                  </span>
                </div>
                <p className="text-muted-foreground font-serif text-sm leading-relaxed whitespace-pre-wrap">
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
