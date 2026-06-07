/**
 * checkMeta — يربط id الفحص بمصدره ومرجعه التوثيقي.
 * يُستخدم في تصدير JSON الثري وفي UI للروابط.
 */
export interface CheckMeta {
  category: string;
  sourceFile: string;
  docAnchor: string; // مرجع داخل docs/diagnostics/check-catalog.md
}

const DOC_BASE = '/docs/diagnostics/check-catalog.md';
const SRC = (f: string) => `src/lib/diagnostics/checks/${f}`;

// خريطة id → metadata
export const CHECK_META: Record<string, CheckMeta> = {
  // قاعدة البيانات
  db_connection: { category: 'قاعدة البيانات', sourceFile: SRC('database.ts'), docAnchor: `${DOC_BASE}#db_connection` },
  db_realtime: { category: 'قاعدة البيانات', sourceFile: SRC('database.ts'), docAnchor: `${DOC_BASE}#db_realtime` },
  auth_session: { category: 'قاعدة البيانات', sourceFile: SRC('database.ts'), docAnchor: `${DOC_BASE}#auth_session` },
  // الأداء
  perf_scroll: { category: 'المتصفح والأداء', sourceFile: SRC('performance.ts'), docAnchor: `${DOC_BASE}#performance` },
  perf_dom_nodes: { category: 'المتصفح والأداء', sourceFile: SRC('performance.ts'), docAnchor: `${DOC_BASE}#performance` },
  perf_device_memory: { category: 'المتصفح والأداء', sourceFile: SRC('performance.ts'), docAnchor: `${DOC_BASE}#performance` },
  perf_page: { category: 'المتصفح والأداء', sourceFile: SRC('performance.ts'), docAnchor: `${DOC_BASE}#performance` },
  perf_wcag_contrast: { category: 'المتصفح والأداء', sourceFile: SRC('performance.ts'), docAnchor: `${DOC_BASE}#performance` },
  // التخزين
  storage_local: { category: 'التخزين', sourceFile: SRC('storage.ts'), docAnchor: `${DOC_BASE}#storage` },
  storage_session: { category: 'التخزين', sourceFile: SRC('storage.ts'), docAnchor: `${DOC_BASE}#storage` },
  storage_indexed_db: { category: 'التخزين', sourceFile: SRC('storage.ts'), docAnchor: `${DOC_BASE}#storage` },
  storage_sw: { category: 'التخزين', sourceFile: SRC('storage.ts'), docAnchor: `${DOC_BASE}#storage` },
  storage_error_queue: { category: 'التخزين', sourceFile: SRC('storage.ts'), docAnchor: `${DOC_BASE}#storage` },
  storage_integrity: { category: 'التخزين', sourceFile: SRC('storage.ts'), docAnchor: `${DOC_BASE}#storage` },
  // إعدادات
  app_env: { category: 'إعدادات التطبيق', sourceFile: SRC('appSettings.ts'), docAnchor: `${DOC_BASE}#app_env` },
  app_routes: { category: 'إعدادات التطبيق', sourceFile: SRC('appSettings.ts'), docAnchor: `${DOC_BASE}#app_routes` },
  app_online: { category: 'إعدادات التطبيق', sourceFile: SRC('appSettings.ts'), docAnchor: `${DOC_BASE}#app_online` },
  // routing
  routing_registry: { category: 'التوجيه والمسارات', sourceFile: SRC('routing.ts'), docAnchor: `${DOC_BASE}#routing` },
  routing_current: { category: 'التوجيه والمسارات', sourceFile: SRC('routing.ts'), docAnchor: `${DOC_BASE}#routing` },
  routing_chunk_retries: { category: 'التوجيه والمسارات', sourceFile: SRC('routing.ts'), docAnchor: `${DOC_BASE}#routing` },
};

const DEFAULT_DOC = DOC_BASE;

export function getCheckMeta(id: string): CheckMeta {
  return (
    CHECK_META[id] ?? {
      category: '',
      sourceFile: '',
      docAnchor: DEFAULT_DOC,
    }
  );
}
