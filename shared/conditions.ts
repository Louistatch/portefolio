/**
 * Conditions d'utilisation et politique de confidentialité.
 *
 * Le texte vivait uniquement dans la fenêtre d'acceptation (components/terms-popup.tsx),
 * laquelle ne se rouvre jamais une fois acceptée : le visiteur qui cliquait ensuite
 * « politique de confidentialité » depuis le bandeau cookies tombait sur une page
 * inexistante, et plus aucun chemin ne menait à ce texte. Il vit donc ici, lu à la fois
 * par la fenêtre et par la page /privacy — une seule rédaction, deux affichages.
 */

export type SectionConditions = { titre: string; corps: string };

export const CONDITIONS: SectionConditions[] = [
  {
    titre: "Services proposés",
    corps:
      "Ce site web fournit des informations, réflexions et analyses sur l'agriculture durable, " +
      "la finance agricole, la résilience climatique et la digitalisation rurale en Afrique de " +
      "l'Ouest. Les contenus sont à titre informatif uniquement.",
  },
  {
    titre: "Propriété intellectuelle",
    corps:
      "Tous les contenus (textes, images, graphiques) sont protégés par la loi sur la propriété " +
      "intellectuelle. Toute reproduction ou utilisation sans autorisation préalable est interdite.",
  },
  {
    titre: "Responsabilité",
    corps:
      "Les informations fournies sont à titre informatif. Nous déclinons toute responsabilité " +
      "quant aux dommages directs ou indirects résultant de l'utilisation de ce site.",
  },
  {
    titre: "Données personnelles",
    corps:
      "Vos données personnelles sont collectées conformément à la politique de confidentialité. " +
      "Nous respectons les réglementations en vigueur concernant la protection des données.",
  },
  {
    titre: "Commentaires",
    corps:
      "Les commentaires doivent être respectueux. Nous nous réservons le droit de modérer ou " +
      "supprimer les commentaires jugés inappropriés, offensants ou hors de propos.",
  },
  {
    titre: "Liens externes",
    corps:
      "Ce site peut contenir des liens vers des sites externes. Nous ne sommes pas responsables " +
      "du contenu ou de la politique de confidentialité de ces sites.",
  },
  {
    titre: "Modifications",
    corps:
      "Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications " +
      "seront notifiées aux utilisateurs via ce site.",
  },
];
