/**
 * RouteHead — per-route SEO head tags (title, description, canonical, og:*).
 * Uses react-helmet-async to override the static tags shipped in index.html.
 */
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://waqf-wise.net';
const SITE_NAME = 'نظام إدارة الوقف | وقف مرزوق بن علي الثبيتي';

interface RouteHeadProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export function RouteHead({ title, description, path, noindex }: RouteHeadProps) {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title.includes('نظام إدارة الوقف') ? title : `${title} | نظام إدارة الوقف`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
