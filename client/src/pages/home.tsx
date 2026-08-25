import { Link } from "wouter";
import { ArrowRight, LineChart, Map, GraduationCap, Calendar, Clock, Eye } from "lucide-react";
import { SEO } from "@/components/seo";
import { useQuery } from "@tanstack/react-query";
import { Testimonials } from "@/components/testimonials";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { estimateReadingTime } from "@/components/reading-progress";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Page d'accueil — direction institutionnelle.
 *
 * Le premier lecteur à convaincre n'est pas un visiteur curieux, c'est un chargé de
 * programme d'ONG ou un analyste de banque qui décide s'il y a matière à une mission. Trois
 * choix en découlent, et ils vont ensemble :
 *
 *   1. Les coordonnées sont visibles avant tout le reste. Un bailleur vérifie d'abord qu'il
 *      y a quelqu'un de joignable derrière le site.
 *   2. Ce qui se compare s'affiche en tableau, pas en cartes. Un catalogue de cursus ou un
 *      barème se lisent en descendant une colonne ; en cartes, l'œil relit trois fois.
 *   3. Chaque chiffre porte sa provenance — la donnée réglementaire est datée, la donnée de
 *      portefeuille est annoncée fictive. C'est la règle d'écriture du cursus FCA-01, où le
 *      « chiffre orphelin » fait écarter un dossier ; elle vaut aussi pour la vitrine.
 *
 * Les compteurs viennent de /api/site-figures et non du JSX : un cours ajouté se compte
 * tout seul, et la vitrine ne peut pas annoncer un catalogue périmé.
 */

interface Profile {
  full_name: string; title: string; bio: string; photo_url: string;
  email?: string; phone?: string; location?: string;
}

interface Figures {
  cours: number; lecons: number; admis: number; attestations: number; anneesExperience: number;
}

/** Un chiffre de la bande de preuve. Le libellé tient sur deux lignes courtes, jamais une. */
function Chiffre({ valeur, libelle, dernier }: { valeur: string; libelle: string; dernier?: boolean }) {
  return (
    <div className={`py-5 pr-5 ${dernier ? "" : "border-r border-border"} ${dernier ? "pl-5" : ""}`}>
      <div className="font-serif text-3xl font-semibold text-primary leading-none">{valeur}</div>
      <div className="text-xs text-muted-foreground mt-2 leading-snug">{libelle}</div>
    </div>
  );
}

/** Un domaine d'intervention : ce qu'on fait, et le livrable qui en sort. */
function Domaine({ icone: Icone, titre, texte, livrable }: {
  icone: any; titre: string; texte: string; livrable: string;
}) {
  return (
    <div className="border-t-2 border-primary pt-5">
      <Icone className="w-[22px] h-[22px] text-primary" strokeWidth={1.6} />
      <h3 className="text-base font-bold mt-3.5 mb-2">{titre}</h3>
      <p className="text-sm leading-relaxed text-foreground/80 mb-3.5">{texte}</p>
      <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">{livrable}</p>
    </div>
  );
}

export default function Home() {
  const { data: profile } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => { const r = await fetch("/api/profile"); return r.json(); },
  });

  const { data: posts, isLoading } = useQuery<any[]>({
    queryKey: ["posts"],
    queryFn: async () => { const r = await fetch("/api/posts"); return r.json(); },
  });

  const { data: chiffres } = useQuery<Figures>({
    queryKey: ["site-figures"],
    queryFn: async () => { const r = await fetch("/api/site-figures"); return r.json(); },
    staleTime: 10 * 60_000,
  });

  const nom = profile?.full_name || "Louis TATCHIDA";

  return (
    <>
      <SEO title="Accueil" description="Louis TATCHIDA — Agronome & Expert en Finance Agricole. Analyse du risque climatique appliquée au crédit agricole, suivi-évaluation et formation en Afrique de l'Ouest." path="/" />

      {/* ───── Hero ───── */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-14 lg:pt-16">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">

          <div className="lg:col-span-7 min-w-0">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-7 h-px bg-accent" />
              <span className="text-[11px] tracking-[0.14em] uppercase text-primary font-bold">
                Résilience climatique &amp; crédit agricole
              </span>
            </div>

            <h1 className="font-serif text-4xl lg:text-5xl font-semibold leading-[1.14] tracking-tight mb-5 text-pretty">
              Chiffrer ce qu'une mauvaise saison coûte à un portefeuille de crédit
            </h1>

            <p className="text-base lg:text-[17px] leading-relaxed text-foreground/80 mb-8 max-w-2xl text-pretty">
              {chiffres?.anneesExperience ?? 12} ans de terrain en Afrique de l'Ouest, entre agronomie et finance
              agricole&nbsp;: conception de dispositifs de suivi-évaluation, analyse du risque climatique
              appliquée au crédit, et formation des équipes qui les tiennent après mon départ.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link href="/booking" className="inline-flex items-center px-6 py-3.5 text-[15px] font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Discuter d'une mission
              </Link>
              <Link href="/publications" className="inline-flex items-center px-6 py-3.5 text-[15px] font-semibold border border-border rounded-lg hover:bg-muted transition-colors">
                Voir les publications
              </Link>
            </div>

            {/* Bande de preuve. Chaque nombre est calculé, aucun n'est écrit dans le JSX. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-border">
              <Chiffre valeur={String(chiffres?.anneesExperience ?? 12)} libelle="années de terrain post-diplôme" />
              <Chiffre valeur={String(chiffres?.admis ?? 0)} libelle="professionnels admis en formation" />
              <Chiffre valeur={String(chiffres?.cours ?? 0)} libelle="cursus certifiants en ligne" />
              <Chiffre valeur={String(chiffres?.lecons ?? 0)} libelle="leçons évaluées et corrigées" dernier />
            </div>
          </div>

          {/* Fiche d'identité : ce qu'un chargé de programme recopie dans sa note. */}
          <div className="lg:col-span-5 min-w-0">
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="flex gap-4 p-5 border-b border-border">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt={nom}
                    className="w-[76px] h-[92px] rounded-md object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-[76px] h-[92px] rounded-md bg-muted border border-border shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-serif text-lg font-semibold leading-tight">{nom}</div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mt-1.5">
                    {profile?.title || "Agronome, expert en finance agricole. Résilience climatique & digitalisation des systèmes agricoles."}
                  </p>
                </div>
              </div>
              <table className="w-full text-[13px]">
                <tbody>
                  {[
                    ["Base", profile?.location || "Lomé, Togo"],
                    ["Zone d'intervention", "Afrique de l'Ouest"],
                    ["Langues de travail", "Français, anglais"],
                    ["Outils", "KoboToolbox, QGIS, Python, Excel"],
                  ].map(([cle, valeur], i, arr) => (
                    <tr key={cle} className={i < arr.length - 1 ? "border-b border-muted" : ""}>
                      <td className="py-3 px-5 text-muted-foreground w-[42%]">{cle}</td>
                      <td className="py-3 px-5 font-medium">{valeur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Domaines d'intervention ───── */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex items-baseline gap-4 mb-7">
          <h2 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight">Domaines d'intervention</h2>
          <span className="flex-1 h-px bg-border" />
        </div>
        <div className="grid md:grid-cols-3 gap-7">
          <Domaine icone={LineChart} titre="Analyse du risque climatique"
            texte="Perte attendue d'un portefeuille de crédit agricole sous aléa climatique : EAD, PD, LGD, concentration, seuil de rentabilité sous plafond d'usure."
            livrable="Livrable : note d'analyse chiffrée et paramétrage du produit de garantie." />
          <Domaine icone={Map} titre="Suivi-évaluation (MEAL)"
            texte="Conception de la collecte, cartographie des bénéficiaires et automatisation du reporting — de la question d'évaluation au rapport qui se met à jour tout seul."
            livrable="Livrable : chaîne opérationnelle Kobo → QGIS → rapport, transférée à l'équipe." />
          <Domaine icone={GraduationCap} titre="Formation des équipes"
            texte="Cursus certifiants en ligne et formation de formateurs en milieu rural, évalués par exercices corrigés et travaux de groupe, pas par attestation de présence."
            livrable="Livrable : agents autonomes, avec relevé de notes vérifiable." />
        </div>
      </section>

      {/* ───── Note de veille ─────
          La section qui fait la différence devant une banque : un fait daté, sourcé, et sa
          conséquence chiffrée. Les deux natures de chiffres ne sont jamais mélangées. */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-foreground text-background rounded-lg p-8 lg:p-11">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-5 min-w-0">
              <div className="text-[11px] tracking-[0.14em] uppercase text-accent font-bold mb-3.5">
                Note de veille — juin 2026
              </div>
              <h2 className="font-serif text-2xl lg:text-3xl font-semibold leading-tight mb-4 text-pretty text-background">
                Le plafond d'usure passe de 27&nbsp;% à 24&nbsp;%
              </h2>
              <p className="text-sm leading-relaxed text-background/60">
                Trois points de moins, et une part du portefeuille agricole cesse d'être finançable.
                L'analyse ci-contre porte sur un portefeuille de démonstration&nbsp;; la méthode, elle,
                s'applique au vôtre.
              </p>
            </div>

            <div className="lg:col-span-7 min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="border-b border-background/20">
                      <th className="text-left pb-3 text-[11px] tracking-[0.1em] uppercase text-background/50 font-semibold">Indicateur</th>
                      <th className="text-right pb-3 text-[11px] tracking-[0.1em] uppercase text-background/50 font-semibold">Saison normale</th>
                      <th className="text-right pb-3 text-[11px] tracking-[0.1em] uppercase text-background/50 font-semibold">Saison déficitaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Perte attendue du portefeuille", "4,2 %", "13,5 %", "rouge"],
                      ["Part finançable sous plafond 24 %", "—", "7 %", "rouge"],
                      ["Garantie nécessaire pour repasser sous la barre", "—", "48 %", "vert"],
                      ["Emprunteurs exclus sans garantie", "—", "600", "rouge"],
                    ].map(([libelle, normale, deficit, ton], i, arr) => (
                      <tr key={libelle} className={i < arr.length - 1 ? "border-b border-background/10" : ""}>
                        <td className="py-3.5 text-background/80">{libelle}</td>
                        <td className="py-3.5 text-right font-semibold">{normale}</td>
                        <td className={`py-3.5 text-right font-bold ${ton === "vert" ? "text-emerald-300" : "text-red-300"}`}>
                          {deficit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-background/50 mt-4 leading-relaxed">
                Portefeuille de démonstration, chiffres fictifs annoncés comme tels — utilisés dans le
                cursus FCA-01. Le plafond d'usure, lui, est une donnée réglementaire datée du
                1<sup>er</sup> juin 2026.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Cursus certifiants ───── */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex items-baseline gap-4 mb-6">
          <h2 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight">Cursus certifiants</h2>
          <span className="flex-1 h-px bg-border" />
          <Link href="/elearning" className="text-[13px] font-semibold text-primary hover:text-accent transition-colors shrink-0">
            Voir la formation
          </Link>
        </div>
        <div className="border border-border rounded-lg bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead className="bg-muted">
              <tr>
                <th className="text-left py-3 px-5 text-[11px] tracking-[0.08em] uppercase text-muted-foreground font-bold w-36">Code</th>
                <th className="text-left py-3 px-5 text-[11px] tracking-[0.08em] uppercase text-muted-foreground font-bold">Cursus</th>
                <th className="text-left py-3 px-5 text-[11px] tracking-[0.08em] uppercase text-muted-foreground font-bold">Titre délivré</th>
                <th className="text-right py-3 px-5 text-[11px] tracking-[0.08em] uppercase text-muted-foreground font-bold w-24">Leçons</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["MEAL-01…03", "Cursus MEAL — collecte, cartographie, reporting automatisé", "Certificat Super-Expert MEAL", "20"],
                ["FCA-01", "Analyse du risque climatique appliquée au crédit agricole", "Certificat d'Analyste du Risque Climatique Agricole", "6"],
                ["TOF-FIN-01", "Formation de formateurs — gestion financière paysanne", "Attestation de fin de parcours", "12"],
              ].map(([code, titre, credential, lecons]) => (
                <tr key={code} className="border-t border-border">
                  <td className="py-4 px-5 font-mono text-[13px] text-primary font-semibold whitespace-nowrap">{code}</td>
                  <td className="py-4 px-5 font-semibold">{titre}</td>
                  <td className="py-4 px-5 text-foreground/80">{credential}</td>
                  <td className="py-4 px-5 text-right text-muted-foreground">{lecons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───── Journal ───── */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex items-baseline gap-4 mb-6">
          <h2 className="font-serif text-2xl lg:text-[28px] font-semibold tracking-tight">Journal</h2>
          <span className="flex-1 h-px bg-border" />
          <Link href="/blog" className="text-[13px] font-semibold text-primary hover:text-accent transition-colors shrink-0 inline-flex items-center gap-1">
            Tous les articles <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {(posts || []).slice(0, 3).map((post: any) => (
              <Link key={post.id} href={`/blog/${post.slug}`}
                className="group border border-border rounded-lg bg-card p-5 hover:border-primary/40 transition-colors flex flex-col">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {post.published_at ? format(new Date(post.published_at), "d MMM yyyy", { locale: fr }) : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {estimateReadingTime(post.content || "")} min
                  </span>
                  {post.views_count > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="w-3 h-3" />{post.views_count}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-lg font-semibold leading-snug mb-2 group-hover:text-primary transition-colors text-pretty">
                  {post.title}
                </h3>
                {post.summary && (
                  <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-3">{post.summary}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <Testimonials />

      {/* ───── Un seul appel à l'action, répété ───── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-primary rounded-lg p-8 lg:p-11 flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="flex-1">
            <h2 className="font-serif text-2xl lg:text-[28px] font-semibold text-primary-foreground mb-2.5 leading-tight text-pretty">
              Un portefeuille à évaluer, une équipe à former&nbsp;?
            </h2>
            <p className="text-[15px] leading-relaxed text-primary-foreground/75 max-w-2xl">
              Dites-moi ce que vous cherchez à établir et sur quelles données. Je réponds avec une
              proposition de méthode et un calendrier, pas avec une plaquette.
            </p>
          </div>
          <Link href="/booking"
            className="inline-flex items-center justify-center px-7 py-4 text-[15px] font-bold text-primary bg-background rounded-lg hover:bg-background/90 transition-colors shrink-0 whitespace-nowrap">
            Prendre rendez-vous
          </Link>
        </div>
      </section>

    </>
  );
}
