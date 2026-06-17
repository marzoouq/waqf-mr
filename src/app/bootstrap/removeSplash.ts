/**
 * إزالة شاشة البداية بأمان بعد render.
 * R7 (W1): إزالة سباق `setTimeout(500)` المتوازي مع `transitionend`؛
 * نعتمد على `transitionend` أولاً، مع fallback 2s فقط إن لم يصدر الحدث (متصفح بلا تحريك).
 */
export function removeSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  let removed = false;
  const safeRemove = () => {
    if (removed) return;
    removed = true;
    splash.remove();
  };
  splash.style.opacity = '0';
  splash.addEventListener('transitionend', safeRemove, { once: true });
  // fallback: لو لم يصدر transitionend (no transition / متصفح قديم)
  setTimeout(safeRemove, 2000);
}
