/**
 * Manual chunks configuration — مصدر وحيد لأسماء vendor chunks.
 * يُستورد من vite.config.ts وفي اختبارات build-chunks.
 */
const chunkRules: ReadonlyArray<{
  match: (id: string) => boolean;
  name: string;
}> = [
  { match: (id) => id.includes('node_modules/react-dom'), name: 'vendor-react' },
  { match: (id) => id.includes('node_modules/react/'), name: 'vendor-react' },
  {
    match: (id) =>
      id.includes('node_modules/react-router') ||
      id.includes('node_modules/turbo-stream') ||
      id.includes('node_modules/@remix-run/'),
    name: 'vendor-router',
  },
  { match: (id) => id.includes('node_modules/@radix-ui/'), name: 'vendor-radix' },
  { match: (id) => id.includes('node_modules/@supabase/'), name: 'vendor-supabase' },
  { match: (id) => id.includes('node_modules/@tanstack/'), name: 'vendor-query' },
  { match: (id) => id.includes('node_modules/lucide-react'), name: 'vendor-icons' },
  { match: (id) => id.includes('node_modules/zod'), name: 'vendor-form' },
  { match: (id) => id.includes('node_modules/date-fns'), name: 'vendor-date' },
  { match: (id) => id.includes('node_modules/sonner'), name: 'vendor-sonner' },
  { match: (id) => id.includes('node_modules/@dnd-kit/'), name: 'vendor-dnd' },
  { match: (id) => id.includes('node_modules/jspdf-autotable'), name: 'vendor-pdf-table' },
  {
    match: (id) =>
      id.includes('node_modules/canvg') ||
      id.includes('node_modules/rgbcolor') ||
      id.includes('node_modules/stackblur-canvas'),
    name: 'vendor-pdf-svg',
  },
  {
    match: (id) => id.includes('node_modules/jspdf') || id.includes('node_modules/arabic-reshaper'),
    name: 'vendor-pdf',
  },
  { match: (id) => id.includes('node_modules/recharts'), name: 'vendor-recharts' },
  {
    match: (id) => id.includes('node_modules/victory-vendor') || id.includes('node_modules/d3-'),
    name: 'vendor-d3',
  },
  {
    match: (id) =>
      id.includes('node_modules/react-markdown') ||
      id.includes('node_modules/remark-') ||
      id.includes('node_modules/rehype-') ||
      id.includes('node_modules/unified') ||
      id.includes('node_modules/mdast-') ||
      id.includes('node_modules/micromark') ||
      id.includes('node_modules/hast-') ||
      id.includes('node_modules/unist-'),
    name: 'vendor-markdown',
  },
  { match: (id) => id.includes('node_modules/qrcode'), name: 'vendor-qr' },
  {
    match: (id) =>
      id.includes('node_modules/class-variance-authority') ||
      id.includes('node_modules/clsx') ||
      id.includes('node_modules/tailwind-merge') ||
      id.includes('node_modules/cmdk') ||
      id.includes('node_modules/vaul') ||
      id.includes('node_modules/input-otp') ||
      id.includes('node_modules/embla-carousel') ||
      id.includes('node_modules/next-themes') ||
      id.includes('node_modules/react-resizable-panels'),
    name: 'vendor-ui-utils',
  },
  { match: (id) => id.includes('node_modules/@simplewebauthn/'), name: 'vendor-webauthn' },
];

export function getManualChunks(id: string): string | undefined {
  for (const rule of chunkRules) {
    if (rule.match(id)) return rule.name;
  }
  return undefined;
}

export const EXPECTED_CHUNK_NAMES: readonly string[] = [
  ...new Set(chunkRules.map((r) => r.name)),
].sort();
