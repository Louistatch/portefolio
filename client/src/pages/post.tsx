import { SEO } from "@/components/seo";
import { usePost, useComments, useCreateComment } from "@/hooks/use-posts";
import { useRoute } from "wouter";
import { format } from "date-fns";
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
        <h1 className="text-3xl font-bold mb-4">Post not found</h1>
        <p className="text-muted-foreground">The article you're looking for doesn't exist.</p>
      </div>
    );
  }

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim() || !post) return;
    
    createComment.mutate(
      { authorName, content, postId: post.id },
      {
        onSuccess: () => {
          setAuthorName("");
          setContent("");
        }
      }
    );
  };

  return (
    <>
      <SEO title={post.title} description={post.summary || ""} type="article" />
      
      <article className="max-w-3xl mx-auto px-6 py-12 lg:py-20">
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
            <span>Louis Tatchida</span>
            <span>•</span>
            <time dateTime={post.publishedAt?.toString() || ""}>
              {post.publishedAt ? format(new Date(post.publishedAt), 'MMMM d, yyyy') : 'Unpublished'}
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

        {/* Comments Section */}
        <section className="border-t border-border/50 pt-16">
          <h3 className="text-2xl font-bold flex items-center gap-2 mb-8">
            <MessageSquare className="w-6 h-6 text-primary" />
            Discussion ({comments?.length || 0})
          </h3>

          <form onSubmit={handleComment} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm mb-12">
            <h4 className="font-medium mb-4">Leave a comment</h4>
            <div className="space-y-4">
              <Input 
                placeholder="Your Name" 
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className="bg-background"
                required
              />
              <Textarea 
                placeholder="Share your thoughts on this topic..." 
                value={content}
                onChange={e => setContent(e.target.value)}
                className="bg-background min-h-[100px]"
                required
              />
              <Button 
                type="submit" 
                disabled={createComment.isPending}
                className="w-full sm:w-auto"
              >
                {createComment.isPending ? "Posting..." : (
                  <>Post Comment <Send className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </form>

          <div className="space-y-6">
            {comments?.map(comment => (
              <div key={comment.id} className="bg-background p-6 rounded-2xl border border-border/30">
                <div className="flex justify-between items-center mb-3">
                  <strong className="font-medium">{comment.authorName}</strong>
                  <span className="text-xs text-muted-foreground">
                    {comment.createdAt ? format(new Date(comment.createdAt), 'MMM d, yyyy') : ''}
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
