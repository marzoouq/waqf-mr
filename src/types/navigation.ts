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
  archive: string;
  beneficiary_view: string;
  chart_of_accounts: string;
  // مسارات إضافية متاحة للناظر/المحاسب (#13 من تقرير الفحص)
  zatca: string;
  support: string;
  annual_report: string;
  comparison: string;
  diagnostics: string;
  email_monitor: string;
  distributions: string;
  // P3/A4: تسميات قابلة للترجمة الديناميكية لصفحتي التقارير الجنائية
  audit_report_final: string;
  cleanup_report: string;
}

export const defaultMenuLabels: MenuLabels = {
  home: 'الرئيسية',
  properties: 'العقارات',
  contracts: 'العقود',
  income: 'الدخل',
  expenses: 'المصروفات',
  beneficiaries: 'المستفيدين',
  reports: 'التقارير المالية والإفصاح',
  accounts: 'الحسابات الختامية',
  users: 'إدارة المستخدمين',
  settings: 'الإعدادات',
  messages: 'المراسلات',
  invoices: 'الفواتير الضريبية',
  audit_log: 'سجل المراجعة',
  bylaws: 'اللائحة التنظيمية',
  archive: 'أرشيف الوثائق',
  beneficiary_view: 'معاينة بوابة المستفيد',
  chart_of_accounts: 'الشجرة المحاسبية',
  zatca: 'تكامل ZATCA',
  support: 'الدعم الفني',
  annual_report: 'إدارة التقرير السنوي',
  comparison: 'المقارنة التاريخية',
  diagnostics: 'تشخيص النظام',
  email_monitor: 'مراقبة البريد',
  distributions: 'توزيع الحصص',
  audit_report_final: 'تقرير التدقيق النهائي',
  cleanup_report: 'تقرير التنظيف',
};
