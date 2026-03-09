import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/admin/file-upload";
import { Trash2, Plus, Edit, X, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Publication } from "@/hooks/use-publications";

const emptyPub = { title: "", abstract: "", pdf_url: "", citation: "", category: "Research Paper", year: new Date().getFullYear(), image_url: "" };

export default function AdminPublications() {
  const qc = useQueryClient();
  const { data: pubs, isLoading } = useQuery({
    queryKey: ["admin-pubs"],
    queryFn: async () => { const r = await fetch("/api/publications"); return r.json() as Promise<Publication[]>; },
  });
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<any>(emptyPub);

  const save = useMutation({
    mutationFn: async (d: any) => {
      const body = { ...d, image_url: d.image_url || null, pdf_url: d.pdf_url || null };
      const url = d.id ? `/api/admin/publications/${d.id}` : "/api/admin/publications";
      const res = await adminFetch(url, { method: d.id ? "PUT" : "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pubs"] }); setEditing(null); },
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await adminFetch(`/api/admin/publications/${id}`, { method: "DELETE" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pubs"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Publications</h1>
        <Button onClick={() => { setForm(emptyPub); setEditing("new"); }} className="gap-2"><Plus className="w-4 h-4" /> New</Button>
      </div>

      {editing !== null && (
        <div className="bg-card p-6 rounded-2xl border border-border/50 mb-8 space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-bold">{editing === "new" ? "New" : "Edit"} Publication</h2>
            <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
          </div>
          <Input placeholder="Title" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} />
          <Textarea placeholder="Abstract" value={form.abstract} onChange={e => setForm((f: any) => ({ ...f, abstract: e.target.value }))} className="min-h-[100px]" />
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Category" value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))} />
            <Input type="number" placeholder="Year" value={form.year} onChange={e => setForm((f: any) => ({ ...f, year: Number(e.target.value) }))} />
          </div>
          <Input placeholder="Citation" value={form.citation} onChange={e => setForm((f: any) => ({ ...f, citation: e.target.value }))} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Document (PDF, Word, Excel)</label>
              <FileUpload type="document" value={form.pdf_url} onChange={url => setForm((f: any) => ({ ...f, pdf_url: url }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cover Image</label>
              <FileUpload type="image" value={form.image_url} onChange={url => setForm((f: any) => ({ ...f, image_url: url }))} />
            </div>
          </div>

          <Button onClick={() => save.mutate(editing === "new" ? form : { ...form, id: editing })} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </Button>
          {save.isError && <p className="text-destructive text-sm">{save.error.message}</p>}
        </div>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/50"><tr>
              <th className="text-left p-4 font-medium w-16">Image</th>
              <th className="text-left p-4 font-medium">Title</th>
              <th className="text-left p-4 font-medium">Year</th>
              <th className="text-left p-4 font-medium">Category</th>
              <th className="text-left p-4 font-medium">File</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr></thead>
            <tbody>{pubs?.map(p => (
              <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30">
                <td className="p-4">
                  {(p as any).image_url ? (
                    <img src={(p as any).image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                  )}
                </td>
                <td className="p-4 font-medium">{p.title}</td>
                <td className="p-4">{p.year}</td>
                <td className="p-4">{p.category}</td>
                <td className="p-4">
                  {p.pdf_url ? (
                    <a href={p.pdf_url} target="_blank" rel="noopener" className="text-primary text-xs hover:underline">View file</a>
                  ) : <span className="text-muted-foreground text-xs">No file</span>}
                </td>
                <td className="p-4 text-right flex gap-2 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => { setForm({ ...p, image_url: (p as any).image_url || "" }); setEditing(p.id); }}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Delete?")) del.mutate(p.id); }}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
