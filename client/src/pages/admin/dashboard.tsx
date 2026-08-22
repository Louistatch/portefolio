import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, UserCheck, Clock, Award, TrendingUp, TrendingDown, Minus,
  UserPlus, Send, Video, FileText, GraduationCap, Mail, MessageSquare,
  ShieldCheck, ChevronRight, Loader2, AlertCircle,
} from "lucide-react";

/** Formatage court d'une date ISO, en français. */
const jourMois = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** « il y a 3 h », « il y a 5 min » — plus lisible qu'un horodatage dans un flux d'activité. */
function depuis(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 31) return `il y a ${j} j`;
  return jourMois(iso);
}

/** Tendance en pourcentage. `null` signifie « aucune base de comparaison », ce qui n'est pas
 *  la même chose que « 0 % » — on l'affiche donc différemment plutôt que de le masquer. */
function Tendance({ valeur }: { valeur: number | null }) {
  if (valeur === null) return <span className="text-[11px] text-muted-foreground">pas de comparaison</span>;
  const Icone = valeur > 0 ? TrendingUp : valeur < 0 ? TrendingDown : Minus;
  const couleur = valeur > 0 ? "text-emerald-600" : valeur < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={`text-[11px] font-medium inline-flex items-center gap-0.5 ${couleur}`}>
      <Icone className="w-3 h-3" />
      {valeur > 0 ? "+" : ""}{valeur} %
    </span>
  );
}

function CarteKpi({ titre, valeur, tendance, icone: Icone, teinte, href, note }: {
  titre: string; valeur: number; tendance: number | null; icone: any;
  teinte: string; href: string; note?: string;
}) {
  return (
    <Link href={href}
      className="bg-card rounded-2xl border border-border/50 p-5 hover:shadow-md hover:border-border transition-all group">
      <div className="flex items-start justify-between mb-3">
        <span className={`w-10 h-10 rounded-xl grid place-items-center ${teinte}`}>
          <Icone className="w-5 h-5" />
        </span>
        <Tendance valeur={tendance} />
      </div>
      <p className="text-3xl font-bold leading-none mb-1.5">{valeur}</p>
      <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{titre}</p>
      {note && <p className="text-[11px] text-muted-foreground/80 mt-1">{note}</p>}
    </Link>
  );
}

function Panneau({ titre, action, children, className = "" }: {
  titre: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`bg-card rounded-2xl border border-border/50 ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <h2 className="font-semibold text-sm">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const COULEURS_STATUT: Record<string, string> = {
  admis: "#0d9488",
  en_attente: "#f59e0b",
  expire: "#94a3b8",
};
const LIBELLES_STATUT: Record<string, string> = {
  admis: "Admis",
  en_attente: "En attente",
  expire: "Expiré",
};

const ICONES_ACTIVITE: Record<string, any> = {
  inscription: UserPlus,
  admission: ShieldCheck,
  certificat: Award,
  message: Mail,
  commentaire: MessageSquare,
};

export default function Dashboard() {
  const [jours, setJours] = useState(30);
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["admin-dashboard", jours],
    queryFn: async () => {
      const r = await adminFetch(`/api/admin/dashboard?jours=${jours}`);
      if (!r.ok) throw new Error((await r.json())?.message || "Chargement impossible");
      return r.json();
    },
  });

  if (isLoading) return (
    <div className="grid place-items-center py-32">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="max-w-md mx-auto text-center py-24">
      <AlertCircle className="w-10 h-10 text-destructive/60 mx-auto mb-3" />
      <p className="font-semibold mb-1">Impossible de charger le tableau de bord</p>
      <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
    </div>
  );

  const k = data.kpis;
  const repartition = [
    { cle: "admis", n: data.repartition.admis },
    { cle: "en_attente", n: data.repartition.enAttente },
    { cle: "expire", n: data.repartition.expires },
  ].filter(s => s.n > 0);

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vue d'ensemble de l'académie · {jourMois(data.periode.debut)} → aujourd'hui
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-muted/60">
          {[7, 30, 90].map(n => (
            <button key={n} onClick={() => setJours(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                jours === n ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              {n} jours
            </button>
          ))}
        </div>
      </div>

      {/* ── Indicateurs clés ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CarteKpi titre="Étudiants" valeur={k.etudiants.valeur} tendance={k.etudiants.tendance}
          icone={Users} teinte="bg-primary/10 text-primary" href="/admin/students"
          note={`${k.etudiants.surPeriode} sur la période`} />
        <CarteKpi titre="Admis" valeur={k.admis.valeur} tendance={k.admis.tendance}
          icone={UserCheck} teinte="bg-emerald-500/10 text-emerald-600" href="/admin/students"
          note="admission en cours" />
        <CarteKpi titre="En attente" valeur={k.enAttente.valeur} tendance={k.enAttente.tendance}
          icone={Clock} teinte="bg-amber-500/10 text-amber-600" href="/admin/students"
          note="test non réussi" />
        <CarteKpi titre="Certifiés" valeur={k.certifies.valeur} tendance={k.certifies.tendance}
          icone={Award} teinte="bg-violet-500/10 text-violet-600" href="/admin/students"
          note="Super-Expert MEAL" />
      </div>

      {/* ── Courbe + anneau ── */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Panneau titre="Inscriptions" className="lg:col-span-3"
          action={<span className="text-xs text-muted-foreground">{data.performances.moyenneQuotidienne} / jour en moyenne</span>}>
          <div className="p-5 pt-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.inscriptions} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={jourMois} tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground"
                    minTickGap={28} />
                  {/* allowDecimals={false} : un compte d'inscriptions n'a pas de demi-unité,
                      et l'axe afficherait « 0,5 » sur les périodes creuses. */}
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44}
                    tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                  <Tooltip
                    labelFormatter={(v) => jourMois(String(v))}
                    formatter={(v: any) => [`${v} inscription${Number(v) > 1 ? "s" : ""}`, ""]}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                  <Area type="monotone" dataKey="n" stroke="#0d9488" strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { l: "Nouvelles inscriptions", v: data.performances.nouvellesInscriptions },
                { l: "Taux d'admission", v: `${data.performances.tauxAdmission} %` },
                { l: "Cours terminés", v: data.performances.coursTermines },
              ].map(s => (
                <div key={s.l} className="rounded-xl bg-muted/50 px-3 py-2.5">
                  <p className="text-lg font-bold leading-tight">{s.v}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </Panneau>

        <Panneau titre="Répartition des étudiants" className="lg:col-span-2">
          <div className="p-5">
            {data.repartition.total === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Aucun étudiant pour le moment.</p>
            ) : (
              <>
                <div className="h-44 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={repartition} dataKey="n" nameKey="cle"
                        innerRadius="66%" outerRadius="100%" paddingAngle={2} strokeWidth={0}>
                        {repartition.map(s => <Cell key={s.cle} fill={COULEURS_STATUT[s.cle]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: any, n: any) => [`${v} étudiant${Number(v) > 1 ? "s" : ""}`, LIBELLES_STATUT[String(n)]]}
                        contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 grid place-items-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold leading-none">{data.repartition.total}</p>
                      <p className="text-[11px] text-muted-foreground">au total</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {repartition.map(s => (
                    <div key={s.cle} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COULEURS_STATUT[s.cle] }} />
                      <span className="text-muted-foreground">{LIBELLES_STATUT[s.cle]}</span>
                      <span className="ml-auto font-medium">
                        {s.n}
                        <span className="text-muted-foreground font-normal ml-1.5">
                          ({Math.round((s.n / data.repartition.total) * 100)} %)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panneau>
      </div>

      {/* ── Étudiants récents + activité ── */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Panneau titre="Derniers inscrits" className="lg:col-span-3"
          action={<Link href="/admin/students" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
            Voir tous <ChevronRight className="w-3 h-3" />
          </Link>}>
          {data.etudiantsRecents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucune inscription.</p>
          ) : (
            <div className="divide-y divide-border/40">
              {data.etudiantsRecents.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-9 h-9 rounded-full bg-primary/10 text-primary grid place-items-center text-[11px] font-bold shrink-0">
                    {(e.nom || "?").split(" ").filter(Boolean).map((m: string) => m[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{e.nom}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{e.email}</p>
                  </div>
                  {!e.emailVerifie && (
                    <span className="hidden sm:inline text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 shrink-0">
                      email non vérifié
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    e.statut === "admis" ? "bg-emerald-500/10 text-emerald-600"
                    : e.statut === "expire" ? "bg-muted text-muted-foreground"
                    : "bg-amber-500/10 text-amber-600"}`}>
                    {LIBELLES_STATUT[e.statut]}
                  </span>
                  <div className="hidden md:block w-20 shrink-0">
                    {e.progression === null
                      ? <span className="text-[11px] text-muted-foreground">—</span>
                      : <>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${e.progression}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{e.progression} %</span>
                        </>}
                  </div>
                  <span className="hidden lg:inline text-[11px] text-muted-foreground shrink-0 w-16 text-right">
                    {jourMois(e.inscritLe)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panneau>

        <div className="lg:col-span-2 space-y-4">
          <Panneau titre="Activité récente">
            {data.activite.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Rien à signaler.</p>
            ) : (
              <div className="p-2">
                {data.activite.slice(0, 6).map((a: any, i: number) => {
                  const Icone = ICONES_ACTIVITE[a.type] || FileText;
                  return (
                    <div key={i} className="flex gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50">
                      <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0 mt-0.5">
                        <Icone className="w-4 h-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-tight">{a.titre}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{a.detail}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap mt-0.5">{depuis(a.quand)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panneau>

          <Panneau titre="Accès rapides">
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                { href: "/admin/students", icone: GraduationCap, l: "Étudiants" },
                { href: "/admin/newsletter", icone: Send, l: "Newsletter" },
                { href: "/admin/meetings", icone: Video, l: "Rencontre" },
                { href: "/admin/posts", icone: FileText, l: "Article" },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <a.icone className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[13px] font-medium truncate">{a.l}</span>
                </Link>
              ))}
            </div>
          </Panneau>
        </div>
      </div>

      {/* ── Cours et origine des abonnés ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panneau titre="Cours les plus suivis">
          {data.topCours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun cours.</p>
          ) : (
            <div className="p-3 space-y-1">
              {data.topCours.map((c: any, i: number) => {
                const max = Math.max(...data.topCours.map((x: any) => x.etudiants), 1);
                return (
                  <div key={c.code} className="flex items-center gap-3 px-2 py-2">
                    <span className="w-6 h-6 rounded-lg bg-muted grid place-items-center text-[11px] font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{c.titre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden flex-1">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(c.etudiants / max) * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">{c.code}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{c.etudiants}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panneau>

        <Panneau titre="Origine des abonnés"
          action={<Link href="/admin/subscribers" className="text-xs text-primary hover:underline">Gérer</Link>}>
          {data.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun abonné.</p>
          ) : (
            <div className="p-3 space-y-1">
              {data.sources.map((s: any) => (
                <div key={s.source} className="flex items-center gap-3 px-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{s.source}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                      <div className="h-full bg-primary/70 rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold shrink-0 w-8 text-right">{s.n}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 w-12 text-right">{s.pct} %</span>
                </div>
              ))}
            </div>
          )}
        </Panneau>
      </div>
    </div>
  );
}
