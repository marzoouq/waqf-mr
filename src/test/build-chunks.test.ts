/**
 * Snapshot صغير على أسماء chunks — يمنع كسراً صامتاً عند تعديل scripts/build-chunks.ts.
 * لتحديث الـ snapshot عن قصد: `npx vitest run -u src/test/build-chunks.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { EXPECTED_CHUNK_NAMES, getManualChunks } from '../../scripts/build-chunks';

describe('scripts/build-chunks', () => {
  it('يحافظ على مجموعة chunks الأساسية', () => {
    expect(EXPECTED_CHUNK_NAMES).toMatchInlineSnapshot(`
      [
        "vendor-d3",
        "vendor-date",
        "vendor-dnd",
        "vendor-form",
        "vendor-icons",
        "vendor-markdown",
        "vendor-pdf",
        "vendor-pdf-svg",
        "vendor-pdf-table",
        "vendor-qr",
        "vendor-query",
        "vendor-radix",
        "vendor-react",
        "vendor-recharts",
        "vendor-router",
        "vendor-sonner",
        "vendor-supabase",
        "vendor-ui-utils",
        "vendor-webauthn",
      ]
    `);
  });

  it('يوجّه react/react-dom إلى vendor-react', () => {
    expect(getManualChunks('x/node_modules/react/index.js')).toBe('vendor-react');
    expect(getManualChunks('x/node_modules/react-dom/client.js')).toBe('vendor-react');
  });

  it('يوجّه supabase إلى vendor-supabase', () => {
    expect(getManualChunks('x/node_modules/@supabase/supabase-js/dist.js')).toBe('vendor-supabase');
  });

  it('يعيد undefined لغير المتطابق', () => {
    expect(getManualChunks('x/src/App.tsx')).toBeUndefined();
  });
});
