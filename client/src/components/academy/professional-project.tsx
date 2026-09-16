import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentFetch } from '@/lib/student';
import { Button } from '@/components/ui/button';
import { PROJECT_RUBRICS, type ProjectProgram } from '@shared/professional-projects';

export async function projectResponse(r: Response) {
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Action impossible.');
  return data;
}
export default function ProfessionalProject({ program }: { program: ProjectProgram }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(''); const [url, setUrl] = useState(''); const [summary, setSummary] = useState('');
  const query = useQuery({ queryKey: ['professional-project', program], queryFn: async () => projectResponse(await studentFetch(`/api/academy/projects/${program}`)) });
  const submit = useMutation({ mutationFn: async () => projectResponse(await studentFetch(`/api/academy/projects/${program}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, url, summary }) })), onSuccess: () => qc.invalidateQueries({ queryKey: ['professional-project', program] }) });
  const latest = query.data?.[0];
  const canSubmit = !latest || latest.status === 'changes_requested';
  return <section className="my-8 rounded-xl border bg-card p-5 space-y-4" aria-labelledby="project-title">
    <div><p className="text-xs uppercase tracking-wide text-primary">Mise en pratique · {program === 'data' ? 'Data Analytics' : 'Coopératives'}</p><h2 id="project-title" className="text-xl font-semibold mt-1">Votre projet professionnel</h2>
    <p className="text-sm text-muted-foreground mt-2">Construisez votre dossier au fil du parcours. Sa validation à 75/100, sans défaut critique, est nécessaire pour l’attestation du dernier cours. Le paiement ne remplace pas l’évaluation.</p></div>
    <details><summary className="cursor-pointer font-medium">Voir les critères d’évaluation</summary><ul className="mt-3 space-y-1 text-sm">{PROJECT_RUBRICS[program].map(c => <li key={c.id}>{c.label} — {c.max} points</li>)}</ul><p className="text-sm mt-3">Un défaut critique est une erreur qui invalide le résultat : données sans provenance, raisonnement non justifié, code non reproductible ou montage juridique non étayé. Le correcteur explique les reprises nécessaires.</p></details>
    {query.isLoading && <p role="status">Chargement du dossier…</p>}
    {query.error && <div role="alert"><p>{query.error.message}</p><Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button></div>}
    {latest && <div className="rounded-lg bg-muted p-4 space-y-2"><p className="font-medium">{latest.status === 'approved' ? 'Projet validé' : latest.status === 'submitted' ? 'Projet en attente de correction' : 'Nouvelle version demandée'}{latest.score != null ? ` · ${latest.score}/100` : ''}</p><p>{latest.title}</p><a href={latest.url} target="_blank" rel="noopener noreferrer" className="underline">Ouvrir le dossier soumis</a>{latest.feedback && <p className="whitespace-pre-wrap text-sm">{latest.feedback}</p>}</div>}
    {!query.isLoading && !query.error && canSubmit && <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit.mutate(); }}>
      <label className="block text-sm">Titre du projet<input className="mt-1 w-full rounded-md border bg-background p-2" value={title} onChange={e => setTitle(e.target.value)} minLength={5} maxLength={180} required /></label>
      <label className="block text-sm">Lien HTTPS du dossier<input type="url" pattern="https://.*" className="mt-1 w-full rounded-md border bg-background p-2" value={url} onChange={e => setUrl(e.target.value)} maxLength={2000} placeholder="https://…" required /></label>
      <p className="text-xs text-muted-foreground">Vérifiez que le correcteur peut ouvrir ce lien. Incluez le README, les sources, les livrables et les limites. Retirez les données personnelles et les secrets.</p>
      <label className="block text-sm">Résumé et modifications depuis le précédent retour<textarea className="mt-1 w-full rounded-md border bg-background p-2" rows={5} value={summary} onChange={e => setSummary(e.target.value)} minLength={50} maxLength={5000} required /></label>
      {submit.error && <p role="alert" className="text-destructive">{submit.error.message}</p>}
      <Button disabled={submit.isPending}>{submit.isPending ? 'Envoi…' : latest ? 'Soumettre la version corrigée' : 'Soumettre mon projet'}</Button>
    </form>}
    {query.data?.length > 1 && <details><summary className="cursor-pointer">Historique des versions</summary>{query.data.slice(1).map((p: any) => <div key={p.id} className="mt-3 border-t pt-2 text-sm"><p>{p.title} · {p.score ?? '—'}/100</p><p className="whitespace-pre-wrap">{p.feedback}</p></div>)}</details>}
  </section>;
}
