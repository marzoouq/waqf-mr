/**
 * أنواع وقيم افتراضية للتنقل والقائمة الجانبية
 */
export interface MenuLabels {
  home: string;
  properties: string;
  contracts: string;
  income: string;
  expenses: string;
  beneficiaries: string;
  reports: string;
  accounts: string;
  users: string;
  settings: string;
  messages: string;
  invoices: string;
  audit_log: string;
  bylaws: string;
  beneficiary_view: string;
  chart_of_accounts: string;
}

export const defaultMenuLabels: MenuLabels = {
  home: 'الرئيسية',
  properties: 'العقارات',
  contracts: 'العقود',
  income: 'الدخل',
  expenses: 'المصروفات',
  beneficiaries: 'المستفيدين',
  reports: 'التقارير',
  accounts: 'الحسابات',
  users: 'إدارة المستخدمين',
  settings: 'الإعدادات',
  messages: 'المراسلات',
  invoices: 'الفواتير',
  audit_log: 'سجل المراجعة',
  bylaws: 'اللائحة التنظيمية',
  beneficiary_view: 'واجهة المستفيد',
  chart_of_accounts: 'الشجرة المحاسبية',
};
