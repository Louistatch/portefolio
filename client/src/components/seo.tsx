import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  type?: string;
  path?: string;
  article?: { publishedTime?: string; tags?: string[] };
}

const SITE_NAME = "Louis Tatchida";
const DEFAULT_DESC = "Louis Tatchida - Expert in Agriculture, AI, Climate Finance, and Rural Digitalization.";

export function SEO({ title, description = DEFAULT_DESC, type = "website", path = "/", article }: SEOProps) {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = `${siteUrl}${path}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Louis Tatchida",
    jobTitle: "Agricultural AI Researcher & Consultant",
    url: siteUrl,
    sameAs: ["https://linkedin.com/in/louistatchida", "https://twitter.com/louistatchida"],
    knowsAbout: ["AI Agriculture", "Climate Agriculture", "Agricultural Finance", "Agricultural Insurance", "Rural Digitalization"],
  };

  const articleSchema = article ? {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: title,
    description,
    author: { "@type": "Person", name: "Louis Tatchida" },
    datePublished: article.publishedTime,
    keywords: article.tags?.join(", "),
    url: fullUrl,
  } : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="AI agriculture, climate agriculture, agricultural finance, agricultural insurance, rural digitalization" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <link rel="canonical" href={fullUrl} />
      {type === "website" && (
        <script type="application/ld+json">{JSON.stringify(personSchema)}</script>
      )}
      {articleSchema && (
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      )}
    </Helmet>
  );
}
