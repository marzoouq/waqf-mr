/**
 * بطاقات المربع المالي القيادي في لوحة الناظر.
 * دالة عرض فقط: تنقل الأرقام الجاهزة من الخادم كما هي إلى بطاقات،
 * ولا تجمع ولا تطرح أي مبلغ (المصروفات والضريبة تبقيان سطرين منفصلين).
 */
import type { AggregatedTotals } from '@/types/financial/dashboard';
import { calcChangePercent } from '@/utils/financial/computations/calcChangePercent';

export type ExecutiveCardId = 'income' | 'expenses' | 'waqf' | 'distributions';

export interface ExecutiveFigure {
  label: string;
  /** null = لا يوجد رقم معتمد بعد (يُعرض pendingText) */
  amount: number | null;
  note?: string;
}

export interface ExecutiveCard {
  id: ExecutiveCardId;
  title: string;
  link: string;
  /** الرقم الرئيسي للبطاقة — null في بطاقة المصروفات لأنها لا تجمع بنودها */
  lead: ExecutiveFigure | null;
  rows: ExecutiveFigure[];
  yoyChange: number | null;
  /** ارتفاع الرقم سلبي (مثل المصروفات) */
  invertChange: boolean;
  footnote?: string;
}

export interface ExecutiveSummaryInput {
  totals: AggregatedTotals | null | undefined;
  /** السنة مقفلة — الأرقام من الإقفال المعتمد */
  isClosed: boolean;
  isAdmin: boolean;
  yoy: { hasPrevYear: boolean; prevTotalIncome: number; prevTotalExpenses: number };
}

export const PENDING_CLOSURE_TEXT = 'يُحسب عند الإقفال';

export function buildExecutiveCards({ totals, isClosed, isAdmin, yoy }: ExecutiveSummaryInput): ExecutiveCard[] {
  const t = totals;
  const income = t?.total_income ?? 0;
  const expenses = t?.total_expenses ?? 0;
  const vat = t?.vat_amount ?? 0;
  const zakat = t?.zakat_amount ?? 0;

  const cards: ExecutiveCard[] = [
    {
      id: 'income',
      title: 'الدخل المحصّل',
      link: '/dashboard/income',
      lead: { label: 'إجمالي الدخل الفعلي', amount: income },
      rows: [],
      yoyChange: yoy.hasPrevYear ? calcChangePercent(income, yoy.prevTotalIncome) : null,
      invertChange: false,
    },
    {
      id: 'expenses',
      title: 'المصروفات التشغيلية والالتزامات الضريبية',
      link: '/dashboard/expenses',
      lead: null,
      rows: [
        { label: 'المصروفات التشغيلية', amount: expenses },
        { label: 'ضريبة القيمة المضافة', amount: vat },
        ...(zakat > 0 ? [{ label: 'الزكاة', amount: zakat }] : []),
      ],
      yoyChange: yoy.hasPrevYear ? calcChangePercent(expenses, yoy.prevTotalExpenses) : null,
      invertChange: true,
      footnote: 'كل بند مستقل ولا يُجمع مع غيره',
    },
  ];

  if (!isAdmin) return cards;

  cards.push(
    isClosed
      ? {
          id: 'waqf',
          title: 'ريع الوقف',
          link: '/dashboard/accounts',
          lead: { label: 'ريع الوقف المعتمد', amount: t?.waqf_revenue ?? 0 },
          rows: [
            { label: 'حصة الناظر', amount: t?.admin_share ?? 0 },
            { label: 'حصة الواقف', amount: t?.waqif_share ?? 0 },
          ],
          yoyChange: null,
          invertChange: false,
        }
      : {
          id: 'waqf',
          title: 'ريع الوقف',
          link: '/dashboard/accounts',
          lead: { label: 'ريع الوقف', amount: null },
          rows: [{ label: 'الصافي بعد المصروفات', amount: t?.net_after_expenses ?? 0, note: 'تقديري' }],
          yoyChange: null,
          invertChange: false,
        },
    {
      id: 'distributions',
      title: 'التوزيعات',
      link: '/dashboard/distributions',
      lead: { label: 'الموزّع على المستفيدين', amount: t?.distributions_amount ?? 0 },
      rows: isClosed
        ? [
            { label: 'المتاح للتوزيع', amount: t?.available_amount ?? 0 },
            ...((t?.waqf_corpus_manual ?? 0) > 0 ? [{ label: 'رقبة الوقف', amount: t?.waqf_corpus_manual ?? 0 }] : []),
          ]
        : [],
      yoyChange: null,
      invertChange: false,
    },
  );

  return cards;
}
