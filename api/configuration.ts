/**
 * Ce que le serveur sait de sa propre configuration.
 *
 * ── Pourquoi ce fichier existe ──
 *
 * Une variable d'environnement absente ne casse pas le site. Elle en éteint une partie,
 * en silence. Le `CRON_SECRET` a manqué des semaines sans qu'aucune page n'en souffre :
 * les pages s'affichaient, les étudiants s'inscrivaient, et les relances ne partaient
 * plus. La seule façon de s'en apercevoir était de deviner qu'il fallait regarder.
 *
 * Les variables qui manquent BRUYAMMENT n'ont pas besoin de ce tableau — sans
 * `SUPABASE_SERVICE_ROLE_KEY` rien ne répond, on le sait dans la minute. Celles qui
 * manquent silencieusement sont exactement celles listées ici.
 *
 * ── La règle absolue ──
 *
 * On rapporte des PRÉSENCES, jamais des valeurs. Un écran d'administration qui affiche
 * une clé secrète la recopie dans un cache de navigateur, dans une capture d'écran, dans
 * un partage d'écran pendant une réunion. `valeur` n'est renseigné que pour les réglages
 * qui n'ont rien de secret et dont la valeur EST le renseignement utile : l'environnement
 * de paiement, parce que confondre « sandbox » et « live » se paie en argent réel, et
 * l'adresse du site, parce qu'elle décide de celle du webhook.
 *
 * Cette règle est vérifiée par npm run verify:config, qui remplit l'environnement de
 * valeurs reconnaissables et refuse qu'une seule d'entre elles ressorte. C'est ce contrôle
 * qui protège le jour où quelqu'un ajoutera `valeur: process.env.FEDAPAY_SECRET_KEY`
 * « juste pour déboguer ».
 */
import { environnementFedapay } from "./fedapay.js";

export type EtatVariable = {
  nom: string;
  presente: boolean;
  role: string;
  consequence: string;
  /** Valeur affichable — réservée aux réglages non secrets. Voir la règle ci-dessus. */
  valeur?: string;
};

/** Les seuls noms dont la valeur a le droit de sortir. Toute autre est un secret. */
export const VARIABLES_AFFICHABLES = ["FEDAPAY_ENV", "SITE_URL"] as const;

export function configurationDuServeur(siteUrl: string): EtatVariable[] {
  const presente = (nom: string) => !!process.env[nom];
  return [
    {
      nom: "CRON_SECRET", presente: presente("CRON_SECRET"),
      role: "Autorise un ordonnanceur externe à lancer les tâches quotidiennes",
      consequence: "Les relances de vérification d'adresse et les alertes de retard ne partent pas. "
        + "Le filet GitHub Actions est inerte lui aussi : il s'authentifie avec ce même secret.",
    },
    {
      nom: "FEDAPAY_SECRET_KEY", presente: presente("FEDAPAY_SECRET_KEY"),
      role: "Crée les transactions chez l'opérateur de paiement",
      consequence: "Aucun paiement d'attestation ne peut s'ouvrir : l'étudiant reçoit « paiement impossible ».",
    },
    {
      nom: "FEDAPAY_WEBHOOK_SECRET", presente: presente("FEDAPAY_WEBHOOK_SECRET"),
      role: "Vérifie la signature des notifications de paiement",
      consequence: "Le pire cas : l'argent arrive chez l'opérateur et l'attestation ne se délivre jamais, "
        + "toute notification étant refusée faute de pouvoir en vérifier l'origine.",
    },
    {
      nom: "FEDAPAY_PUBLIC_KEY", presente: presente("FEDAPAY_PUBLIC_KEY"),
      role: "Ouvre le formulaire de paiement DANS le site, sans redirection",
      consequence: "Sans elle le paiement fonctionne encore, mais en envoyant l'étudiant "
        + "sur le site de l'opérateur — ce qui fait perdre du monde à l'étape la plus fragile.",
    },
    {
      nom: "FEDAPAY_ENV", presente: presente("FEDAPAY_ENV"),
      role: "Choisit l'environnement de paiement",
      consequence: "Absente, vaut « sandbox » : les paiements sont fictifs et aucun franc n'est encaissé.",
      valeur: environnementFedapay(),
    },
    {
      nom: "RESEND_API_KEY", presente: presente("RESEND_API_KEY"),
      role: "Envoie tous les emails du site",
      consequence: "Admissions, attestations, relances et alertes : plus rien ne part, sans erreur visible.",
    },
    {
      nom: "SITE_URL", presente: presente("SITE_URL"),
      role: "Adresse de référence pour les liens des emails et le QR des attestations",
      consequence: "Absente, les liens envoyés aux étudiants pointent vers l'adresse par défaut.",
      valeur: siteUrl,
    },
  ];
}
