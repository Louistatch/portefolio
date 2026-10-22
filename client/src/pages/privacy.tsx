import { SEO } from "@/components/seo";
import { Shield } from "lucide-react";
import { CONDITIONS } from "@shared/conditions";

// Le bandeau cookies annonçait « notre politique de confidentialité » et pointait vers une
// page qui n'existait pas. Le texte, lui, existait — enfermé dans la fenêtre d'acceptation,
// laquelle ne se rouvre jamais une fois acceptée. Cette page lui donne une adresse stable,
// citable depuis un email ou un bandeau, et lisible après coup.

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <SEO
        title="Conditions d'utilisation et confidentialité — LouisFarm"
        description="Conditions d'utilisation du site, traitement des données personnelles et politique de confidentialité."
      />

      <header className="mb-10">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
          <Shield className="w-4 h-4" aria-hidden="true" /> Mentions légales
        </span>
        <h1 className="titre-affichage text-3xl sm:text-4xl font-semibold mt-3">
          Conditions d'utilisation et confidentialité
        </h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          Ce que ce site propose, ce qu'il fait de vos données, et ce que vous acceptez en
          l'utilisant.
        </p>
      </header>

      <div className="space-y-8">
        {CONDITIONS.map((s, i) => (
          <section key={s.titre}>
            <h2 className="text-base font-semibold mb-1.5">
              <span className="text-muted-foreground chiffres-tabulaires mr-2">{i + 1}.</span>
              {s.titre}
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">{s.corps}</p>
          </section>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mt-12 pt-6 border-t border-border/60">
        Une question sur le traitement de vos données ? Écrivez-nous depuis la{" "}
        <a href="/contact" className="text-primary underline underline-offset-2">page de contact</a>.
      </p>
    </div>
  );
}
