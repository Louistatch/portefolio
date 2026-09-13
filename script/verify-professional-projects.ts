import assert from 'node:assert/strict';
import { gradeProject, PROJECT_RUBRICS, projectRequiredForCourse } from '../shared/professional-projects.js';
for (const program of ['data', 'coop'] as const) {
  const full = Object.fromEntries(PROJECT_RUBRICS[program].map(c => [c.id, c.max]));
  assert.equal(gradeProject(program, full, false).score, 100);
  assert.equal(gradeProject(program, full, false).status, 'approved');
  assert.equal(gradeProject(program, full, true).status, 'changes_requested', 'Un défaut critique doit bloquer même un score de 100.');
  const threshold = Object.fromEntries(PROJECT_RUBRICS[program].map(c => [c.id, c.max * .75]));
  assert.equal(gradeProject(program, threshold, false).status, 'approved');
  const below = { ...threshold, [PROJECT_RUBRICS[program][0].id]: threshold[PROJECT_RUBRICS[program][0].id] - .01 };
  assert.equal(gradeProject(program, below, false).status, 'changes_requested');
  for (const bad of [NaN, Infinity, -1, 999, '20', null]) assert.throws(() => gradeProject(program, { ...full, [PROJECT_RUBRICS[program][0].id]: bad }, false));
  assert.throws(() => gradeProject(program, {}, false));
  assert.throws(() => gradeProject(program, {...full, injected: 20}, false));
}
assert.equal(projectRequiredForCourse('DATA-01'), false);
assert.equal(projectRequiredForCourse('DATA-02'), true);
assert.equal(projectRequiredForCourse('COOP-02'), true);
assert.equal(projectRequiredForCourse('MEAL-01'), false);
console.log('Grilles : seuil, défaut critique, notes invalides et périmètre vérifiés.');

// Exécuter les handlers réels avec une base simulée : aucun accès à la production.
const { registerProjectRoutes } = await import('../api/project-routes.js');
const handlers: Record<string, any[]> = {};
const calls: any[] = [];
let replies: any[] = [];
const db = { from(table: string) {
  const chain: any = {};
  for (const method of ['select','eq','order','limit','insert','update']) chain[method] = (...args: any[]) => { calls.push([table, method, ...args]); return chain; };
  chain.single = chain.maybeSingle = async () => replies.shift();
  chain.then = (resolve: any) => Promise.resolve(replies.shift()).then(resolve);
  return chain;
} };
const app: any = {};
for (const method of ['get','post','put']) app[method] = (path: string, ...h: any[]) => { handlers[`${method} ${path}`] = h; };
const studentGuard: any = () => {}; const adminGuard: any = () => {};
registerProjectRoutes(app, db as any, studentGuard, adminGuard);
for (const [path, h] of Object.entries(handlers)) assert.equal(h[0], path.includes('/admin/') ? adminGuard : studentGuard);
async function invoke(key: string, body: any, result: any[], params = { program: 'data', id: '42' }) {
  replies = [...result]; calls.length = 0;
  const response: any = { code: 200, status(n: number) { this.code = n; return this; }, json(value: any) { this.value = value; return this; } };
  await handlers[key].at(-1)({ params, body, student: { sid: 7 }, admin: { id: 2 } }, response);
  return response;
}
const valid = { title: 'Projet agricole', url: 'https://example.org/projet', summary: 'Une analyse documentée des rendements et de leurs limites pour le comité de gestion.' };
let r = await invoke('post /api/academy/projects/:program', valid, [{ data: null, error: null }]);
assert.equal(r.code, 403);
assert(!calls.some(c => c[1] === 'insert'));
r = await invoke('post /api/academy/projects/:program', {...valid, url: 'javascript:alert(1)'}, [{ data: { admitted_at: '2026-09-01' } }]);
assert.equal(r.code, 400);
r = await invoke('post /api/academy/projects/:program', {...valid, status: 'approved', student_id: 99, score: 100}, [{ data: { admitted_at: '2026-09-01' } }, { data: { id: 1 } }]);
assert.equal(r.code, 201);
const inserted = calls.find(c => c[1] === 'insert')[2];
assert.equal(inserted.student_id, 7); assert.equal(inserted.status, undefined); assert.equal(inserted.score, undefined);
r = await invoke('post /api/academy/projects/:program', valid, [{ data: { admitted_at: '2026-09-01' } }, { error: { code: '23505' } }]);
assert.equal(r.code, 409);
r = await invoke('get /api/academy/projects/:program', {}, [{ data: [] }]);
assert(calls.some(c => c[1] === 'eq' && c[2] === 'student_id' && c[3] === 7));
const scores = Object.fromEntries(PROJECT_RUBRICS.data.map(c => [c.id, c.max]));
r = await invoke('put /api/admin/academy/projects/:id/review', { scores, feedback: 'Résultats solides, sources vérifiées et limites correctement décrites.', criticalIssue: false }, [{ data: { program_id: 'data', status: 'submitted' } }, { data: null }]);
assert.equal(r.code, 409, 'Une correction concurrente ne doit pas être écrasée.');
console.log('Routes : authentification, admission, propriété, URL, injection de statut et concurrence vérifiées.');
