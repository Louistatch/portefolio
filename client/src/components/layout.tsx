import { Link, useLocation } from "wouter";
import { ReactNode, useState, useEffect } from "react";
import { Menu, X, BookOpen, User, Home, Lightbulb, Calendar, Mail, FileText, HelpCircle, GraduationCap, LogOut, LayoutDashboard, ChevronDown, LogIn, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Newsletter } from "@/components/newsletter";
import { NewsletterPopup } from "@/components/newsletter-popup";
import { TermsPopup } from "@/components/terms-popup";
import { ScrollProgressBar, PageTransition, useAutoHideHeader, SPRING_STIFF, SPRING_SOFT } from "@/components/motion";
import { useQuery } from "@tanstack/react-query";
import { getStudent, clearStudentSession, isStudentLoggedIn } from "@/lib/student";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/about", label: "À propos", icon: User },
  { href: "/research", label: "Recherche", icon: Lightbulb },
  { href: "/publications", label: "Publications", icon: BookOpen },
  { href: "/blog", label: "Blog", icon: FileText },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/elearning", label: "Academy", icon: GraduationCap },
  { href: "/booking", label: "Rendez-vous", icon: Calendar },
  { href: "/contact", label: "Contact", icon: Mail },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => { const r = await fetch("/api/profile"); return r.json(); },
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setStudentMenuOpen(false);
  }, [location]);

  const [student, setStudentState] = useState(getStudent());
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  useEffect(() => {
    // Resynchroniser l'identité étudiant à chaque navigation
    setStudentState(getStudent());
  }, [location]);
  function handleStudentLogout() {
    clearStudentSession();
    setStudentState(null);
    setStudentMenuOpen(false);
    navigate("/");
  }

  // L'en-tête se cache en descendant, revient en remontant (jamais quand un menu est ouvert).
  const headerHidden = useAutoHideHeader(isMobileMenuOpen || studentMenuOpen);

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Orbes d'ambiance : dérive lente derrière tout le contenu. */}
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="orb animate-float-slow -top-44 -left-36 w-[36rem] h-[36rem] bg-primary/[0.07] dark:bg-primary/[0.12]" />
        <div className="orb animate-float-slower top-1/3 -right-44 w-[32rem] h-[32rem] bg-accent/[0.07] dark:bg-accent/[0.10]" />
      </div>
      <ScrollProgressBar />
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass-nav py-3" : "bg-transparent py-5"}`}
        animate={{ y: headerHidden ? "-115%" : "0%" }}
        transition={SPRING_SOFT}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tighter text-foreground hover:text-primary transition-colors flex items-center gap-2">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="Louis TATCHIDA" className="w-9 h-9 rounded-full object-cover border-2 border-primary/30 shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-serif italic text-lg">
                LT
              </div>
            )}
            Louis TATCHIDA
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  location === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                {location === item.href && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-primary/10"
                    transition={SPRING_STIFF}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            ))}
            {/* Menu étudiant (connecté) ou bouton Academy */}
            {student ? (
              <div className="relative ml-2">
                <button onClick={() => setStudentMenuOpen(o => !o)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {student.full_name?.split(" ").map((n: string) => n[0]).slice(0,2).join("") || "ET"}
                  </span>
                  <span className="text-sm font-medium text-primary max-w-[100px] truncate">{student.full_name?.split(" ")[0]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-primary transition-transform ${studentMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {studentMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setStudentMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border/60 rounded-2xl shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border/50">
                        <p className="text-sm font-medium truncate">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      </div>
                      <button onClick={() => { setStudentMenuOpen(false); navigate("/academy/dashboard"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                        <LayoutDashboard className="w-4 h-4 text-primary" /> Tableau de bord
                      </button>
                      <button onClick={() => { setStudentMenuOpen(false); navigate("/academy/profile"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                        <User className="w-4 h-4 text-primary" /> Mon profil
                      </button>
                      <button onClick={() => { setStudentMenuOpen(false); navigate("/elearning"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                        <GraduationCap className="w-4 h-4 text-primary" /> Mes cours
                      </button>
                      <button onClick={handleStudentLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left border-t border-border/50">
                        <LogOut className="w-4 h-4" /> Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/academy/login"
                  className="auth-enter ml-2 px-4 py-2 rounded-full text-sm font-medium border border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/70 transition-colors flex items-center gap-1.5">
                  <LogIn className="w-4 h-4" /> Se connecter
                </Link>
                <Link href="/academy/register"
                  className="auth-enter-delayed ml-2 px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm">
                  <UserPlus className="w-4 h-4" /> S'inscrire
                </Link>
              </>
            )}
          </nav>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </motion.header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-md lg:hidden pt-24 px-6 flex flex-col gap-3 overflow-y-auto pb-12">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-4 text-lg font-medium p-3.5 rounded-2xl transition-colors ${
                location === item.href ? "bg-primary/10 text-primary" : "text-foreground"
              }`}>
              <item.icon className="w-6 h-6" />
              {item.label}
            </Link>
          ))}
          <div className="h-px bg-border/50 my-2" />
          {student ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {student.full_name?.split(" ").map((n: string) => n[0]).slice(0,2).join("") || "ET"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                </div>
              </div>
              <Link href="/academy/dashboard" className="flex items-center gap-4 text-lg font-medium p-3.5 rounded-2xl text-foreground">
                <LayoutDashboard className="w-6 h-6 text-primary" /> Tableau de bord
              </Link>
              <Link href="/academy/profile" className="flex items-center gap-4 text-lg font-medium p-3.5 rounded-2xl text-foreground">
                <User className="w-6 h-6 text-primary" /> Mon profil
              </Link>
              <button onClick={handleStudentLogout} className="flex items-center gap-4 text-lg font-medium p-3.5 rounded-2xl text-destructive text-left">
                <LogOut className="w-6 h-6" /> Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/academy/register" className="auth-enter flex items-center gap-4 text-lg font-medium p-3.5 rounded-2xl bg-primary text-primary-foreground">
                <UserPlus className="w-6 h-6" /> S'inscrire
              </Link>
              <Link href="/academy/login" className="auth-enter-delayed flex items-center gap-4 text-lg font-medium p-3.5 rounded-2xl border border-primary/40 text-primary">
                <LogIn className="w-6 h-6" /> Se connecter
              </Link>
            </>
          )}
        </div>
      )}

      <main className="relative z-10 flex-1 pt-24 pb-12 w-full">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={location}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </main>
      <TermsPopup />
      <NewsletterPopup />

      <footer className="relative z-10 border-t border-border/50 py-12 mt-auto bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Louis TATCHIDA</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Agronome & Expert en Finance Agricole. Résilience climatique et digitalisation des systèmes agricoles en Afrique de l'Ouest.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/research" className="hover:text-primary transition-colors">Recherche & Projets</Link></li>
              <li><Link href="/publications" className="hover:text-primary transition-colors">Publications</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors">Blog Scientifique</Link></li>
              <li><Link href="/stats" className="hover:text-primary transition-colors">Statistiques</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">À propos</Link></li>
              <li><a href="/api/rss" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Flux RSS</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/booking" className="hover:text-primary transition-colors">Prendre rendez-vous</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Formulaire de contact</Link></li>
              <li><a href="mailto:contact@louisfarm.com" className="hover:text-primary transition-colors">contact@louisfarm.com</a></li>
              <li><span>+228 92 54 88 38</span></li>
            </ul>
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Newsletter</p>
              <Newsletter />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Louis TATCHIDA. Tous droits réservés.</p>
          <p className="mt-2 md:mt-0">Lomé, Togo</p>
        </div>
      </footer>
    </div>
  );
}
