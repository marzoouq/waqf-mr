export const ALLOWED_ORIGINS = [
  "https://waqf-wise-net.lovable.app",
  "https://waqf-wise.net",
  "https://www.waqf-wise.net",
];

// Tighten patterns to only match THIS project's preview subdomains (project UUID: 29470216-3df1-468f-b021-5c98b75b2920)
export const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(?:id-preview--)?29470216-3df1-468f-b021-5c98b75b2920\.lovable\.app$/,
  /^https:\/\/(?:id-preview--)?29470216-3df1-468f-b021-5c98b75b2920\.lovableproject\.com$/,
];

function getAllowedOrigin(req?: Request): string {
  if (!req) return ALLOWED_ORIGINS[0];
  const origin = req.headers.get("origin") || "";
  if (
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin))
  ) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

export function getCorsHeaders(req?: Request) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  };
}

// DEPRECATED: All functions now use getCorsHeaders(req). Keeping for safety.
/** @deprecated Use getCorsHeaders(req) instead */
export const corsHeaders = getCorsHeaders();
