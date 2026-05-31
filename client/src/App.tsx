import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import About from "@/pages/about";
import Research from "@/pages/research";
import BlogList from "@/pages/blog";
import BlogPost from "@/pages/post";
import Publications from "@/pages/publications";
import FAQ from "@/pages/faq";
import Booking from "@/pages/booking";
import Contact from "@/pages/contact";
import ELearning from "@/pages/elearning";

// DataMEAL Academy
import AcademyRegister from "@/pages/academy/register";
import AcademyLogin from "@/pages/academy/login";
import AcademyDashboard from "@/pages/academy/dashboard";
import AcademyClassroom from "@/pages/academy/classroom";
import AcademyVerify from "@/pages/academy/verify";
import AcademyForgotPassword from "@/pages/academy/forgot-password";
import AcademyResetPassword from "@/pages/academy/reset-password";
import AcademyProfile from "@/pages/academy/profile";
import VerifyCertificate from "@/pages/academy/verify-certificate";
import AcademyLive from "@/pages/academy/live";

// Admin
import AdminLogin from "@/pages/admin/login";
import Dashboard, { AdminLayout } from "@/pages/admin/dashboard";
import AdminPosts from "@/pages/admin/posts";
import AdminPublications from "@/pages/admin/publications-admin";
import AdminAppointments from "@/pages/admin/appointments-admin";
import AdminMessages from "@/pages/admin/messages-admin";
import AdminSubscribers from "@/pages/admin/subscribers-admin";
import AdminComments from "@/pages/admin/comments-admin";
import AdminProfile from "@/pages/admin/profile-admin";
import AdminNewsletter from "@/pages/admin/newsletter-admin";
import AdminTestimonials from "@/pages/admin/testimonials-admin";
import AdminStudents from "@/pages/admin/students-admin";
import AdminMeetings from "@/pages/admin/meetings-admin";
import Stats from "@/pages/stats";
import { getToken } from "@/lib/admin";
import { useEffect } from "react";
import { CookieConsent } from "@/components/cookie-consent";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!getToken()) navigate("/admin/login");
  }, [navigate]);
  if (!getToken()) return null;
  return <AdminLayout>{children}</AdminLayout>;
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <CookieConsent />
          <Switch>
            {/* Admin routes — must be before public catch-all */}
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/admin">{() => <RequireAuth><Dashboard /></RequireAuth>}</Route>
            <Route path="/admin/profile">{() => <RequireAuth><AdminProfile /></RequireAuth>}</Route>
            <Route path="/admin/posts">{() => <RequireAuth><AdminPosts /></RequireAuth>}</Route>
            <Route path="/admin/publications">{() => <RequireAuth><AdminPublications /></RequireAuth>}</Route>
            <Route path="/admin/appointments">{() => <RequireAuth><AdminAppointments /></RequireAuth>}</Route>
            <Route path="/admin/messages">{() => <RequireAuth><AdminMessages /></RequireAuth>}</Route>
            <Route path="/admin/subscribers">{() => <RequireAuth><AdminSubscribers /></RequireAuth>}</Route>
            <Route path="/admin/comments">{() => <RequireAuth><AdminComments /></RequireAuth>}</Route>
            <Route path="/admin/newsletter">{() => <RequireAuth><AdminNewsletter /></RequireAuth>}</Route>
            <Route path="/admin/testimonials">{() => <RequireAuth><AdminTestimonials /></RequireAuth>}</Route>
            <Route path="/admin/students">{() => <RequireAuth><AdminStudents /></RequireAuth>}</Route>
            <Route path="/admin/meetings">{() => <RequireAuth><AdminMeetings /></RequireAuth>}</Route>

            {/* DataMEAL Academy — espace étudiant (pas de Layout admin) */}
            <Route path="/academy/register">{() => <Layout><AcademyRegister /></Layout>}</Route>
            <Route path="/academy/login">{() => <Layout><AcademyLogin /></Layout>}</Route>
            <Route path="/academy/dashboard">{() => <Layout><AcademyDashboard /></Layout>}</Route>
            <Route path="/academy/classroom/:id">{() => <Layout><AcademyClassroom /></Layout>}</Route>
            <Route path="/academy/verify">{() => <Layout><AcademyVerify /></Layout>}</Route>
            <Route path="/academy/forgot-password">{() => <Layout><AcademyForgotPassword /></Layout>}</Route>
            <Route path="/academy/reset-password">{() => <Layout><AcademyResetPassword /></Layout>}</Route>
            <Route path="/academy/profile">{() => <Layout><AcademyProfile /></Layout>}</Route>
            <Route path="/academy/verify-certificate/:certNo">{() => <Layout><VerifyCertificate /></Layout>}</Route>
            <Route path="/academy/verify-certificate">{() => <Layout><VerifyCertificate /></Layout>}</Route>
            <Route path="/academy/live/:id">{() => <Layout><AcademyLive /></Layout>}</Route>

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

            <Route>{() => <Layout><NotFound /></Layout>}</Route>
          </Switch>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
