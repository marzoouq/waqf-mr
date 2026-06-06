/** Preconnect إلى Supabase لتقليل زمن أول طلب بـ 50-100ms */
export function preconnectBackend(): void {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = supabaseUrl;
  document.head.appendChild(link);
}
