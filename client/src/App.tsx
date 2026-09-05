import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout";
import Home from "@/pages/home";
const About = lazy(() => import("@/pages/about"));
const Research = lazy(() => import("@/pages/research"));
const BlogList = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/post"));
const Publications = lazy(() => import("@/pages/publications"));
const FAQ = lazy(() => import("@/pages/faq"));
const Booking = lazy(() => import("@/pages/booking"));
const Contact = lazy(() => import("@/pages/contact"));
const ELearning = lazy(() => import("@/pages/elearning"));

// LouisFarm Learning
const AcademyRegister = lazy(() => import("@/pages/academy/register"));
const AcademyLogin = lazy(() => import("@/pages/academy/login"));
const AcademyDashboard = lazy(() => import("@/pages/academy/dashboard"));
const AcademyClassroom = lazy(() => import("@/pages/academy/classroom"));
const AcademyLessonQuiz = lazy(() => import("@/pages/academy/lesson-quiz"));
const AcademyGroupWork = lazy(() => import("@/pages/academy/group-work"));
const AcademyVerify = lazy(() => import("@/pages/academy/verify"));
const AcademyForgotPassword = lazy(() => import("@/pages/academy/forgot-password"));
const AcademyResetPassword = lazy(() => import("@/pages/academy/reset-password"));
const AcademyProfile = lazy(() => import("@/pages/academy/profile"));
const AcademyGrades = lazy(() => import("@/pages/academy/grades"));
const AcademyCertifications = lazy(() => import("@/pages/academy/certifications"));
const AcademyAmbassador = lazy(() => import("@/pages/academy/ambassador"));
const VerifyCertificate = lazy(() => import("@/pages/academy/verify-certificate"));
const AcademyLive = lazy(() => import("@/pages/academy/live"));
const AcademyParcours = lazy(() => import("@/pages/academy/parcours"));
const AcademyProgramTest = lazy(() => import("@/pages/academy/program-test"));
const AcademyPaiement = lazy(() => import("@/pages/academy/paiement"));

// Admin
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const Dashboard = lazy(() => import("@/pages/admin/dashboard"));
import { AdminLayout } from "@/components/admin/admin-layout";
import { AcademyLayout } from "@/components/academy/academy-layout";
const AdminPosts = lazy(() => import("@/pages/admin/posts"));
const AdminPublications = lazy(() => import("@/pages/admin/publications-admin"));
const AdminAppointments = lazy(() => import("@/pages/admin/appointments-admin"));
const AdminMessages = lazy(() => import("@/pages/admin/messages-admin"));
const AdminSubscribers = lazy(() => import("@/pages/admin/subscribers-admin"));
const AdminComments = lazy(() => import("@/pages/admin/comments-admin"));
const AdminProfile = lazy(() => import("@/pages/admin/profile-admin"));
const AdminNewsletter = lazy(() => import("@/pages/admin/newsletter-admin"));
const AdminTestimonials = lazy(() => import("@/pages/admin/testimonials-admin"));
const AdminStudents = lazy(() => import("@/pages/admin/students-admin"));
const AdminMeetings = lazy(() => import("@/pages/admin/meetings-admin"));
const AdminStudentMessages = lazy(() => import("@/pages/admin/student-messages-admin"));
const AdminAmbassadors = lazy(() => import("@/pages/admin/ambassadors-admin"));
const AdminGroupWork = lazy(() => import("@/pages/admin/group-work-admin"));
const AdminSupport = lazy(() => import("@/pages/admin/support-admin"));
const AdminCourses = lazy(() => import("@/pages/admin/courses-admin"));
const Stats = lazy(() => import("@/pages/stats"));

// Centre d'aide — public : quelqu'un qui hésite à s'inscrire doit pouvoir lire comment se
// passe l'admission sans créer de compte. Le serveur élargit la liste des articles quand un
// jeton étudiant accompagne la requête.
const CentreAide = lazy(() => import("@/pages/aide"));
import { getToken, ADMIN_BASE } from "@/lib/admin";
import { isStudentLoggedIn } from "@/lib/student";
import { useEffect } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import { AideFlottante } from "@/components/support/aide-flottante";

function RequireGuard({ isAuthed, loginPath, children }: { isAuthed: () => unknown; loginPath: string; children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const authed = !!isAuthed();
  useEffect(() => {
    if (!authed) navigate(loginPath);
  }, [authed, navigate, loginPath]);
  if (!authed) return null;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  return (
    <RequireGuard isAuthed={getToken} loginPath={`${ADMIN_BASE}/login`}>
      <AdminLayout>{children}</AdminLayout>
    </RequireGuard>
  );
}

function RequireStudentAuth({ children }: { children: React.ReactNode }) {
  return (
    <RequireGuard isAuthed={isStudentLoggedIn} loginPath="/academy/login">
      {children}
    </RequireGuard>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <CookieConsent />
          {/* Chaque page arrive à la demande. Sans ce découpage, ouvrir la page d'accueil
              téléchargeait aussi les quinze écrans d'administration, la salle de cours et la
              salle de réunion en direct — 863 Ko pour en utiliser une fraction. */}
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }>
          <Switch>
            {/* Administration — avant le fourre-tout public. Le préfixe vient de ADMIN_BASE
                (client/src/lib/admin.ts) : l'ancien chemin `/admin` n'est volontairement
                plus servi du tout, pas même en redirection, sinon le renommage n'aurait
                rien renommé. */}
            <Route path={`${ADMIN_BASE}/login`} component={AdminLogin} />
            <Route path={ADMIN_BASE}>{() => <RequireAuth><Dashboard /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/profile`}>{() => <RequireAuth><AdminProfile /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/posts`}>{() => <RequireAuth><AdminPosts /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/publications`}>{() => <RequireAuth><AdminPublications /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/appointments`}>{() => <RequireAuth><AdminAppointments /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/messages`}>{() => <RequireAuth><AdminMessages /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/subscribers`}>{() => <RequireAuth><AdminSubscribers /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/comments`}>{() => <RequireAuth><AdminComments /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/newsletter`}>{() => <RequireAuth><AdminNewsletter /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/testimonials`}>{() => <RequireAuth><AdminTestimonials /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/students`}>{() => <RequireAuth><AdminStudents /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/meetings`}>{() => <RequireAuth><AdminMeetings /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/student-messages`}>{() => <RequireAuth><AdminStudentMessages /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/ambassadors`}>{() => <RequireAuth><AdminAmbassadors /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/group-work`}>{() => <RequireAuth><AdminGroupWork /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/support`}>{() => <RequireAuth><AdminSupport /></RequireAuth>}</Route>
            <Route path={`${ADMIN_BASE}/courses`}>{() => <RequireAuth><AdminCourses /></RequireAuth>}</Route>

            {/* LouisFarm Learning — espace étudiant (pas de Layout admin) */}
            <Route path="/academy/register">{() => <Layout><AcademyRegister /></Layout>}</Route>
            <Route path="/academy/login">{() => <Layout><AcademyLogin /></Layout>}</Route>
            <Route path="/academy/dashboard">{() => <RequireStudentAuth><AcademyLayout><AcademyDashboard /></AcademyLayout></RequireStudentAuth>}</Route>
            <Route path="/academy/classroom/:id">{() => <Layout><RequireStudentAuth><AcademyClassroom /></RequireStudentAuth></Layout>}</Route>
            <Route path="/academy/quiz/:courseId/:lessonId">{() => <Layout><RequireStudentAuth><AcademyLessonQuiz /></RequireStudentAuth></Layout>}</Route>
            <Route path="/academy/test/:id">{() => <RequireStudentAuth><AcademyLayout><AcademyProgramTest /></AcademyLayout></RequireStudentAuth>}</Route>
            <Route path="/academy/paiement/:courseId">{() => <RequireStudentAuth><AcademyLayout><AcademyPaiement /></AcademyLayout></RequireStudentAuth>}</Route>
            <Route path="/academy/parcours/:id">{() => <RequireStudentAuth><AcademyLayout><AcademyParcours /></AcademyLayout></RequireStudentAuth>}</Route>
            <Route path="/academy/group-work">{() => <RequireStudentAuth><AcademyLayout><AcademyGroupWork /></AcademyLayout></RequireStudentAuth>}</Route>
            {/* Publique : le lien de validation arrive par email et s'ouvre souvent sur un autre
                appareil/navigateur, où la session étudiant n'existe pas. Derrière un garde, le
                token de l'URL était perdu par la redirection et l'email n'était jamais validé. */}
            <Route path="/academy/verify">{() => <Layout><AcademyVerify /></Layout>}</Route>
            <Route path="/academy/forgot-password">{() => <Layout><AcademyForgotPassword /></Layout>}</Route>
            <Route path="/academy/reset-password">{() => <Layout><AcademyResetPassword /></Layout>}</Route>
            <Route path="/academy/profile">{() => <RequireStudentAuth><AcademyLayout><AcademyProfile /></AcademyLayout></RequireStudentAuth>}</Route>
            <Route path="/academy/grades">{() => <RequireStudentAuth><AcademyLayout><AcademyGrades /></AcademyLayout></RequireStudentAuth>}</Route>
            <Route path="/academy/certifications">{() => <RequireStudentAuth><AcademyLayout><AcademyCertifications /></AcademyLayout></RequireStudentAuth>}</Route>
            <Route path="/academy/ambassador">{() => <RequireStudentAuth><AcademyLayout><AcademyAmbassador /></AcademyLayout></RequireStudentAuth>}</Route>
            <Route path="/academy/verify-certificate/:certNo">{() => <Layout><VerifyCertificate /></Layout>}</Route>
            <Route path="/academy/verify-certificate">{() => <Layout><VerifyCertificate /></Layout>}</Route>
            {/* La salle de rencontre sort de Layout : c'est une surface plein écran, pas une
                page du site. En-tête public, pied de page et fenêtres modales par-dessus une
                séance en cours n'avaient rien à y faire — et le voile de la newsletter
                recouvrait littéralement la vidéo au bout de quarante-cinq secondes. */}
            <Route path="/academy/live/:id">{() => <RequireStudentAuth><AcademyLive /></RequireStudentAuth>}</Route>

            {/* Public routes */}
            <Route path="/">{() => <Layout><Home /></Layout>}</Route>
            <Route path="/about">{() => <Layout><About /></Layout>}</Route>
            <Route path="/research">{() => <Layout><Research /></Layout>}</Route>
            <Route path="/blog">{() => <Layout><BlogList /></Layout>}</Route>
            <Route path="/blog/:slug">{(params) => <Layout><BlogPost /></Layout>}</Route>
            <Route path="/publications">{() => <Layout><Publications /></Layout>}</Route>
            <Route path="/faq">{() => <Layout><FAQ /></Layout>}</Route>
            <Route path="/booking">{() => <Layout><Booking /></Layout>}</Route>
            <Route path="/contact">{() => <Layout><Contact /></Layout>}</Route>
            <Route path="/stats">{() => <Layout><Stats /></Layout>}</Route>
            <Route path="/elearning">{() => <Layout><ELearning /></Layout>}</Route>
            {/* L'article AVANT l'index : wouter sert la première route qui correspond, et
                `/aide` seul ne capte pas `/aide/mon-article`, mais l'ordre inverse rendrait
                la lecture du fichier trompeuse. Les deux mènent au même composant, qui
                distingue les deux cas avec useRoute. */}
            <Route path="/aide/:slug">{() => <Layout><CentreAide /></Layout>}</Route>
            <Route path="/aide">{() => <Layout><CentreAide /></Layout>}</Route>

            <Route>{() => <Layout><NotFound /></Layout>}</Route>
          </Switch>
          </Suspense>
          {/* Monté une seule fois pour toute l'application : la salle de cours n'utilise pas
              la coque de l'espace étudiant, et le poser dans la coque l'aurait fait
              disparaître de la page où l'on passe le plus de temps. Le composant décide
              lui-même où il s'affiche, et ne parle au serveur qu'après un clic. */}
          <AideFlottante />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
