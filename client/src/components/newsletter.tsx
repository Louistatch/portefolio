import { useState } from "react";
import { useSubscribe, useSubscriberCount } from "@/hooks/use-newsletter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, Loader2, Users, Sparkles, Bell, ArrowRight, BookOpen, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Compact newsletter (footer, sidebar) ──
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const subscribe = useSubscribe();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate(
      { email, name: name || undefined, source: "footer" },
      { onSuccess: () => { setDone(true); setEmail(""); setName(""); } }
    );
  };

  if (done) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3 text-primary font-medium py-2">
        <CheckCircle2 className="w-5 h-5" /> Bienvenue dans la communauté !
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 w-full max-w-md">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-background" required />
        </div>
        <Button type="submit" disabled={subscribe.isPending} size="sm">
          {subscribe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "S'abonner"}
        </Button>
      </div>
      {subscribe.isError && <p className="text-destructive text-xs">{subscribe.error.message === "Already subscribed" ? "Vous êtes déjà abonné(e) !" : subscribe.error.message}</p>}
    </form>
  );
}

// ── Hero newsletter section (home page) ──
export function NewsletterHero() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");
  const subscribe = useSubscribe();
  const { data: countData } = useSubscriberCount();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate(
      { email, name: name || undefined, source: "homepage" },
      { onSuccess: () => setStep("success") }
    );
  };

  const benefits = [
    { icon: BookOpen, text: "Articles exclusifs sur l'agriculture durable" },
    { icon: Zap, text: "Analyses de la finance agricole en Afrique" },
    { icon: Bell, text: "Alertes sur les nouvelles publications" },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 -z-10" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-4xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" /> Newsletter Gratuite
              </div>

              <h2 className="text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
                Restez à la pointe de<br />
                <span className="text-gradient">l'agriculture durable</span>
              </h2>

              <p className="text-xl text-muted-foreground font-serif max-w-2xl mx-auto mb-8">
                Rejoignez une communauté de professionnels passionnés par le développement agricole en Afrique. Recevez analyses, publications et insights directement dans votre boîte mail.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-10">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <b.icon className="w-4 h-4 text-primary" />
                    </div>
                    {b.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Input
                    type="text"
                    placeholder="Votre prénom (optionnel)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-card border-border/50 h-12 rounded-xl"
                  />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-card border-border/50 h-12 rounded-xl"
                    required
                  />
                </div>
                <Button type="submit" disabled={subscribe.isPending} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30">
                  {subscribe.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>S'abonner gratuitement <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
                {subscribe.isError && (
                  <p className="text-destructive text-sm mt-3">
                    {subscribe.error.message === "Already subscribed" ? "Vous êtes déjà abonné(e) ! Merci de votre fidélité." : subscribe.error.message}
                  </p>
                )}
              </form>

              {countData && countData.count > 0 && (
                <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Rejoint par <span className="font-semibold text-foreground">{countData.count}</span> abonné{countData.count > 1 ? "s" : ""}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4">Pas de spam. Désabonnement en un clic. Vos données restent privées.</p>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </motion.div>
              <h3 className="text-3xl font-bold mb-4">Bienvenue dans la communauté !</h3>
              <p className="text-lg text-muted-foreground font-serif max-w-md mx-auto mb-6">
                {name ? `Merci ${name} !` : "Merci !"} Vous recevrez bientôt les dernières publications et analyses sur l'agriculture durable en Afrique.
              </p>
              <p className="text-sm text-muted-foreground">Vérifiez votre boîte de réception (et les spams, au cas où).</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
