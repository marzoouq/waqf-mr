/**
 * Public backend connection values (URL + publishable/anon key).
 * These are safe to ship in the browser bundle; data is protected by RLS.
 *
 * لماذا هذا الملف؟ ملف `.env` مُتجاهَل في `.gitignore` (ملف للقراءة فقط)،
 * فبناء النشر لا يجد القيم ويتوقف الموقع الحي على شاشة التحميل بخطأ
 * "supabaseUrl is required". نستخدم هذه القيم كاحتياط عند غيابها فقط.
 */
export const PUBLIC_BACKEND_ENV = {
  VITE_SUPABASE_PROJECT_ID: "epopjqrwsztgxigmgurj",
  VITE_SUPABASE_URL: "https://epopjqrwsztgxigmgurj.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwb3BqcXJ3c3p0Z3hpZ21ndXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDMzNDYsImV4cCI6MjA4NjE3OTM0Nn0.FwIobxP5-TbZf17UmJZGMmqUd3V_5OQTJcA2NYyMAbU",
} as const;

type BackendKey = keyof typeof PUBLIC_BACKEND_ENV;

/**
 * Returns `define` entries for any backend env var missing from the loaded env.
 * Values present in `.env` / process env always win.
 */
export function backendEnvFallbackDefines(
  loaded: Record<string, string | undefined>,
): Record<string, string> {
  const defines: Record<string, string> = {};
  (Object.keys(PUBLIC_BACKEND_ENV) as BackendKey[]).forEach((key) => {
    const current = loaded[key];
    if (!current || current.trim() === "") {
      defines[`import.meta.env.${key}`] = JSON.stringify(PUBLIC_BACKEND_ENV[key]);
    }
  });
  return defines;
}
