import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, GraduationCap, Award, BookOpen, Loader2, X, Trophy, CheckCircle2,
  Clock, TrendingUp, Search, ShieldCheck, ShieldAlert, Mail, MoreVertical,
  UserCheck, RotateCcw, Trash2, Ban, Download, Sparkles, Filter, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

type Student = {
  id: number; full_name: string; email: string; phone?: string; country?: string;
  organization?: string; entry_score?: number; status: string; created_at: string;
  email_verified?: boolean; admitted_at?: string; admission_expires?: string;
  final_certificate_no?: string; test_attempts?: number; last_login?: string;
};

export default function AdminStudents() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admitted" | "pending" | "unverified" | "certified">("all");
  const [menuId, setMenuId] = useState<number | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["academy-stats"],
    queryFn: async () => (await adminFetch("/api/admin/academy/stats")).json(),
  });
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ["academy-students"],
    queryFn: async () => (await adminFetch("/api/admin/academy/students")).json(),
  });
  const { data: detail } = useQuery({
    queryKey: ["academy-student", selectedId],
    queryFn: async () => (await adminFetch(`/api/admin/academy/students/${selectedId}`)).json(),
    enabled: selectedId !== null,
  });

  const action = useMutation({
    mutationFn: async ({ id, act }: { id: number; act: string }) =>
      adminFetch(`/api/admin/academy/students/${id}/action`, { method: "POST", body: JSON.stringify({ action: act }) }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["academy-students"] });
      qc.invalidateQueries({ queryKey: ["academy-student", selectedId] });
      const labels: Record<string, string> = { verify_email: "Email vérifié", admit: "Étudiant admis", reset_test: "Test réinitialisé", revoke_admission: "Admission révoquée", delete: "Étudiant supprimé" };
      toast({ title: labels[v.act] || "Action effectuée" });
      setMenuId(null);
      if (v.act === "delete") setSelectedId(null);
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    let list = students || [];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(st => st.full_name?.toLowerCase().includes(s) || st.email?.toLowerCase().includes(s) || st.organization?.toLowerCase().includes(s));
    }
    if (filter === "admitted") list = list.filter(st => st.admitted_at);
    else if (filter === "pending") list = list.filter(st => !st.admitted_at);
    else if (filter === "unverified") list = list.filter(st => st.email_verified === false);
    else if (filter === "certified") list = list.filter(st => st.final_certificate_no);
    return list;
  }, [students, search, filter]);

  if (isLoading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const total = students?.length || 0;
  const admittedCount = students?.filter(s => s.admitted_at).length || 0;
  const certifiedCount = students?.filter(s => s.final_certificate_no).length || 0;
  const unverifiedCount = students?.filter(s => s.email_verified === false).length || 0;

  // Données graphe inscriptions (par jour, 14 derniers)
  const signupTrend = (() => {
    const map: Record<string, number> = {};
    (students || []).forEach(s => { const d = s.created_at?.slice(0, 10); if (d) map[d] = (map[d] || 0) + 1; });
    return Object.entries(map).sort().slice(-14).map(([d, n]) => ({ date: d.slice(5), n }));
  })();

  const studentGrades = detail?.grades || [];
  const chartData = studentGrades.map((g: any, i: number) => ({
    name: g.sms_courses?.code || `E${i + 1}`,
    pct: Math.round((Number(g.score) / Number(g.max_score)) * 100),
  }));

  const statCards = [
    { label: "Étudiants", value: total, icon: Users, color: "#0d9488", bg: "from-teal-500/15" },
    { label: "Admis", value: admittedCount, icon: UserCheck, color: "#2563eb", bg: "from-blue-500/15" },
    { label: "Certifiés", value: certifiedCount, icon: Trophy, color: "#7c3aed", bg: "from-purple-500/15" },
    { label: "Non vérifiés", value: unverifiedCount, icon: ShieldAlert, color: "#d97706", bg: "from-amber-500/15" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6 text-primary" /> Gestion des étudiants</h1>
          <p className="text-muted-foreground text-sm mt-1">DataMEAL Academy — inscriptions, admissions, notes, attestations</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => {
          const rows = [["Nom", "Email", "Pays", "Statut", "Admis", "Score"], ...(students || []).map(s => [s.full_name, s.email, s.country || "", s.status, s.admitted_at ? "oui" : "non", String(s.entry_score ?? "")])];
          const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          const a = document.createElement("a"); a.href = url; a.download = "etudiants.csv"; a.click();
        }}><Download className="w-4 h-4" /> Exporter CSV</Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <div key={s.label} className="relative overflow-hidden bg-card rounded-2xl border border-border/50 p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ animation: `fadeUp .4s ease ${i * 0.06}s both` }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} to-transparent opacity-60`} />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}1a` }}>
                <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      {signupTrend.length > 1 && (
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">Inscriptions récentes</h3></div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={signupTrend}>
              <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} /><stop offset="100%" stopColor="#0d9488" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" width={20} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="n" stroke="#0d9488" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un nom, email, organisation…" className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([["all", "Tous"], ["admitted", "Admis"], ["pending", "En attente"], ["unverified", "Non vérifiés"], ["certified", "Certifiés"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Student list */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 text-xs text-muted-foreground flex items-center justify-between">
          <span>{filtered.length} étudiant{filtered.length > 1 ? "s" : ""}</span>
        </div>
        <div className="divide-y divide-border/30 max-h-[600px] overflow-y-auto">
          {filtered.map((s, i) => {
            const initials = s.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("") || "?";
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                style={{ animation: `fadeIn .3s ease ${Math.min(i * 0.02, 0.4)}s both` }}>
                <button onClick={() => setSelectedId(s.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary shrink-0">{initials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{s.full_name}</p>
                      {s.email_verified === false && <span title="Email non vérifié"><ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" /></span>}
                      {s.final_certificate_no && <span title="Certifié"><Trophy className="w-3.5 h-3.5 text-purple-500 shrink-0" /></span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                </button>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <StatusBadge s={s} />
                  {s.entry_score != null && s.entry_score > 0 && (
                    <span className="text-xs font-medium text-muted-foreground w-12 text-right">{Math.round(s.entry_score / 30 * 100)}%</span>
                  )}
                </div>
                <div className="relative shrink-0">
                  <button onClick={() => setMenuId(menuId === s.id ? null : s.id)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                  {menuId === s.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
                      <div className="absolute right-0 top-9 z-50 w-52 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden py-1">
                        {s.email_verified === false && <MenuItem icon={ShieldCheck} label="Vérifier l'email" onClick={() => action.mutate({ id: s.id, act: "verify_email" })} />}
                        {!s.admitted_at && <MenuItem icon={UserCheck} label="Admettre manuellement" onClick={() => action.mutate({ id: s.id, act: "admit" })} />}
                        {!s.admitted_at && <MenuItem icon={RotateCcw} label="Réinitialiser le test" onClick={() => action.mutate({ id: s.id, act: "reset_test" })} />}
                        {s.admitted_at && <MenuItem icon={Ban} label="Révoquer l'admission" onClick={() => action.mutate({ id: s.id, act: "revoke_admission" })} />}
                        <MenuItem icon={Trash2} label="Supprimer" danger onClick={() => { if (confirm(`Supprimer ${s.full_name} ?`)) action.mutate({ id: s.id, act: "delete" }); }} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Aucun étudiant trouvé.</div>}
        </div>
      </div>

      {/* Detail slide-over */}
      {selectedId !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" style={{ animation: "fadeIn .2s ease" }} onClick={() => setSelectedId(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background z-50 overflow-y-auto shadow-2xl" style={{ animation: "slideIn .3s cubic-bezier(.16,1,.3,1)" }}>
            {!detail ? <div className="flex justify-center py-32"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div> : (
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-teal-700 text-white flex items-center justify-center text-lg font-bold">{detail.student.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}</div>
                    <div>
                      <h2 className="font-bold text-lg leading-tight">{detail.student.full_name}</h2>
                      <p className="text-xs text-muted-foreground">{detail.student.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge s={detail.student} />
                  {detail.student.email_verified === false
                    ? <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Email non vérifié</span>
                    : <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Email vérifié</span>}
                </div>

                {/* Infos */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Pays" value={detail.student.country || "—"} />
                  <Info label="Organisation" value={detail.student.organization || "—"} />
                  <Info label="Téléphone" value={detail.student.phone || "—"} />
                  <Info label="Tentatives test" value={String(detail.student.test_attempts ?? 0)} />
                  <Info label="Inscrit le" value={detail.student.created_at ? format(new Date(detail.student.created_at), "d MMM yyyy", { locale: fr }) : "—"} />
                  <Info label="Admis le" value={detail.student.admitted_at ? format(new Date(detail.student.admitted_at), "d MMM yyyy", { locale: fr }) : "—"} />
                </div>

                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2">
                  {detail.student.email_verified === false && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => action.mutate({ id: detail.student.id, act: "verify_email" })}><ShieldCheck className="w-3.5 h-3.5" /> Vérifier email</Button>}
                  {!detail.student.admitted_at && <Button size="sm" className="gap-1.5" onClick={() => action.mutate({ id: detail.student.id, act: "admit" })}><UserCheck className="w-3.5 h-3.5" /> Admettre</Button>}
                  {!detail.student.admitted_at && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => action.mutate({ id: detail.student.id, act: "reset_test" })}><RotateCcw className="w-3.5 h-3.5" /> Reset test</Button>}
                </div>

                {/* Graphe notes */}
                {chartData.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border/50 p-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" /> Évolution des notes</h3>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" width={26} />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Line type="monotone" dataKey="pct" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Diplômes téléchargeables */}
                {detail.certificates?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Award className="w-4 h-4 text-primary" /> Diplômes téléchargeables</h3>
                    <div className="space-y-2">
                      {detail.certificates.map((cert: any) => (
                        <div key={cert.type} className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${cert.type === "final" ? "border-purple-300 bg-purple-50 dark:bg-purple-900/15 dark:border-purple-900/40" : "border-primary/30 bg-primary/5"}`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            {cert.type === "final" ? <Trophy className="w-5 h-5 text-purple-500 shrink-0" /> : <Award className="w-5 h-5 text-primary shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{cert.label}</p>
                              {cert.expires_at && <p className="text-[11px] text-muted-foreground">Valable jusqu'au {new Date(cert.expires_at).toLocaleDateString("fr-FR")}</p>}
                            </div>
                          </div>
                          <a href={cert.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                            <Button size="sm" className="gap-1.5 h-8"><Download className="w-3.5 h-3.5" /> Ouvrir</Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relevé de notes */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-primary" /> Relevé de notes ({studentGrades.length})</h3>
                  <div className="space-y-1.5">
                    {studentGrades.map((g: any) => {
                      const pct = Math.round(Number(g.score) / Number(g.max_score) * 100);
                      return (
                        <div key={g.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                          <span className="truncate flex-1 text-xs">{g.title}</span>
                          <span className={`font-semibold text-xs ml-2 ${pct >= 70 ? "text-primary" : pct >= 50 ? "text-amber-600" : "text-destructive"}`}>{g.score}/{g.max_score}</span>
                        </div>
                      );
                    })}
                    {studentGrades.length === 0 && <p className="text-xs text-muted-foreground py-2">Aucune note.</p>}
                  </div>
                </div>

                {/* Attestations */}
                {detail.attestations?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Award className="w-4 h-4 text-primary" /> Attestations</h3>
                    <div className="space-y-1.5">
                      {detail.attestations.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-3 py-2">
                          <span className="font-mono">{a.certificate_no}</span>
                          <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a.cert_type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full gap-1.5 text-destructive hover:text-destructive" onClick={() => { if (confirm(`Supprimer définitivement ${detail.student.full_name} ?`)) action.mutate({ id: detail.student.id, act: "delete" }); }}><Trash2 className="w-3.5 h-3.5" /> Supprimer cet étudiant</Button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
      `}</style>
    </div>
  );
}

function StatusBadge({ s }: { s: Student }) {
  if (s.final_certificate_no) return <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1"><Trophy className="w-3 h-3" /> Certifié</span>;
  if (s.admitted_at) return <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Admis</span>;
  return <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>;
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${danger ? "text-destructive" : ""}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="bg-muted/40 rounded-lg px-3 py-2"><p className="text-[10px] text-muted-foreground">{label}</p><p className="font-medium truncate">{value}</p></div>;
}
