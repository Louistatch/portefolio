import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PROGRAMS } from "@shared/programs";
import { studentFetch, getStudent, clearStudentSession } from "@/lib/student";
import {
  Home, Route as RouteIcon, BookOpen, Award, FolderOpen, Users,
  Menu, X, Search, Bell, LogOut, LifeBuoy, GraduationCap, UserCircle, ChevronRight, TrendingUp,
} from "lucide-react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Coque de l'espace étudiant.
 *
 * Le tableau de bord était une page unique posée dans la mise en page du site vitrine : pour
 * passer d'un cours à son relevé de notes il fallait revenir en arrière. Un menu permanent
 * donne un point d'ancrage, et rappelle en permanence où l'on en est.
 *
 * Comme pour l'administration, seules figurent les destinations qui existent. Les rubriques
 * « Messages » et « Communauté » de la maquette n'ont aucune implémentation derrière et ne
 * sont donc pas affichées.
 */
type Item = { href: string; label: string; icon: any; exact?: boolean };

// « Mes cours » ne renvoie plus à une ancre du tableau de bord : chaque parcours a sa page.
// Les empiler dans un même écran rendait la séparation purement cosmétique — on lisait
// toujours ses cours de cartographie et ses cours d'animation rurale l'un sous l'autre.
const NAV: Item[] = [
  { href: "/academy/dashboard", label: "Accueil", icon: Home, exact: true },
  ...PROGRAMS.map(p => ({
    href: `/academy/parcours/${p.id}`, label: p.title, icon: RouteIcon, exact: true,
  })),
  { href: "/academy/group-work", label: "Travaux de groupe", icon: Users, exact: true },
  { href: "/academy/grades", label: "Mes notes", icon: TrendingUp, exact: true },
  { href: "/academy/dashboard#credentials", label: "Certifications", icon: Award },
  { href: "/academy/dashboard#ressources", label: "Ressources", icon: FolderOpen },
];

const BAS: Item[] = [
  { href: "/academy/profile", label: "Mon profil", icon: UserCircle, exact: true },
];

function initiales(nom?: string | null) {
  return (nom || "")
    .split(" ").filter(Boolean).map(m => m[0]).slice(0, 2).join("").toUpperCase() || "ET";
}

/** Recherche — Ctrl/⌘ + K. Porte sur les cours et les leçons du planning de l'étudiant. */
function Palette({ ouvert, setOuvert }: { ouvert: boolean; setOuvert: (v: boolean) => void }) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");

  const { data: planning } = useQuery<any[]>({
    queryKey: ["academy-palette-planning"],
    queryFn: async () => (await studentFetch("/api/academy/lesson-schedule")).json(),
    enabled: ouvert,
    staleTime: 2 * 60_000,
  });

  const lecons = useMemo(() => {
    const terme = q.trim().toLowerCase();
    if (terme.length < 2) return [];
    return (planning || [])
      .filter((p: any) =>
        (p.sms_lessons?.title || "").toLowerCase().includes(terme) ||
        (p.sms_courses?.code || "").toLowerCase().includes(terme) ||
        (p.sms_courses?.title || "").toLowerCase().includes(terme))
      .slice(0, 7);
  }, [q, planning]);

  const aller = (href: string) => { setOuvert(false); setQ(""); navigate(href); };

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ}
            placeholder="Rechercher un cours, une leçon…" />
          <CommandList className="max-h-80">
            {q.trim().length >= 2 && lecons.length === 0 && (
              <CommandEmpty>Aucun résultat pour « {q.trim()} ».</CommandEmpty>
            )}
            <CommandGroup heading="Navigation">
              {NAV.filter(i => !q.trim() || i.label.toLowerCase().includes(q.trim().toLowerCase()))
                .map(i => (
                  <CommandItem key={i.href} value={i.href} onSelect={() => aller(i.href)} className="gap-2.5">
                    <i.icon className="w-4 h-4 text-muted-foreground" />
                    {i.label}
                  </CommandItem>
                ))}
            </CommandGroup>
            {lecons.length > 0 && (
              <CommandGroup heading="Mes leçons">
                {lecons.map((p: any) => {
                  const ouvrable = p.status === "available" || p.status === "missed" || p.status === "completed";
                  return (
                    <CommandItem key={p.id} value={`l-${p.id}`} className="gap-2.5"
                      onSelect={() => ouvrable
                        ? aller(`/academy/classroom/${p.course_id}?lesson=${p.lesson_id}`)
                        : aller("/academy/dashboard")}>
                      <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{p.sms_lessons?.title}</span>
                      <span className="ml-auto text-[11px] font-mono text-muted-foreground shrink-0">
                        {p.sms_courses?.code}
                      </span>
                      {!ouvrable && <span className="text-[10px] text-muted-foreground shrink-0">verrouillée</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function AcademyLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [paletteOuverte, setPaletteOuverte] = useState(false);
  const etudiant = getStudent();

  const { data: bord } = useQuery<any>({
    queryKey: ["academy-dashboard"],
    queryFn: async () => (await studentFetch("/api/academy/dashboard")).json(),
    staleTime: 60_000,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOuverte(v => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setMenuOuvert(false); }, [location]);

  const deconnexion = () => { clearStudentSession(); navigate("/academy/login"); };

  // Une échéance non tenue ou une adresse non confirmée valent d'être signalées ; le reste
  // ne mérite pas d'attirer l'œil en permanence.
  const aSignaler =
    (bord?.etudiant?.emailVerifie === false ? 1 : 0) +
    (bord?.calendrier || []).filter((e: any) =>
      (e.type === "echeance" || e.type === "travail_groupe") && e.statut === "missed").length;

  const nom = bord?.etudiant?.nom || etudiant?.full_name;

  const menu = (
    <>
      <div className="px-4 pt-1 pb-6">
        <Link href="/academy/dashboard" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-sm leading-tight">MEAL</span>
            <span className="block text-[10px] tracking-widest text-muted-foreground leading-tight">ACADEMY</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {NAV.map(item => {
          const actif = item.exact ? location === item.href : false;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                actif ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <div className="pt-2 mt-2 border-t border-border/40">
          {BAS.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                location === item.href ? "bg-primary/10 text-primary font-medium"
                                       : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-3 space-y-2">
        {bord?.xp && (
          <div className="rounded-2xl bg-primary/5 border border-primary/15 p-3">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Votre niveau</span>
              <span className="text-[11px] font-bold text-primary">{bord.xp.total} XP</span>
            </div>
            <p className="text-[13px] font-semibold leading-tight mb-2">{bord.xp.titre}</p>
            {bord.xp.seuilSuivant !== null && (
              <>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{
                    width: `${Math.min(100, Math.max(0, Math.round(
                      ((bord.xp.total - bord.xp.seuilActuel) /
                       (bord.xp.seuilSuivant - bord.xp.seuilActuel)) * 100)))}%`,
                  }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {bord.xp.restantPourNiveauSuivant} XP pour « {bord.xp.titreSuivant} »
                </p>
              </>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-muted/50 p-3 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold shrink-0">
            {initiales(nom)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium leading-tight truncate">{nom || "Étudiant"}</span>
            <span className="block text-[11px] text-muted-foreground leading-tight">
              {bord?.etudiant?.admis ? "Apprenant" : "En attente d'admission"}
            </span>
          </span>
          <button onClick={deconnexion} aria-label="Se déconnecter"
            className="w-7 h-7 rounded-lg hover:bg-background grid place-items-center text-muted-foreground hover:text-destructive shrink-0">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Menait à un `mailto:` — c'est-à-dire, pour un étudiant sur téléphone, à un client
            de messagerie souvent non configuré, et pour nous à un message sans contexte qu'il
            fallait instruire en repartant de zéro. Le centre d'aide répond d'abord ; le
            formulaire, lui, joint l'état du dossier tout seul. */}
        <Link href="/aide"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted">
          <LifeBuoy className="w-4 h-4 shrink-0" />
          <span className="min-w-0">
            <span className="block leading-tight">Besoin d'aide ?</span>
            <span className="block text-[11px] text-muted-foreground/80 leading-tight truncate">Centre d'aide</span>
          </span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/25">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-card border-r border-border/50 pt-4 z-30">
        {menu}
      </aside>

      {menuOuvert && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMenuOuvert(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-72 flex flex-col bg-card border-r border-border/50 pt-4 z-50 shadow-2xl">
            <button onClick={() => setMenuOuvert(false)} aria-label="Fermer le menu"
              className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-muted grid place-items-center">
              <X className="w-4 h-4" />
            </button>
            {menu}
          </aside>
        </>
      )}

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/50">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button onClick={() => setMenuOuvert(true)} aria-label="Ouvrir le menu"
              className="lg:hidden w-9 h-9 rounded-lg hover:bg-muted grid place-items-center shrink-0">
              <Menu className="w-5 h-5" />
            </button>

            <button onClick={() => setPaletteOuverte(true)}
              className="flex items-center gap-2.5 h-9 px-3 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-sm text-muted-foreground transition-colors flex-1 min-w-0 max-w-md">
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">Rechercher un cours, une leçon…</span>
              <kbd className="ml-auto hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-background shrink-0">
                Ctrl K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1 shrink-0">
              <Link href="/academy/dashboard" aria-label="Ce qui demande votre attention"
                className="relative w-9 h-9 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground">
                <Bell className="w-[18px] h-[18px]" />
                {aSignaler > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold grid place-items-center">
                    {aSignaler}
                  </span>
                )}
              </Link>
              <Link href="/academy/profile" aria-label="Mon profil" className="ml-1">
                <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">
                  {initiales(nom)}
                </span>
              </Link>
            </div>
          </div>

          {location !== "/academy/dashboard" && (
            <div className="px-4 sm:px-6 pb-2.5 -mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link href="/academy/dashboard" className="hover:text-foreground">Mon espace</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">
                {location.startsWith("/academy/classroom") ? "Salle de cours"
                  : location === "/academy/group-work" ? "Travaux de groupe"
                  : location === "/academy/profile" ? "Mon profil"
                  : location.startsWith("/academy/live") ? "Rencontre en ligne" : "Page"}
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <Palette ouvert={paletteOuverte} setOuvert={setPaletteOuverte} />
    </div>
  );
}
