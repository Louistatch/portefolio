import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/admin/file-upload";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

interface ProfileData {
  full_name: string; title: string; bio: string; photo_url: string; cv_pdf_url: string;
  email: string; phone: string; location: string; linkedin: string; researchgate: string; orcid: string;
  education: { degree: string; institution: string; year: string; description?: string }[];
  experience: { role: string; organization: string; period: string; description?: string }[];
  skills: string[];
  awards: { title: string; year?: string; description?: string }[];
  languages: string[];
  certifications: { title: string; year?: string; issuer?: string }[];
}

const EMPTY: ProfileData = {
  full_name: "", title: "", bio: "", photo_url: "", cv_pdf_url: "",
  email: "", phone: "", location: "", linkedin: "", researchgate: "", orcid: "",
  education: [], experience: [], skills: [], awards: [], languages: [], certifications: [],
};

export default function AdminProfile() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileData>(EMPTY);
  const [newSkill, setNewSkill] = useState("");
  const [newLang, setNewLang] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => { const r = await adminFetch("/api/admin/profile"); return r.json(); },
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await adminFetch("/api/admin/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-profile"] }); toast({ title: "Profile saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (key: keyof ProfileData, val: any) => setForm(p => ({ ...p, [key]: val }));

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Profile / CV</h1>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save
        </Button>
      </div>

      <div className="space-y-8">
        {/* Basic Info */}
        <Section title="Basic Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" value={form.full_name} onChange={v => set("full_name", v)} />
            <Field label="Title / Position" value={form.title} onChange={v => set("title", v)} />
            <Field label="Email" value={form.email} onChange={v => set("email", v)} />
            <Field label="Phone" value={form.phone} onChange={v => set("phone", v)} />
            <Field label="Location" value={form.location} onChange={v => set("location", v)} />
            <Field label="LinkedIn URL" value={form.linkedin} onChange={v => set("linkedin", v)} />
            <Field label="ResearchGate URL" value={form.researchgate} onChange={v => set("researchgate", v)} />
            <Field label="ORCID" value={form.orcid} onChange={v => set("orcid", v)} />
          </div>
          <div className="mt-4">
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={e => set("bio", e.target.value)} rows={5} className="mt-1" />
          </div>
        </Section>

        {/* Photo & CV */}
        <Section title="Photo & CV">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Profile Photo</Label>
              <FileUpload type="image" value={form.photo_url} onChange={v => set("photo_url", v)} />
            </div>
            <div>
              <Label className="mb-2 block">CV (PDF)</Label>
              <FileUpload type="document" value={form.cv_pdf_url} onChange={v => set("cv_pdf_url", v)} />
            </div>
          </div>
        </Section>

        {/* Education */}
        <Section title="Education">
          {form.education.map((edu, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-3 p-3 bg-muted/30 rounded-xl">
              <div><Label>Degree</Label><Input value={edu.degree} onChange={e => { const arr = [...form.education]; arr[i] = { ...arr[i], degree: e.target.value }; set("education", arr); }} /></div>
              <div><Label>Institution</Label><Input value={edu.institution} onChange={e => { const arr = [...form.education]; arr[i] = { ...arr[i], institution: e.target.value }; set("education", arr); }} /></div>
              <div><Label>Year</Label><Input value={edu.year} onChange={e => { const arr = [...form.education]; arr[i] = { ...arr[i], year: e.target.value }; set("education", arr); }} /></div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => set("education", form.education.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set("education", [...form.education, { degree: "", institution: "", year: "" }])}><Plus className="w-4 h-4 mr-1" /> Add Education</Button>
        </Section>

        {/* Experience */}
        <Section title="Experience">
          {form.experience.map((exp, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-3 p-3 bg-muted/30 rounded-xl">
              <div><Label>Role</Label><Input value={exp.role} onChange={e => { const arr = [...form.experience]; arr[i] = { ...arr[i], role: e.target.value }; set("experience", arr); }} /></div>
              <div><Label>Organization</Label><Input value={exp.organization} onChange={e => { const arr = [...form.experience]; arr[i] = { ...arr[i], organization: e.target.value }; set("experience", arr); }} /></div>
              <div><Label>Period</Label><Input value={exp.period} onChange={e => { const arr = [...form.experience]; arr[i] = { ...arr[i], period: e.target.value }; set("experience", arr); }} /></div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => set("experience", form.experience.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set("experience", [...form.experience, { role: "", organization: "", period: "" }])}><Plus className="w-4 h-4 mr-1" /> Add Experience</Button>
        </Section>

        {/* Skills */}
        <Section title="Skills">
          <div className="flex flex-wrap gap-2 mb-3">
            {form.skills.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {s} <button onClick={() => set("skills", form.skills.filter((_, j) => j !== i))} className="hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="New skill" onKeyDown={e => { if (e.key === "Enter" && newSkill.trim()) { set("skills", [...form.skills, newSkill.trim()]); setNewSkill(""); } }} />
            <Button variant="outline" size="sm" onClick={() => { if (newSkill.trim()) { set("skills", [...form.skills, newSkill.trim()]); setNewSkill(""); } }}><Plus className="w-4 h-4" /></Button>
          </div>
        </Section>

        {/* Awards */}
        <Section title="Awards & Honors">
          {form.awards.map((a, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-3 p-3 bg-muted/30 rounded-xl">
              <div><Label>Title</Label><Input value={a.title} onChange={e => { const arr = [...form.awards]; arr[i] = { ...arr[i], title: e.target.value }; set("awards", arr); }} /></div>
              <div><Label>Year</Label><Input value={a.year || ""} onChange={e => { const arr = [...form.awards]; arr[i] = { ...arr[i], year: e.target.value }; set("awards", arr); }} /></div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => set("awards", form.awards.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set("awards", [...form.awards, { title: "", year: "" }])}><Plus className="w-4 h-4 mr-1" /> Add Award</Button>
        </Section>

        {/* Languages */}
        <Section title="Languages">
          <div className="flex flex-wrap gap-2 mb-3">
            {form.languages.map((l, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-sm">
                {l} <button onClick={() => set("languages", form.languages.filter((_, j) => j !== i))} className="hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="New language" onKeyDown={e => { if (e.key === "Enter" && newLang.trim()) { set("languages", [...form.languages, newLang.trim()]); setNewLang(""); } }} />
            <Button variant="outline" size="sm" onClick={() => { if (newLang.trim()) { set("languages", [...form.languages, newLang.trim()]); setNewLang(""); } }}><Plus className="w-4 h-4" /></Button>
          </div>
        </Section>

        {/* Certifications */}
        <Section title="Certifications">
          {form.certifications.map((c, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-3 p-3 bg-muted/30 rounded-xl">
              <div><Label>Title</Label><Input value={c.title} onChange={e => { const arr = [...form.certifications]; arr[i] = { ...arr[i], title: e.target.value }; set("certifications", arr); }} /></div>
              <div><Label>Year</Label><Input value={c.year || ""} onChange={e => { const arr = [...form.certifications]; arr[i] = { ...arr[i], year: e.target.value }; set("certifications", arr); }} /></div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => set("certifications", form.certifications.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set("certifications", [...form.certifications, { title: "", year: "" }])}><Plus className="w-4 h-4 mr-1" /> Add Certification</Button>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border/50">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value || ""} onChange={e => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
