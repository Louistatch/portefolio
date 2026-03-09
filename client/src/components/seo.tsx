import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  type?: string;
  path?: string;
}

export function SEO({ 
  title, 
  description = "Louis Tatchida - Expert in Agriculture, Finance, Climate, and AI.", 
  type = "website",
  path = "/"
}: SEOProps) {
  const siteUrl = window.location.origin;
  const fullUrl = `${siteUrl}${path}`;
  const fullTitle = `${title} | Louis Tatchida`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* OpenGraph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
}
