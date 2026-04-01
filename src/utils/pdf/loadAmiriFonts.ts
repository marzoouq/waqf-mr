/**
 * Dynamically inject Amiri @font-face rules into the document.
 * Called on-demand before print/PDF views so the fonts are NOT
 * part of the critical rendering path.
 */
let injected = false;

export function loadAmiriFonts(): void {
  if (injected) return;
  injected = true;

  const style = document.createElement('style');
  style.textContent = `
@font-face {
  font-family: 'Amiri';
  src: url('/fonts/Amiri-Regular.woff2') format('woff2'),
       url('/fonts/Amiri-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Amiri';
  src: url('/fonts/Amiri-Bold.woff2') format('woff2'),
       url('/fonts/Amiri-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}`;
  document.head.appendChild(style);
}
