import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { PROJECT_RUBRICS, type ProjectProgram } from '@shared/professional-projects';
import { projectResponse } from '@/components/academy/professional-project';
function Review({ project }: { project: any }) {
  const qc = useQueryClient();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState(''); const [criticalIssue, setCriticalIssue] = useState(false);
  const save = useMutation({ mutationFn: async () => projectResponse(await adminFetch(`/api/admin/academy/projects/${project.id}/review`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scores, feedback, criticalIssue }) })), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-projects'] }) });
  return <article className="rounded-xl border bg-card p-5 space-y-3"><h2 className="text-lg font-semibold">{project.title}</h2><p className="text-sm">{project.students?.full_name} · {project.program_id.toUpperCase()} · {new Date(project.submitted_at).toLocaleDateString('fr-FR')}</p><a className="underline" href={project.url} target="_blank" rel="noopener noreferrer">Consulter le dossier</a><p className="whitespace-pre-wrap text-sm">{project.summary}</p>
    {project.status !== 'submitted' ? <div><p>{project.status === 'approved' ? 'Validé' : 'À reprendre'} · {project.score}/100</p><p className="whitespace-pre-wrap">{project.feedback}</p></div> : <form className="space-y-4" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
      <div className="grid gap-3 sm:grid-cols-2">{PROJECT_RUBRICS[project.program_id as ProjectProgram].map(c => <label key={c.id} className="text-sm">{c.label} / {c.max}<input type="number" min={0} max={c.max} step="0.5" required className="block w-full rounded border bg-background p-2 mt-1" value={scores[c.id] ?? ''} onChange={e => setScores({ ...scores, [c.id]: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>)}</div>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={criticalIssue} onChange={e => setCriticalIssue(e.target.checked)} />Défaut critique non résolu : reprise obligatoire, même au-dessus de 75/100.</label>
      <label className="block text-sm">Retour au candidat : points forts, erreurs et actions attendues<textarea required minLength={30} maxLength={10000} rows={5} className="block w-full rounded border bg-background p-2 mt-1" value={feedback} onChange={e => setFeedback(e.target.value)} /></label>
      <p className="text-sm">Total : {Object.values(scores).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)}/100. Validation à partir de 75, sans défaut critique.</p>
      {save.error && <p role="alert" className="text-destructive">{save.error.message}</p>}<Button disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer la correction'}</Button>
    </form>}
  </article>;
}
export default function ProjectsAdmin() {
  const [pendingOnly, setPendingOnly] = useState(true);
  const q = useQuery({ queryKey: ['admin-projects'], queryFn: async () => projectResponse(await adminFetch('/api/admin/academy/projects')) });
  return <div className="max-w-4xl mx-auto p-4 space-y-5"><h1 className="text-2xl font-semibold">Projets professionnels</h1><p className="text-muted-foreground">Data Analytics et Coopératives · 200 derniers dépôts</p><label className="flex gap-2"><input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)} />À corriger uniquement</label>
    {q.isLoading && <p role="status">Chargement…</p>}{q.error && <div role="alert">{q.error.message}<Button variant="outline" onClick={() => q.refetch()}>Réessayer</Button></div>}
    {q.data?.filter((p: any) => !pendingOnly || p.status === 'submitted').map((p: any) => <Review key={p.id} project={p} />)}
    {q.data && !q.data.some((p: any) => !pendingOnly || p.status === 'submitted') && <p>Aucun projet dans cette vue.</p>}
  </div>;
}
