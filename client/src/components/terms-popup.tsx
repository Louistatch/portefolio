import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Shield, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TermsPopup() {
  const [show, setShow] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    // Don't show if already accepted
    if (localStorage.getItem("terms_accepted")) return;

    // Show immediately on first visit
    setShow(true);
  }, []);

  const handleAccept = () => {
    if (accepted) {
      localStorage.setItem("terms_accepted", "1");
      setShow(false);
    }
  };

  const handleDecline = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-0"
          >
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50 p-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-primary shrink-0" />
                <div className="flex-1">
                  <h2 className="text-xl lg:text-2xl font-bold">Conditions d'utilisation</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {showFull ? "Détails complets des conditions" : "Veuillez accepter nos conditions avant de continuer"}
                  </p>
                </div>
                <button onClick={handleDecline} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
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
                    className="p-6 space-y-6"
                  >
                    {/* Short description */}
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Shield className="w-8 h-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Bienvenue sur notre site</h3>
                        <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
                          En continuant votre navigation, vous acceptez notre politique de confidentialité et nos conditions d'utilisation qui régissent l'utilisation de ce site web.
                        </p>
                      </div>
                    </div>

                    {/* Key points summary */}
                    <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                      <h4 className="font-medium text-sm">Ce que vous acceptez :</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Utilisation responsable du contenu</li>
                        <li>• Respect de la propriété intellectuelle</li>
                        <li>• Protection de vos données personnelles</li>
                        <li>• Modération des commentaires</li>
                      </ul>
                    </div>

                    {/* Learn more button */}
                    <Button
                      variant="ghost"
                      onClick={() => setShowFull(true)}
                      className="w-full text-primary hover:text-primary/80 hover:bg-primary/5"
                    >
                      En savoir plus sur nos conditions
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col max-h-[60vh]"
                  >
                    {/* Back button */}
                    <div className="px-6 py-3 border-b border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFull(false)}
                        className="text-primary hover:text-primary/80 hover:bg-primary/5"
                      >
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Retour au résumé
                      </Button>
                    </div>

                    {/* Full terms */}
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-6 pr-4">
                        <section className="space-y-2">
                          <h3 className="font-semibold text-foreground">1. Services proposés</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Ce site web fournit des informations, réflexions et analyses sur l'agriculture durable, la finance agricole, la résilience climatique et la digitalisation rurale en Afrique de l'Ouest. Les contenus sont à titre informatif uniquement.
                          </p>
                        </section>

                        <section className="space-y-2">
                          <h3 className="font-semibold text-foreground">2. Propriété intellectuelle</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Tous les contenus (textes, images, graphiques) sont protégés par la loi sur la propriété intellectuelle. Toute reproduction ou utilisation sans autorisation préalable est interdite.
                          </p>
                        </section>

                        <section className="space-y-2">
                          <h3 className="font-semibold text-foreground">3. Responsabilité</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Les informations fournies sont à titre informatif. Nous déclinons toute responsabilité quant aux dommages directs ou indirects résultant de l'utilisation de ce site.
                          </p>
                        </section>

                        <section className="space-y-2">
                          <h3 className="font-semibold text-foreground">4. Données personnelles</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Vos données personnelles sont collectées conformément à la politique de confidentialité. Nous respectons les réglementations en vigueur concernant la protection des données.
                          </p>
                        </section>

                        <section className="space-y-2">
                          <h3 className="font-semibold text-foreground">5. Commentaires</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Les commentaires doivent être respectueux. Nous nous réservons le droit de modérer ou supprimer les commentaires jugés inappropriés, offensants ou hors de propos.
                          </p>
                        </section>

                        <section className="space-y-2">
                          <h3 className="font-semibold text-foreground">6. Liens externes</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Ce site peut contenir des liens vers des sites externes. Nous ne sommes pas responsables du contenu ou de la politique de confidentialité de ces sites.
                          </p>
                        </section>

                        <section className="space-y-2">
                          <h3 className="font-semibold text-foreground">7. Modifications</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications seront notifiées aux utilisateurs via ce site.
                          </p>
                        </section>

                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-semibold mb-1">Important</p>
                            <p>En acceptant ces conditions, vous reconnaissez avoir lu et accepté l'ensemble de ces termes.</p>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div className="border-t border-border/50 bg-muted/30 p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setAccepted(!accepted)}>
                  <Checkbox checked={accepted} onCheckedChange={setAccepted} className="w-5 h-5" />
                  <label className="text-sm font-medium cursor-pointer flex-1">
                    J'accepte les conditions d'utilisation
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleDecline} className="flex-1">
                    Refuser
                  </Button>
                  <Button disabled={!accepted} onClick={handleAccept} className="flex-1">
                    Accepter et continuer
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
