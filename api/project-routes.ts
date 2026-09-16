import type { Express, RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { gradeProject, isProjectProgram } from '../shared/professional-projects.js';

/** Le serveur ne télécharge jamais les liens soumis. La lecture appartient au correcteur. */
export function registerProjectRoutes(app: Express, db: SupabaseClient, student: RequestHandler, admin: RequestHandler) {
  app.get('/api/academy/projects/:program', student, async (req, res) => {
    const program = String(req.params.program);
    if (!isProjectProgram(program)) return res.status(404).json({ message: 'Parcours introuvable.' });
    const { data, error } = await db.from('academy_professional_projects').select('*')
      .eq('student_id', (req as any).student.sid).eq('program_id', program).order('id', { ascending: false });
    if (error) return res.status(503).json({ message: 'Le dépôt des projets est temporairement indisponible.' });
    res.json(data);
  });
  app.post('/api/academy/projects/:program', student, async (req, res) => {
    const program = String(req.params.program);
    if (!isProjectProgram(program)) return res.status(404).json({ message: 'Parcours introuvable.' });
    const sid = (req as any).student.sid;
    const { data: admission, error: admissionError } = await db.from('academy_program_admissions').select('admitted_at')
      .eq('student_id', sid).eq('program_id', program).maybeSingle();
    if (admissionError) return res.status(503).json({ message: 'Vérification de l’admission indisponible.' });
    if (!admission?.admitted_at) return res.status(403).json({ message: 'Admission au parcours requise.' });
    const { title, url, summary } = req.body ?? {};
    if (typeof title !== 'string' || title.trim().length < 5 || title.length > 180 || typeof summary !== 'string' || summary.trim().length < 50 || summary.length > 5000 || typeof url !== 'string' || url.length > 2000)
      return res.status(400).json({ message: 'Titre : 5 à 180 caractères ; résumé : 50 à 5 000 ; lien HTTPS requis.' });
    try { const u = new URL(url); if (u.protocol !== 'https:' || u.username || u.password) throw new Error(); }
    catch { return res.status(400).json({ message: 'Utilisez un lien HTTPS sans identifiants.' }); }
    const { data, error } = await db.from('academy_professional_projects').insert({
      student_id: sid, program_id: program, title: title.trim(), url, summary: summary.trim(),
    }).select().single();
    if (error) return res.status(error.code === '23505' ? 409 : 503).json({ message: error.code === '23505' ? 'Un projet est déjà en correction ou validé.' : 'Le dépôt est temporairement indisponible.' });
    res.status(201).json(data);
  });
  app.get('/api/admin/academy/projects', admin, async (_req, res) => {
    const { data, error } = await db.from('academy_professional_projects').select('*, students(full_name)')
      .order('id', { ascending: false }).limit(200);
    if (error) return res.status(503).json({ message: 'La liste des projets est indisponible.' });
    res.json(data);
  });
  app.put('/api/admin/academy/projects/:id/review', admin, async (req, res) => {
    const { scores, feedback, criticalIssue } = req.body ?? {};
    if (typeof feedback !== 'string' || feedback.trim().length < 30 || feedback.length > 10000 || typeof criticalIssue !== 'boolean')
      return res.status(400).json({ message: 'Un retour de 30 à 10 000 caractères et le contrôle des défauts critiques sont requis.' });
    const { data: project, error: readError } = await db.from('academy_professional_projects').select('program_id,status').eq('id', req.params.id).maybeSingle();
    if (readError) return res.status(503).json({ message: 'Lecture du projet indisponible.' });
    if (!project || !isProjectProgram(project.program_id)) return res.status(404).json({ message: 'Projet introuvable.' });
    if (project.status !== 'submitted') return res.status(409).json({ message: 'Ce projet a déjà été corrigé.' });
    let grade;
    try { grade = gradeProject(project.program_id, scores, criticalIssue); }
    catch (e) { return res.status(400).json({ message: (e as Error).message }); }
    const { data, error } = await db.from('academy_professional_projects').update({
      ...grade, rubric_scores: scores, critical_issue: criticalIssue, feedback: feedback.trim(),
      reviewed_by: (req as any).admin.id, reviewed_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('status', 'submitted').select().maybeSingle();
    if (error) return res.status(503).json({ message: 'Correction non enregistrée.' });
    if (!data) return res.status(409).json({ message: 'Une autre correction vient d’être enregistrée.' });
    res.json(data);
  });
}
