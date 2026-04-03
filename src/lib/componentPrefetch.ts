/**
 * خريطة التحميل المسبق للمكوّنات — يُحمّل ملفات JS عند تمرير الماوس
 * يستخدم import.meta.glob لتجنب تكرار قائمة المسارات يدوياً
 */

/** خريطة مسار ← دالة import ديناميكي — مُولَّدة تلقائياً من هيكل الصفحات */
const dashboardModules = import.meta.glob('/src/pages/dashboard/*.tsx');
const beneficiaryModules = import.meta.glob('/src/pages/beneficiary/*.tsx');

/** تحويل مسار ملف إلى مسار URL */
function fileToRoute(filePath: string, prefix: string): string {
  // e.g. "/src/pages/dashboard/PropertiesPage.tsx" → "properties"
  const name = filePath.split('/').pop()!.replace(/Page\.tsx$|\.tsx$/, '');
  // PascalCase → kebab-case
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  // حالات خاصة
  if (kebab === 'admin-dashboard' || kebab === 'beneficiary-dashboard') return prefix;
  if (kebab === 'waqif-dashboard') return '/waqif';

  return `${prefix}/${kebab}`;
}

const componentImports: Record<string, () => Promise<unknown>> = {};

for (const [path, importFn] of Object.entries(dashboardModules)) {
  const route = fileToRoute(path, '/dashboard');
  componentImports[route] = importFn;
}

for (const [path, importFn] of Object.entries(beneficiaryModules)) {
  const route = fileToRoute(path, '/beneficiary');
  componentImports[route] = importFn;
}

/** مجموعة المسارات التي تم تحميلها مسبقاً */
const prefetchedComponents = new Set<string>();

/**
 * يُحمّل مكوّن الصفحة مسبقاً (JS chunk) — مرة واحدة فقط لكل مسار
 */
export function prefetchComponent(path: string): void {
  if (prefetchedComponents.has(path)) return;

  const importFn = componentImports[path];
  if (!importFn) return;

  prefetchedComponents.add(path);

  const load = () => {
    importFn().catch(() => {
      prefetchedComponents.delete(path);
    });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(load, { timeout: 1500 });
  } else {
    setTimeout(load, 100);
  }
}
