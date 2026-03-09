import { useState, useEffect } from "react";
import { useSubscribe } from "@/hooks/use-newsletter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Mail, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function NewsletterPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const subscribe = useSubscribe();

  useEffect(() => {
    // Don't show if already subscribed or dismissed recently
    if (localStorage.getItem("newsletter_subscribed") || sessionStorage.getItem("newsletter_dismissed")) return;

    // Show after 45 seconds OR 60% scroll
    const timer = setTimeout(() => setShow(true), 45000);

    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 60) setShow(true);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("scroll", handleScroll); };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem("newsletter_dismissed", "1");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate(
      { email, name: name || undefined, source: "popup" },
      {
        onSuccess: () => {
          setDone(true);
          localStorage.setItem("newsletter_subscribed", "1");
          setTimeout(dismiss, 3000);
        },
      }
    );
  };

  if (dismissed || localStorage.getItem("newsletter_subscribed")) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[90vw] max-w-md bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground relative">
              <button onClick={dismiss} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">Newsletter</span>
              </div>
              <h3 className="text-xl font-bold">Ne manquez rien !</h3>
              <p className="text-sm opacity-80 mt-1">Articles, analyses et publications sur l'agriculture durable.</p>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {!done ? (
                  <motion.form key="form" onSubmit={handleSubmit} className="space-y-3" exit={{ opacity: 0 }}>
                    <Input
                      type="text"
                      placeholder="Votre prénom"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-10 h-11 rounded-xl"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={subscribe.isPending} className="w-full h-11 rounded-xl font-semibold">
                      {subscribe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "S'abonner gratuitement"}
                    </Button>
                    {subscribe.isError && (
                      <p className="text-sm text-center">
                        {subscribe.error.message === "Already subscribed"
                          ? <span className="text-primary">Vous êtes déjà abonné(e) !</span>
                          : <span className="text-destructive">{subscribe.error.message}</span>}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center">Pas de spam. Désabonnement en un clic.</p>
                  </motion.form>
                ) : (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="font-bold text-lg">Bienvenue {name || ""} !</p>
                    <p className="text-sm text-muted-foreground mt-1">Vous recevrez bientôt nos publications.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
