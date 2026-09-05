import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { adminFetch, clearToken, ADMIN_BASE } from "@/lib/admin";
import {
  LayoutDashboard, GraduationCap, Calendar, Video, Mail, MessageSquare,
  Newspaper, Users, Star, FileText, BookOpen, UserCircle,
  LogOut, Menu, X, Search, Bell, Sun, Moon, ExternalLink, ChevronRight, Send, LifeBuoy, Library, Megaphone,
} from "lucide-react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Navigation de l'administration, groupée par intention plutôt qu'à plat.
 *
 * Seules figurent ici les pages qui existent réellement. Une entrée de menu qui ne mène
 * nulle part se paie deux fois : elle fait perdre un clic, et elle érode la confiance dans
 * tout le reste du menu.
 *
 * `badge` désigne la clé du compteur renvoyé par /api/admin/badges. Ces compteurs ne
 * comptent que ce qui appelle une action — jamais un total.
 */
type Item = { href: string; label: string; icon: any; badge?: string };
type Section = { titre: string | null; items: Item[] };

const SECTIONS: Section[] = [
  {
    titre: null,
    items: [{ href: ADMIN_BASE, label: "Tableau de bord", icon: LayoutDashboard }],
  },
  {
    titre: "Academy",
    items: [
      { href: `${ADMIN_BASE}/students`, label: "Étudiants", icon: GraduationCap, badge: "emailsNonVerifies" },
      { href: `${ADMIN_BASE}/courses`, label: "Cours", icon: Library },
      { href: `${ADMIN_BASE}/student-messages`, label: "Écrire à un étudiant", icon: Send },
      { href: `${ADMIN_BASE}/ambassadors`, label: "Programme ambassadeur", icon: Megaphone },
      { href: `${ADMIN_BASE}/meetings`, label: "Rencontres en ligne", icon: Video },
      { href: `${ADMIN_BASE}/group-work`, label: "Travaux de groupe", icon: Users },
      { href: `${ADMIN_BASE}/support`, label: "Support", icon: LifeBuoy, badge: "ticketsOuverts" },
    ],
  },
  {
    titre: "Échanges",
    items: [
      { href: `${ADMIN_BASE}/messages`, label: "Messages", icon: Mail, badge: "messagesNonLus" },
      { href: `${ADMIN_BASE}/comments`, label: "Commentaires", icon: MessageSquare, badge: "commentairesEnAttente" },
      { href: `${ADMIN_BASE}/appointments`, label: "Rendez-vous", icon: Calendar, badge: "rendezVousEnAttente" },
      { href: `${ADMIN_BASE}/testimonials`, label: "Témoignages", icon: Star },
    ],
  },
  {
    titre: "Diffusion",
    items: [
      { href: `${ADMIN_BASE}/newsletter`, label: "Newsletter", icon: Newspaper },
      { href: `${ADMIN_BASE}/subscribers`, label: "Abonnés", icon: Users },
    ],
  },
  {
    titre: "Contenu",
    items: [
      { href: `${ADMIN_BASE}/posts`, label: "Articles", icon: FileText },
      { href: `${ADMIN_BASE}/publications`, label: "Publications", icon: BookOpen },
    ],
  },
  {
    titre: "Paramètres",
    items: [{ href: `${ADMIN_BASE}/profile`, label: "Profil & CV", icon: UserCircle }],
  },
];

const TOUS_LES_ITEMS = SECTIONS.flatMap(s => s.items);

/** Thème clair/sombre. Tailwind est configuré en `darkMode: ["class"]` mais rien ne posait
 *  la classe : le mode sombre existait sans qu'aucune commande ne l'atteigne. */
function useTheme() {
  const [sombre, setSombre] = useState(() => {
    if (typeof document === "undefined") return false;
    try {
      const enregistre = localStorage.getItem("admin-theme");
      if (enregistre) return enregistre === "dark";
    } catch { /* mode privé : on retombe sur la préférence système */ }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", sombre);
    try { localStorage.setItem("admin-theme", sombre ? "dark" : "light"); } catch { /* ignoré */ }
  }, [sombre]);
  return [sombre, () => setSombre(v => !v)] as const;
}

function useBadges() {
  return useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => (await adminFetch("/api/admin/badges")).json(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** Palette de commandes — Ctrl/⌘ + K. Cherche dans les pages et dans les étudiants. */
function Palette({ ouvert, setOuvert }: { ouvert: boolean; setOuvert: (v: boolean) => void }) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");

  // Les étudiants ne sont chargés qu'à la première ouverture de la palette : les tirer au
  // montage du layout ferait payer une requête à chaque page pour une recherche rarement
  // utilisée.
  const { data: etudiants } = useQuery<any[]>({
    queryKey: ["admin-palette-students"],
    queryFn: async () => (await adminFetch("/api/admin/academy/students")).json(),
    enabled: ouvert,
    staleTime: 5 * 60_000,
  });

  const trouves = useMemo(() => {
    const terme = q.trim().toLowerCase();
    if (terme.length < 2) return [];
    return (etudiants || [])
      .filter(e =>
        (e.full_name || "").toLowerCase().includes(terme) ||
        (e.email || "").toLowerCase().includes(terme))
      .slice(0, 6);
  }, [q, etudiants]);

  const aller = (href: string) => { setOuvert(false); setQ(""); navigate(href); };

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden">
        {/* shouldFilter=false : le filtrage des étudiants se fait déjà au-dessus, et cmdk
            masquerait sinon des résultats que l'on vient de retenir. */}
        <Command shouldFilter={false} className="[&_[cmdk-input-wrapper]]:border-b">
          <CommandInput
            value={q} onValueChange={setQ}
            placeholder="Rechercher une page, un étudiant, une adresse…" />
          <CommandList className="max-h-80">
            {q.trim().length >= 2 && trouves.length === 0 && (etudiants?.length ?? 0) > 0 && (
              <CommandEmpty>Aucun résultat pour « {q.trim()} ».</CommandEmpty>
            )}
            <CommandGroup heading="Pages">
              {TOUS_LES_ITEMS
                .filter(i => !q.trim() || i.label.toLowerCase().includes(q.trim().toLowerCase()))
                .map(i => (
                  <CommandItem key={i.href} value={i.href} onSelect={() => aller(i.href)} className="gap-2.5">
                    <i.icon className="w-4 h-4 text-muted-foreground" />
                    {i.label}
                  </CommandItem>
                ))}
            </CommandGroup>
            {trouves.length > 0 && (
              <CommandGroup heading="Étudiants">
                {trouves.map(e => (
                  <CommandItem key={e.id} value={`etu-${e.id}`} onSelect={() => aller(`${ADMIN_BASE}/students`)} className="gap-2.5">
                    <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{(e.full_name || "").trim() || e.email}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground truncate max-w-[45%]">{e.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [paletteOuverte, setPaletteOuverte] = useState(false);
  const [sombre, basculerTheme] = useTheme();
  const { data: badges } = useBadges();

  const { data: profil } = useQuery<any>({
    queryKey: ["admin-profil-entete"],
    queryFn: async () => (await fetch("/api/profile")).json(),
    staleTime: 10 * 60_000,
  });

  // Raccourci clavier global.
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

  // Sur mobile le menu recouvre la page : le laisser ouvert après une navigation cacherait
  // l'écran que l'on vient de demander.
  useEffect(() => { setMenuOuvert(false); }, [location]);

  const deconnexion = () => { clearToken(); navigate(`${ADMIN_BASE}/login`); };
  const titreCourant = TOUS_LES_ITEMS.find(i => i.href === location)?.label;

  const nav = (
    <>
      <div className="px-3 pt-1 pb-5">
        <Link href={ADMIN_BASE} className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-sm leading-tight truncate">LouisFarm</span>
            <span className="block text-[11px] text-muted-foreground leading-tight">Administration</span>
          </span>
        </Link>
      </div>

      <div className="mx-3 mb-5 p-3 rounded-2xl bg-muted/50 flex items-center gap-2.5">
        {profil?.photo_url
          ? <img src={profil.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          : <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold shrink-0">LT</span>}
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-tight truncate">{profil?.full_name || "Louis TATCHIDA"}</span>
          <span className="block text-[11px] text-muted-foreground leading-tight">Administrateur</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {SECTIONS.map((section, si) => (
          <div key={section.titre ?? `s${si}`}>
            {section.titre && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {section.titre}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const actif = location === item.href;
                const n = item.badge ? (badges as any)?.[item.badge] ?? 0 : 0;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                      actif
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {n > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                        {n > 99 ? "99+" : n}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/50 p-3 space-y-0.5">
        <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted">
          <ExternalLink className="w-4 h-4" /> Voir le site
        </a>
        <button onClick={deconnexion}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Barre latérale — fixe à partir de lg, tiroir en dessous */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-card border-r border-border/50 pt-4 z-30">
        {nav}
      </aside>

      {menuOuvert && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMenuOuvert(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-72 flex flex-col bg-card border-r border-border/50 pt-4 z-50 shadow-2xl">
            <button onClick={() => setMenuOuvert(false)}
              aria-label="Fermer le menu"
              className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-muted grid place-items-center">
              <X className="w-4 h-4" />
            </button>
            {nav}
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
              className="flex items-center gap-2.5 h-9 px-3 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-sm text-muted-foreground transition-colors flex-1 max-w-md">
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">Rechercher…</span>
              <kbd className="ml-auto hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-background shrink-0">
                Ctrl K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1 shrink-0">
              <button onClick={basculerTheme}
                aria-label={sombre ? "Passer en thème clair" : "Passer en thème sombre"}
                className="w-9 h-9 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground">
                {sombre ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
              </button>

              <Link href={`${ADMIN_BASE}/messages`} aria-label="Notifications"
                className="relative w-9 h-9 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground">
                <Bell className="w-[18px] h-[18px]" />
                {(badges?.total ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold grid place-items-center">
                    {badges.total > 99 ? "99+" : badges.total}
                  </span>
                )}
              </Link>

              <Link href={`${ADMIN_BASE}/profile`} aria-label="Mon profil" className="ml-1">
                {profil?.photo_url
                  ? <img src={profil.photo_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-border/60" />
                  : <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">LT</span>}
              </Link>
            </div>
          </div>

          {titreCourant && titreCourant !== "Tableau de bord" && (
            <div className="px-4 sm:px-6 pb-2.5 -mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link href={ADMIN_BASE} className="hover:text-foreground">Administration</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">{titreCourant}</span>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <Palette ouvert={paletteOuverte} setOuvert={setPaletteOuverte} />
    </div>
  );
}
