/**
 * snapshot ثابت لآخر جولة تنظيف ملفات في المستودع
 * يُعرض في CleanupReportPage (Admin only). يُحدَّث يدوياً بعد كل تنظيف.
 */

export type CleanupCheckStatus = 'pass' | 'fail';

export interface DeletedFileEntry {
  path: string;
  reason: string;
  phase: 'HIGH' | 'MED' | 'LOW';
}

export interface RgCheckEntry {
  pattern: string;
  matches: number;
  note?: string;
}

export interface TestFailureEntry {
  file: string;
  name: string;
  message: string;
}

export interface CleanupReport {
  generatedAt: string;
  round: string;
  deletedFiles: DeletedFileEntry[];
  rejectedFalsePositives: number;
  rgChecks: RgCheckEntry[];
  build: {
    status: CleanupCheckStatus;
    note?: string;
  };
  tests: {
    status: CleanupCheckStatus;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    suites: number;
    failures: TestFailureEntry[];
  };
}

export const CLEANUP_REPORT: CleanupReport = {
  generatedAt: '2026-06-07',
  round: 'جولة تنظيف ملفات يتيمة + إصلاح فجوات تسجيل المسارات',
  rejectedFalsePositives: 8,
  deletedFiles: [
    {
      path: 'scripts/_archive/codemod-common-barrel.mjs',
      reason: '0 مراجع في CI/package.json/scripts',
      phase: 'HIGH',
    },
    {
      path: 'scripts/_archive/',
      reason: 'مجلد فارغ بعد حذف ملفه الوحيد',
      phase: 'HIGH',
    },
    {
      path: 'public/placeholder.svg',
      reason: '0 مراجع في src/ أو index.html أو vite.config.ts',
      phase: 'HIGH',
    },
    {
      path: 'src/types/data/index.ts',
      reason: 'barrel re-export فقط؛ 0 مستوردين (الكل يستورد @/types/data/crudFactory مباشرة)',
      phase: 'MED',
    },
  ],
  rgChecks: [
    { pattern: 'placeholder\\.svg', matches: 0 },
    { pattern: 'codemod-common-barrel', matches: 1, note: 'مرجع توثيقي فقط في audit/codebase-audit-2026-06-05.md' },
    { pattern: "from ['\"]@/types/data['\"]", matches: 0 },
    { pattern: "from ['\"]\\.\\./types/data['\"]|from ['\"]\\./types/data['\"]", matches: 0 },
    { pattern: 'scripts/_archive (كملف فعلي)', matches: 0, note: 'المرجع الوحيد سطر توثيقي في ملف audit' },
  ],
  build: {
    status: 'pass',
    note: 'بناء Vite الإنتاجي يكتمل دون أخطاء bundle/404 بعد الحذف',
  },
  tests: {
    status: 'pass',
    total: 2062,
    passed: 2062,
    failed: 0,
    skipped: 0,
    suites: 661,
    failures: [],
  },
};
