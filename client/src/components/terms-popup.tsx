import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Shield, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { signalerResolution, EVT_CONDITIONS_RESOLUES } from "@/hooks/use-consent-gate";
import { CONDITIONS } from "@shared/conditions";

export function TermsPopup() {
  const [show, setShow] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    // Le stockage local n'est pas toujours joignable — navigation privée stricte, données de
    // site bloquées : l'accès LÈVE au lieu de renvoyer null. Même durcissement que partout
    // ailleurs. En cas d'échec on montre la fenêtre : redemander l'accord vaut mieux que le
    // supposer donné.
    try { if (localStorage.getItem("terms_accepted")) return; } catch { /* stockage indisponible */ }

    // Show immediately on first visit
    setShow(true);
  }, []);

  const handleAccept = () => {
    try { localStorage.setItem("terms_accepted", "1"); } catch { /* stockage indisponible */ }
    setShow(false);
    signalerResolution(EVT_CONDITIONS_RESOLUES);
  };

  const handleDecline = () => {
    setShow(false);
    // Un refus ne se mémorise pas (on repose la question au prochain passage), mais il
    // libère quand même les fenêtres suivantes (cookies, newsletter) pour CETTE visite —
    // sans quoi elles attendraient indéfiniment une résolution qui ne viendra jamais.
    signalerResolution(EVT_CONDITIONS_RESOLUES);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        // Une carte de coin, jamais plein écran : elle ne doit pas empêcher de lire la page
        // en dessous. Elle grandit sur place quand on demande le détail (bouton « En savoir
        // plus »), au lieu d'ouvrir une seconde fenêtre — d'où le `layout` de framer-motion,
        // qui anime le changement de taille automatiquement.
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25 }}
          className={`fixed z-50 bottom-4 left-4 right-4 sm:right-auto ${showFull ? "sm:w-[26rem]" : "sm:w-96"} bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50 p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold">Conditions d'utilisation</h2>
              {showFull && <p className="text-xs text-muted-foreground mt-0.5">Détails complets des conditions</p>}
            </div>
            <button onClick={handleDecline} className="w-7 h-7 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {!showFull ? (
              <motion.div
                key="short"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-3"
              >
                <p className="text-sm text-muted-foreground leading-relaxed">
                  En continuant votre navigation, vous acceptez notre politique de confidentialité et nos conditions d'utilisation.
                </p>
                <button
                  onClick={() => setShowFull(true)}
                  className="text-xs font-medium text-primary hover:text-primary/80 inline-flex items-center gap-1"
                >
                  En savoir plus
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
                {/* Back button */}
                <div className="px-4 py-2 border-b border-border/50">
                  <button
                    onClick={() => setShowFull(false)}
                    className="text-xs font-medium text-primary hover:text-primary/80 inline-flex items-center gap-1"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Retour au résumé
                  </button>
                </div>

                {/* Full terms */}
                <ScrollArea className="max-h-[50vh] p-4">
                  <div className="space-y-5 pr-3">
                    {CONDITIONS.map((s, i) => (
                      <section key={s.titre} className="space-y-1.5">
                        <h3 className="text-sm font-semibold text-foreground">{i + 1}. {s.titre}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.corps}</p>
                      </section>
                    ))}

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 flex gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 dark:text-amber-200">
                        <p className="font-semibold mb-0.5">Important</p>
                        <p>En acceptant ces conditions, vous reconnaissez avoir lu et accepté l'ensemble de ces termes.</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex items-center gap-2.5 px-4 py-3 border-t border-border/50 cursor-pointer" onClick={() => setAccepted(!accepted)}>
                  <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="w-4 h-4 shrink-0" />
                  <label className="text-xs font-medium cursor-pointer flex-1">
                    J'accepte les conditions d'utilisation
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="border-t border-border/50 bg-muted/30 p-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDecline} className="flex-1 rounded-xl">
              Refuser
            </Button>
            <Button
              size="sm"
              disabled={showFull && !accepted}
              onClick={handleAccept}
              className="flex-1 rounded-xl"
            >
              {showFull ? "Accepter et continuer" : "J'accepte"}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
