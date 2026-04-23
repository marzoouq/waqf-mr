/**
 * Barrel — components/layout
 *
 * مكونات هيكل الصفحة: DashboardLayout، Sidebar، MobileHeader،
 * NavLinks، PageHeaderCard، ومُحدد السنة المالية وإدارة Idle Timeout.
 * يُعيد تصدير ثوابت navigation للتوافق العكسي.
 */
export { default as BottomNav } from './BottomNav';
export { default as DashboardLayout } from './DashboardLayout';
export { default as DesktopTopBar } from './DesktopTopBar';
export { default as FiscalYearSelector } from './FiscalYearSelector';
export { default as IdleTimeoutManager } from './IdleTimeoutManager';
export { default as MobileHeader } from './MobileHeader';
export { NavLink } from './NavLink';
export { default as PageHeaderCard } from './PageHeaderCard';
export { default as Sidebar } from './Sidebar';
export { default as WaqfInfoBar } from './WaqfInfoBar';
export {
  SHOW_ALL_ROUTES,
  linkLabelKeys,
  allAdminLinks,
  allBeneficiaryLinks,
  ADMIN_ROUTE_PERM_KEYS,
  BENEFICIARY_ROUTE_PERM_KEYS,
  ACCOUNTANT_EXCLUDED_ROUTES,
  defaultAdminSections,
  defaultBeneficiarySections,
  ADMIN_ROUTE_TO_SECTION,
  BENEFICIARY_ROUTE_TO_SECTION,
  ROUTE_TITLES,
} from '@/constants/navigation';
export { defaultMenuLabels, type MenuLabels } from '@/types/navigation';
