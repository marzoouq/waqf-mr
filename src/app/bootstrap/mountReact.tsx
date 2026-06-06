/** تركيب جذر React مع fallback آمن عند فشل الإقلاع */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { logger } from '@/lib/logger';

const FALLBACK_HTML = `<div style="padding:2rem;text-align:center;font-family:sans-serif;direction:rtl"><h1>تعذّر تحميل التطبيق</h1><p>يرجى تحديث الصفحة. إذا استمرت المشكلة، تواصل مع الدعم.</p><button onclick="location.reload()" style="padding:0.5rem 1rem;cursor:pointer;margin-top:1rem">تحديث</button></div>`;

export function mountReact(): void {
  try {
    const rootEl = document.getElementById('root');
    if (!rootEl) throw new Error('Root element #root not found in DOM');

    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    logger.error('[BOOT] فشل الإقلاع:', error);
    const rootEl = document.getElementById('root');
    if (rootEl && !rootEl.hasChildNodes()) {
      rootEl.innerHTML = FALLBACK_HTML;
    }
  }
}
