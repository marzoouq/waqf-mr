/**
 * Barrel — إعادة تصدير كل الثوابت للتوافق العكسي
 * الملفات الفعلية: entities.ts, ui.ts, roles.ts
 */
export { EXPENSE_TYPES, PROPERTY_TYPES, CONTRACT_STATUSES, PAYMENT_TYPES, UNIT_TYPES, TENANT_ID_TYPES, EXPIRING_SOON_DAYS } from './entities';
export type { ExpenseType, PropertyType } from './entities';
export { BANNER_COLORS, BANNER_COLOR_CLASSES, DEFAULT_BANNER_SETTINGS } from './ui';
export type { BannerSettings } from './ui';
export { ROLE_LABELS } from './roles';
export { FY_NONE, FY_ALL, FY_SKIP, isFyReady, isFyAll, isFySpecific } from './fiscalYearIds';
export type { FiscalYearSentinel } from './fiscalYearIds';
export { MAX_FINANCIAL_AMOUNT, MAX_FINANCIAL_AMOUNT_MESSAGE } from './limits';
export { DEFAULT_PAGE_SIZE, PROPERTIES_PAGE_SIZE } from './pagination';
