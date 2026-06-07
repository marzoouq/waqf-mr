/**
 * بيانات تقرير التدقيق النهائي — جولة B1–B15 على لوحة المستفيد
 * مصدر ثابت يُعرض في صفحة AuditReportFinalPage
 */

export type AuditStatus = 'implemented' | 'documented' | 'rejected';
export type AuditSeverity = 'security' | 'ux' | 'a11y' | 'consistency' | 'performance';

export interface AuditFileRef {
  path: string;
  lines: string;
}

export interface AuditFinding {
  id: string;
  title: string;
  status: AuditStatus;
  severity: AuditSeverity;
  rationale: string;
  files: AuditFileRef[];
}

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  implemented: 'منفّذ',
  documented: 'موثَّق',
  rejected: 'مرفوض جنائياً',
};

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  security: 'أمان',
  ux: 'تجربة',
  a11y: 'وصولية',
  consistency: 'اتساق',
  performance: 'أداء',
};

export const AUDIT_B_FINDINGS: AuditFinding[] = [
  {
    id: 'B1',
    title: 'حارس السنوات المنشورة في AnnualReportViewPage',
    status: 'implemented',
    severity: 'security',
    rationale: 'إضافة early-return عبر noPublishedYears لمنع عرض رسالة "لم يُنشر التقرير" بدلاً من الإشعار الموحَّد.',
    files: [{ path: 'src/pages/beneficiary/AnnualReportViewPage.tsx', lines: '24, 35-36' }],
  },
  {
    id: 'B2',
    title: 'تطبيق RequirePublishedYears كحارس outermost في 7 صفحات',
    status: 'implemented',
    severity: 'security',
    rationale: 'منع UnlinkedAccountNotice الخاطئة حين noPublishedYears=true بإضافة early-return قبل أي فرع.',
    files: [
      { path: 'src/pages/beneficiary/MySharePage.tsx', lines: '35-36' },
      { path: 'src/pages/beneficiary/AccountsViewPage.tsx', lines: '25-26' },
      { path: 'src/pages/beneficiary/FinancialReportsPage.tsx', lines: '26-27' },
      { path: 'src/pages/beneficiary/DisclosurePage.tsx', lines: '28-29' },
      { path: 'src/pages/beneficiary/ContractsViewPage.tsx', lines: '31-32' },
      { path: 'src/pages/beneficiary/InvoicesViewPage.tsx', lines: '28-29' },
      { path: 'src/pages/beneficiary/ExpensesViewPage.tsx', lines: '28' },
    ],
  },
  {
    id: 'B3',
    title: 'الإبقاء على useBfcacheSafeChannel في لوحة المستفيد',
    status: 'rejected',
    severity: 'performance',
    rationale: 'useDashboardRealtime لا يدعم filter لكل جدول؛ الاستبدال يلغي فلتر beneficiary_id ويزيد حجم الحمولة. القرار: إبقاء النمط الحالي.',
    files: [{ path: 'src/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardPage.ts', lines: '84, 97, 115' }],
  },
  {
    id: 'B5',
    title: 'استكمال مفاتيح retry في useDisclosurePage',
    status: 'implemented',
    severity: 'consistency',
    rationale: 'إضافة contracts_safe و disclosure إلى مفاتيح إعادة المحاولة لتغطية كل الاستعلامات التي تقرأها الصفحة.',
    files: [{ path: 'src/hooks/page/beneficiary/financial/useDisclosurePage.ts', lines: '28' }],
  },
  {
    id: 'B6',
    title: 'استبدال Card+onClick بـ Link في BeneficiaryQuickLinks',
    status: 'implemented',
    severity: 'a11y',
    rationale: 'دعم Ctrl/Cmd+Click، الزر الأوسط، التنقل بلوحة المفاتيح، وSEO. أضيف focus ring واضح.',
    files: [{ path: 'src/components/beneficiary/dashboard/BeneficiaryQuickLinks.tsx', lines: '2, 26-41' }],
  },
  {
    id: 'B7',
    title: 'استبدال <button> الخام بـ <Button> themed في AdvanceCard',
    status: 'implemented',
    severity: 'a11y',
    rationale: 'توحيد design tokens للحالة المعطّلة + aria-label و title لشرح سبب التعطيل للقارئ الشاشي.',
    files: [{ path: 'src/components/beneficiary/dashboard/BeneficiaryAdvanceCard.tsx', lines: '3, 70-81' }],
  },
  {
    id: 'B8',
    title: 'استخدام DISTRIBUTIONS_LABELS بدل سلاسل صلبة',
    status: 'implemented',
    severity: 'consistency',
    rationale: 'توحيد نصوص التوزيعات في مكوّن RecentDistributions مع باقي الصفحات لضمان i18n متّسق.',
    files: [{ path: 'src/components/beneficiary/dashboard/BeneficiaryRecentDistributions.tsx', lines: '5, 27' }],
  },
  {
    id: 'B9',
    title: 'إخفاء رقم الهوية مع aria-label وصفي',
    status: 'implemented',
    severity: 'a11y',
    rationale: 'الإبقاء على ******** (PII حسّاس مشفّر AES-256) مع توضيح السبب لقارئ الشاشة عبر aria-label.',
    files: [{ path: 'src/components/settings/AccountTab.tsx', lines: '13, 16, 41' }],
  },
  {
    id: 'B10',
    title: 'إضافة aria-label لـ select في AnnualReportViewPage',
    status: 'implemented',
    severity: 'a11y',
    rationale: 'محدد القسم في عرض الجوال كان بلا تسمية وصفية لقارئ الشاشة.',
    files: [{ path: 'src/pages/beneficiary/AnnualReportViewPage.tsx', lines: '110-113' }],
  },
  {
    id: 'B11',
    title: 'توحيد بلوك الخطأ في AccountsViewPage بـ ErrorState',
    status: 'implemented',
    severity: 'consistency',
    rationale: 'استبدال AlertCircle + h2 + Button اليدوي بـ ErrorState المركزي مع دعم variant=warning لحالة الحساب المفقود.',
    files: [{ path: 'src/pages/beneficiary/AccountsViewPage.tsx', lines: '33, 43' }],
  },
  {
    id: 'B12',
    title: 'توحيد بلوك الخطأ في FinancialReportsPage',
    status: 'implemented',
    severity: 'consistency',
    rationale: 'استبدال البلوك اليدوي بـ ErrorState الموحَّد (يلفّ DashboardLayout تلقائياً).',
    files: [{ path: 'src/pages/beneficiary/FinancialReportsPage.tsx', lines: '36, 46' }],
  },
  {
    id: 'B13',
    title: 'توحيد بلوك الخطأ في BeneficiaryMessagesPage',
    status: 'implemented',
    severity: 'consistency',
    rationale: 'استبدال البلوك اليدوي بـ ErrorState الموحَّد.',
    files: [{ path: 'src/pages/beneficiary/BeneficiaryMessagesPage.tsx', lines: '25' }],
  },
  {
    id: 'B14',
    title: 'توحيد بلوك الخطأ في Contracts/Invoices/Notifications',
    status: 'implemented',
    severity: 'consistency',
    rationale: 'تطبيق نفس نمط ErrorState على ثلاث صفحات لتقليل التكرار وتوحيد التجربة.',
    files: [
      { path: 'src/pages/beneficiary/ContractsViewPage.tsx', lines: '38' },
      { path: 'src/pages/beneficiary/InvoicesViewPage.tsx', lines: '34' },
      { path: 'src/pages/beneficiary/NotificationsPage.tsx', lines: '26' },
    ],
  },
  {
    id: 'B15',
    title: 'توحيد ErrorState + EmptyPageState في CarryforwardHistoryPage',
    status: 'implemented',
    severity: 'consistency',
    rationale: 'تنظيف بلوكات Error و Empty اليدوية إلى المكوّنين الموحَّدين من PageStateGuards.',
    files: [{ path: 'src/pages/beneficiary/CarryforwardHistoryPage.tsx', lines: '37, 41' }],
  },
  {
    id: 'B4',
    title: 'realtime لـ accounts/app_settings — توثيق فقط',
    status: 'documented',
    severity: 'performance',
    rationale: 'RLS يقصّ الحمولة على الخادم، لذا أثر "الضوضاء" أصغر من المتوقَّع. الإبقاء على الاشتراك الحالي بدون فلتر مقصود.',
    files: [{ path: 'audit/beneficiary-deep-audit-2026-06-06.md', lines: 'B4' }],
  },
];

export const AUDIT_ROUND_META = {
  date: '2026-06-06',
  scope: 'لوحة المستفيد — جولة التدقيق الجنائي العميقة (B1–B15)',
  testsPassed: '2060/2060',
  reportPath: 'audit/beneficiary-deep-audit-2026-06-06.md',
};
