import { SEO } from "@/components/seo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, BookOpen, Zap, HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

const faqData = {
  questions: [
    {
      q: "Qu'est-ce que l'agrofinance et comment elle fonctionne ?",
      a: "L'agrofinance est un ensemble de services financiers (crédits, épargne, assurance) spécialement conçus pour les agriculteurs et coopératives. Elle facilite l'accès au capital pour investir dans les intrants, équipements et digitalisation, tout en gérant les risques climatiques et de marché."
    },
    {
      q: "Comment créer une coopérative agricole structurée ?",
      a: "La création d'une coopérative nécessite : 1) Regrouper minimum 5 producteurs, 2) Définir les statuts, 3) Enregistrer auprès des autorités, 4) Mettre en place une gouvernance claire, 5) Implémenter des systèmes de gestion (comptabilité, stocks). Un accompagnement expert est recommandé pour les étapes juridiques et opérationnelles."
    },
    {
      q: "Comment accéder au financement agricole ?",
      a: "L'accès au financement passe par : 1) Formaliser l'entreprise (enregistrement, comptabilité), 2) Constituer un dossier solide (études de marché, plans financiers), 3) Proposer des garanties (titres, stocks), 4) Approcher des banques spécialisées ou institutions de microfinance, 5) Envisager des subventions/facilités gouvernementales."
    },
    {
      q: "Qu'est-ce que la résilience climatique en agriculture ?",
      a: "La résilience climatique désigne la capacité d'un système agricole à s'adapter et se rétablir face aux chocs climatiques (sécheresses, inondations). Elle comprend : pratiques agroécologiques, diversification des cultures, gestion de l'eau, utilisation de semences résilientes, et assurance climatique."
    },
    {
      q: "Comment digitaliser mon entreprise agricole ?",
      a: "La digitalisation agricole comprend : 1) Mettre en place des outils de gestion (erp, crm), 2) Utiliser des applications mobiles pour le suivi des cultures, 3) Accéder aux données météorologiques et prix de marché, 4) Automatiser la comptabilité, 5) Créer une plateforme de vente en ligne si applicable."
    },
    {
      q: "Quels sont les services d'expertise que vous proposez ?",
      a: "Je propose : diagnostic stratégique, structuration de coopératives, plans d'affaires agricoles, accès au financement, digitalisation d'entreprises, formations en agrofinance et gestion, ainsi que la mise en place de systèmes de suivi-évaluation."
    },
    {
      q: "Travaillez-vous avec des coopératives dans toute l'Afrique de l'Ouest ?",
      a: "Oui, j'interviens au Togo, Bénin, Ghana, Côte d'Ivoire et autres pays d'Afrique de l'Ouest. J'accompagne des coopératives sur la structuration, accès au financement, digitalisation et amélioration des rendements."
    },
    {
      q: "Comment calculer le ROI d'un investissement agricole ?",
      a: "Le calcul du ROI comprend : 1) Identifier les coûts initiaux (semences, engrais, équipements), 2) Estimer les revenus (rendement x prix de marché), 3) Déduire les coûts d'exploitation variés, 4) Calculer le profit net, 5) Diviser le profit par l'investissement initial. Il est recommandé de procéder à une analyse de sensibilité face aux variations de rendement et de prix."
    },
    {
      q: "Qu'est-ce que la finance verte et l'ESG en agriculture ?",
      a: "La finance verte/ESG finance des activités respectueuses de l'environnement avec critères Environnementaux, Sociaux et de Gouvernance. En agriculture, cela inclut l'agroécologie, l'accès équitable au foncier, le respect du travail et la transparence en chaîne de valeur."
    },
    {
      q: "Comment prendre rendez-vous pour une consultation ?",
      a: "Vous pouvez prendre rendez-vous via notre page dédiée en cliquant sur 'Rendez-vous', ou me contacter directement par email (contact@louisfarm.com) ou téléphone (+228 92 54 88 38). Je propose des consultations en ligne et en personne à Lomé."
    },
    {
      q: "Proposez-vous des formations en ligne ?",
      a: "Oui, je propose des formations sur l'agrofinance, la structuration de coopératives, la digitalisation, et la gestion agricole. Consultez ma page publications ou contactez-moi pour les calendriers et modalités."
    },
    {
      q: "Quelles sont vos publications récentes ?",
      a: "Vous pouvez consulter mes publications scientifiques et professionnelles sur la page dédiée. Elles couvrent l'agrofinance, la résilience climatique et l'impact de la digitalisation sur les petits producteurs."
    }
  ]
};

export default function FAQPage() {
  return (
    <>
      <SEO
        title="FAQ - Questions Fréquemment Posées"
        description="Réponses aux questions sur l'agrofinance, la résilience climatique, la digitalisation agricole et l'accompagnement en Afrique de l'Ouest."
        path="/faq"
        keywords="agrofinance, finance agricole, résilience climatique, digitalisation, coopérative agricole"
        faq={faqData}
      />

      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-2 border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4 mr-2" />
            Vos questions, nos réponses
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Questions Fréquemment Posées
          </h1>
          <p className="text-xl text-muted-foreground font-serif max-w-2xl mx-auto">
            Trouvez réponses à vos questions sur l'agrofinance, la résilience climatique et la digitalisation agricole.
          </p>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="p-6 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-colors">
            <Zap className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-2">Agrofinance</h3>
            <p className="text-sm text-muted-foreground">Financement, crédit et services financiers agricoles</p>
          </div>
          <div className="p-6 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-colors">
            <BookOpen className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-2">Digitalisation</h3>
            <p className="text-sm text-muted-foreground">Outils IT, applications mobiles et transformation numérique</p>
          </div>
          <div className="p-6 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-colors">
            <AlertCircle className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-2">Climat</h3>
            <p className="text-sm text-muted-foreground">Résilience climatique et pratiques durables</p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4 mb-16">
          <Accordion type="single" collapsible defaultValue="item-0" className="w-full space-y-3">
            {faqData.questions.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-card rounded-2xl border border-border/50 px-6 overflow-hidden hover:border-primary/30 transition-colors">
                <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors py-4">
                  <span className="text-base lg:text-lg">{faq.q}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4 pr-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-3xl border border-primary/20 p-8 lg:p-12 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold mb-4">Vous n'avez pas trouvé votre réponse ?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Contactez-moi directement ou prenez rendez-vous pour une consultation personnalisée.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">
              Formulaire de contact
            </Link>
            <Link href="/booking" className="inline-flex items-center px-6 py-3 border border-primary bg-background text-primary rounded-xl font-semibold hover:bg-primary/5 transition-all">
              Prendre rendez-vous
            </Link>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 pt-12 border-t border-border/50">
          <Alert className="bg-primary/5 border-primary/20">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              <strong>+ 11 ans d'expérience</strong> en agrofinance et digitalisation agricole en Afrique de l'Ouest. Accompagnement de <strong>3000+ agriculteurs</strong> et structuration de <strong>200+ coopératives</strong>.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </>
  );
}
