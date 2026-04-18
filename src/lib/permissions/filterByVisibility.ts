/**
 * فلترة روابط التنقل حسب رؤية الأقسام (sectionsVisibility/beneficiarySections)
 *
 * مُستخرَج لإتاحة استخدامه في:
 *  - useNavLinks (روابط Sidebar الكاملة)
 *  - BottomNav (روابط الجوال — لا يجب أن تعرض رابطاً عُطّل قسمه في الإعدادات)
 *
 * الدالة نقية وقابلة للاختبار.
 */

export interface RouteLink {
  to: string;
  [key: string]: unknown;
}

/**
 * يفلتر الروابط بناءً على خريطة (route → sectionKey) وحالة الرؤية.
 * إن لم يكن للرابط `sectionKey` مسجَّل، يبقى ظاهراً (افتراض آمن).
 */
export const filterLinksBySectionVisibility = <L extends RouteLink>(
  links: readonly L[],
  routeToSection: Readonly<Record<string, string | undefined>>,
  sectionsVisibility: Readonly<Record<string, boolean>>,
): L[] => {
  return links.filter(link => {
    const sectionKey = routeToSection[link.to];
    if (!sectionKey) return true;
    return sectionsVisibility[sectionKey] !== false;
  });
};

/**
 * يفلتر الروابط بناءً على خريطة (route → permKey) وأذونات الدور.
 * إن لم يكن للرابط `permKey` مسجَّل، يبقى ظاهراً.
 */
export const filterLinksByPermissions = <L extends RouteLink>(
  links: readonly L[],
  routeToPermKey: Readonly<Record<string, string | undefined>>,
  permissions: Readonly<Record<string, boolean | undefined>>,
): L[] => {
  return links.filter(link => {
    const permKey = routeToPermKey[link.to];
    if (!permKey) return true;
    return permissions[permKey] !== false;
  });
};
