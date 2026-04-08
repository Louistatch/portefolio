import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-card border border-border/60 rounded-2xl shadow-2xl p-5"
        >
          <div className="flex items-start gap-3 mb-4">
            <Cookie className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-1">Cookies & confidentialité</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ce site utilise des cookies pour améliorer votre expérience et analyser le trafic. En continuant, vous acceptez notre{" "}
                <a href="/privacy" className="text-primary underline underline-offset-2">politique de confidentialité</a>.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={accept} className="flex-1 rounded-xl">
              Accepter
            </Button>
            <Button size="sm" variant="outline" onClick={decline} className="flex-1 rounded-xl">
              Refuser
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
