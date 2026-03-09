import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/admin/file-upload";
import { Trash2, Plus, Edit, X, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Post } from "@/hooks/use-posts";

function usePosts() {
  return useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => { const r = await fetch("/api/posts"); return r.json() as Promise<Post[]>; },
  });
}

const emptyPost = { title: "", slug: "", content: "", summary: "", tags: "", image_url: "" };

export default function AdminPosts() {
  const { data: posts, isLoading } = usePosts();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(emptyPost);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: number }) => {
      const body = { ...data, tags: data.tags.split(",").map(t => t.trim()).filter(Boolean), image_url: data.image_url || null };
      const url = data.id ? `/api/admin/posts/${data.id}` : "/api/admin/posts";
      const res = await adminFetch(url, { method: data.id ? "PUT" : "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-posts"] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await adminFetch(`/api/admin/posts/${id}`, { method: "DELETE" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-posts"] }),
  });

  const startEdit = (post: Post) => {
    setForm({ title: post.title, slug: post.slug, content: post.content, summary: post.summary || "", tags: (post.tags || []).join(", "), image_url: (post as any).image_url || "" });
    setEditing(post.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Posts</h1>
        <Button onClick={() => { setForm(emptyPost); setEditing("new"); }} className="gap-2"><Plus className="w-4 h-4" /> New Post</Button>
      </div>

      {editing !== null && (
        <div className="bg-card p-6 rounded-2xl border border-border/50 mb-8 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{editing === "new" ? "New Post" : "Edit Post"}</h2>
            <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }))} /></div>
            <div><label className="text-sm font-medium mb-1 block">Slug</label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></div>
          </div>
          <div><label className="text-sm font-medium mb-1 block">Summary</label>
            <Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} /></div>
          <div><label className="text-sm font-medium mb-1 block">Tags (comma separated)</label>
            <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="AI, Agriculture, Climate" /></div>
          <div><label className="text-sm font-medium mb-1 block">Cover Image</label>
            <FileUpload type="image" value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} /></div>
          <div><label className="text-sm font-medium mb-1 block">Content (Markdown)</label>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="min-h-[300px] font-mono text-sm" /></div>
          <Button onClick={() => saveMutation.mutate(editing === "new" ? form : { ...form, id: editing as number })} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </Button>
          {saveMutation.isError && <p className="text-destructive text-sm">{saveMutation.error.message}</p>}
        </div>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="text-left p-4 font-medium w-16">Image</th>
                <th className="text-left p-4 font-medium">Title</th>
                <th className="text-left p-4 font-medium">Slug</th>
                <th className="text-left p-4 font-medium">Tags</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts?.map(post => (
                <tr key={post.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="p-4">
                    {(post as any).image_url ? (
                      <img src={(post as any).image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg" />
                    )}
                  </td>
                  <td className="p-4 font-medium">{post.title}</td>
                  <td className="p-4 text-muted-foreground">{post.slug}</td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {post.tags?.map(t => <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{t}</span>)}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(post)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(post.id); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
