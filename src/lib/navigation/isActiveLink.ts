/**
 * مساعد موحَّد لتحديد رابط نشط في القوائم (Sidebar + BottomNav)
 *
 * المسارات الجذرية ('/dashboard', '/beneficiary', '/waqif') تُعتبر نشطة فقط
 * عند المطابقة التامة لمنع تفعيل "الرئيسية" عند زيارة أي صفحة فرعية.
 *
 * نقي بالكامل: لا يستورد من React ولا من react-router — مما يسمح باختباره مباشرة.
 */

const ROOT_PATHS = new Set(['/dashboard', '/beneficiary', '/waqif']);

export const isActiveLink = (currentPath: string, linkPath: string): boolean => {
  if (currentPath === linkPath) return true;
  if (ROOT_PATHS.has(linkPath)) return false;
  return currentPath.startsWith(linkPath + '/');
};
