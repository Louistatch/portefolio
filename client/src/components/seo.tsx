import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  type?: string;
  path?: string;
  image?: string;
  article?: { publishedTime?: string; modifiedTime?: string; tags?: string[]; author?: string; content?: string };
}

const SITE_NAME = "Louis Tatchida";
const DEFAULT_DESC = "Louis Tatchida — Agronome, Expert en Finance Agricole et Digitalisation Rurale en Afrique de l'Ouest.";
const DEFAULT_IMAGE = "https://gcfcdkzmfybiigbnlwvb.supabase.co/storage/v1/object/public/images/og-default.png";

export function SEO({ title, description = DEFAULT_DESC, type = "website", path = "/", image, article }: SEOProps) {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = `${siteUrl}${path}`;
  const fullTitle = `${title} | ${SITE_NAME}`;
  const ogImage = image || DEFAULT_IMAGE;

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Louis Tatchida",
    jobTitle: "Agronome & Expert en Finance Agricole",
    url: siteUrl,
    sameAs: ["https://linkedin.com/in/louistatchida"],
    knowsAbout: ["Agriculture Durable", "Finance Agricole", "Résilience Climatique", "Digitalisation Rurale"],
  };

  const articleSchema = article ? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    image: {
      "@type": "ImageObject",
      url: ogImage,
      width: 1200,
      height: 630
    },
    author: { "@type": "Person", name: article.author || "Louis Tatchida", url: siteUrl },
    datePublished: article.publishedTime,
    dateModified: article.modifiedTime || article.publishedTime,
    keywords: article.tags?.join(", "),
    url: fullUrl,
    publisher: { "@type": "Person", name: "Louis Tatchida" },
    articleBody: article.content,
    inLanguage: "fr-FR",
    isPartOf: {
      "@type": "Blog",
      "@id": `${siteUrl}/blog`,
      name: "Blog de Louis Tatchida"
    }
  } : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {/* Open Graph — rich preview on Facebook, LinkedIn, WhatsApp, Telegram */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="fr_FR" />
      {article?.publishedTime && <meta property="article:published_time" content={article.publishedTime} />}
      {article?.author && <meta property="article:author" content={article.author} />}
      {article?.tags?.map(tag => <meta key={tag} property="article:tag" content={tag} />)}
      {/* Twitter Card — rich preview on X/Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <link rel="canonical" href={fullUrl} />
      <link rel="alternate" type="application/rss+xml" title="Louis TATCHIDA — Blog RSS" href="/api/rss" />
      {type === "website" && <script type="application/ld+json">{JSON.stringify(personSchema)}</script>}
      {articleSchema && <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>}
    </Helmet>
  );
}
