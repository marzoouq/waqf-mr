/**
 * تنظيف بيانات تقرير الأخطاء قبل إرسالها للخادم
 * يحذف PII المحتملة (tokens, query strings, absolute paths)
 */

/** يزيل query string وأي tokens محتملة من رابط */
function sanitizeUrl(url: string | null): string | null {
  if (!url) return url;
  try {
    const u = new URL(url, 'http://x');
    return `${u.origin === 'http://x' ? '' : u.origin}${u.pathname}`;
  } catch {
    return url.split('?')[0] ?? url;
  }
}

/**
 * يخفي المسارات المطلقة في stack trace:
 *  /home/user/project/src/foo.ts → /src/foo.ts
 *  http://host:5173/src/foo.ts:10:5 → /src/foo.ts:10:5
 * ثم يقص إلى 1000 محرف.
 */
function sanitizeStack(stack: string | null): string | null {
  if (!stack) return stack;
  return stack
    .replace(/https?:\/\/[^/\s)]+/g, '') // يزيل origin
    .replace(/(?:\/[A-Za-z0-9._-]+){2,}\/src\//g, '/src/') // يقصر absolute paths
    .slice(0, 1000);
}

function sanitizeUa(ua: string | null): string | null {
  if (!ua) return ua;
  return ua.slice(0, 200);
}

export interface RawErrorMetadata {
  error_name: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  url: string | null;
  user_agent: string | null;
  timestamp: string;
}

export function sanitizeErrorMetadata(m: RawErrorMetadata): RawErrorMetadata {
  return {
    error_name: m.error_name.slice(0, 200),
    error_message: m.error_message.slice(0, 500),
    error_stack: sanitizeStack(m.error_stack),
    component_stack: sanitizeStack(m.component_stack),
    url: sanitizeUrl(m.url),
    user_agent: sanitizeUa(m.user_agent),
    timestamp: m.timestamp,
  };
}
