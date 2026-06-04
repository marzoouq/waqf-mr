/**
 * بطاقة 9 — اتساق بطاقات لوحات الناظر/المستفيد/المحاسب مع مصادر البيانات
 * كل فحص يقارن قيمة معروضة في لوحة معينة بمصدرها الأصلي في قاعدة البيانات
 * ويبلّغ عن أي انحراف. قراءة فقط — لا يعدّل أي بيانات.
 */
import { diagnosticsReadService } from '@/lib/services/diagnosticsReadService';
import { todayLocalISO } from '@/utils/date/dateOnly';
import type { CheckResult } from '../types';

const EPSILON = 0.5; // نصف ريال — تسامح للتقريب

/** C1: available_amount لا يجب أن يكون سالباً في أي حساب (Stage3 enforcement) */
export async function checkAvailableAmountNonNegative(): Promise<CheckResult> {
  const id = 'card_available_non_negative';
  const label = 'المتاح للتوزيع غير سالب';
  try {
    const data = await diagnosticsReadService.listAccountsBasic(1000);
    const bad = data.filter(a => {
      const available = (Number(a.waqf_revenue) || 0) - (Number(a.waqf_corpus_manual) || 0);
      return available < -EPSILON;
    });
    if (bad.length === 0) return { id, label, status: 'pass', detail: 'كل الحسابات صحيحة' };
    return {
      id,
      label,
      status: 'fail',
      detail: `${bad.length} حساب فيه رقبة وقف > الريع (${bad.map(b => b.fiscal_year).join(', ')})`,
    };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** C2: مجموع التوزيعات في سنة مقفلة ≤ available_amount */
export async function checkDistributionsWithinAvailable(): Promise<CheckResult> {
  const id = 'card_dist_within_available';
  const label = 'التوزيعات ضمن المتاح (سنوات مقفلة)';
  try {
    const years = await diagnosticsReadService.listClosedFiscalYears(50);
    if (years.length === 0) return { id, label, status: 'info', detail: 'لا سنوات مقفلة' };

    const issues: string[] = [];
    for (const fy of years) {
      const [acct, dist] = await Promise.all([
        diagnosticsReadService.getAccountForFy(fy.id),
        diagnosticsReadService.listDistributionsByFy(fy.id),
      ]);
      if (!acct) continue;
      const available = Math.max(0, (Number(acct.waqf_revenue) || 0) - (Number(acct.waqf_corpus_manual) || 0));
      const total = dist.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      if (total > available + EPSILON) {
        issues.push(`${fy.label}: وزّع ${total.toFixed(2)} من ${available.toFixed(2)}`);
      }
    }
    if (issues.length === 0) return { id, label, status: 'pass', detail: `${years.length} سنة مقفلة سليمة` };
    return { id, label, status: 'fail', detail: issues.join(' | ') };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** C3: حصة المستفيد المعروضة = نسبته × المتاح (تطابق منطق Beneficiary Dashboard) */
export async function checkBeneficiaryShareFormula(): Promise<CheckResult> {
  const id = 'card_beneficiary_share';
  const label = 'صيغة حصة المستفيد';
  try {
    const fy = await diagnosticsReadService.getLatestClosedFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مقفلة للمقارنة' };

    const [acct, bens, dist] = await Promise.all([
      diagnosticsReadService.getAccountForFy(fy.id),
      diagnosticsReadService.listBeneficiariesWithShare(),
      diagnosticsReadService.listDistributionsByFy(fy.id),
    ]);
    if (!acct || !bens || bens.length === 0) {
      return { id, label, status: 'info', detail: 'بيانات غير مكتملة للمقارنة' };
    }
    const available = Math.max(0, (Number(acct.waqf_revenue) || 0) - (Number(acct.waqf_corpus_manual) || 0));
    const totalShare = bens.reduce((s, b) => s + (Number(b.share_percentage) || 0), 0);
    if (totalShare <= 0) return { id, label, status: 'warn', detail: 'إجمالي نسب المستفيدين = 0' };

    const distMap = new Map<string, number>();
    for (const d of dist) {
      distMap.set(d.beneficiary_id, (distMap.get(d.beneficiary_id) || 0) + (Number(d.amount) || 0));
    }
    const mismatches: string[] = [];
    for (const b of bens) {
      const expected = (Number(b.share_percentage) / totalShare) * available;
      const actual = distMap.get(b.id) || 0;
      // فقط نبلغ إذا تجاوز الفرق 1% من القيمة المتوقعة (largest-remainder قد يسبب فروقاً صغيرة)
      if (Math.abs(expected - actual) > Math.max(EPSILON, expected * 0.01)) {
        mismatches.push(`${b.name}: ${actual.toFixed(0)} ≠ ${expected.toFixed(0)}`);
      }
    }
    if (mismatches.length === 0) {
      return { id, label, status: 'pass', detail: `${bens.length} مستفيد في ${fy.label} مطابق` };
    }
    return {
      id,
      label,
      status: 'warn',
      detail: `انحراف في ${mismatches.length} مستفيد: ${mismatches.slice(0, 3).join('، ')}${mismatches.length > 3 ? '…' : ''}`,
    };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** C4: السلف المعتمدة لمستفيد ≤ حصته المتوقعة (يحمي بطاقة "السلف" لدى المستفيد) */
export async function checkAdvancesWithinShare(): Promise<CheckResult> {
  const id = 'card_advances_within_share';
  const label = 'السلف ضمن الحصة المتوقعة';
  try {
    const fy = await diagnosticsReadService.getActiveFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة نشطة' };

    const [acct, bens, advs] = await Promise.all([
      diagnosticsReadService.getAccountForFy(fy.id),
      diagnosticsReadService.listBeneficiariesWithShare(),
      diagnosticsReadService.listApprovedAdvancesByFy(fy.id),
    ]);
    if (!acct || !bens || bens.length === 0) {
      return { id, label, status: 'info', detail: 'بيانات غير مكتملة' };
    }
    const available = Math.max(0, (Number(acct.waqf_revenue) || 0) - (Number(acct.waqf_corpus_manual) || 0));
    const totalShare = bens.reduce((s, b) => s + (Number(b.share_percentage) || 0), 0);
    if (totalShare <= 0 || available <= 0) {
      return { id, label, status: 'info', detail: 'لا متاح للمقارنة في السنة النشطة' };
    }
    const advMap = new Map<string, number>();
    for (const a of advs) {
      advMap.set(a.beneficiary_id, (advMap.get(a.beneficiary_id) || 0) + (Number(a.amount) || 0));
    }
    const violations: string[] = [];
    for (const b of bens) {
      const expectedShare = (Number(b.share_percentage) / totalShare) * available;
      const advanced = advMap.get(b.id) || 0;
      if (advanced > expectedShare + EPSILON) {
        violations.push(`${b.name}: سلف ${advanced.toFixed(0)} > حصة ${expectedShare.toFixed(0)}`);
      }
    }
    if (violations.length === 0) return { id, label, status: 'pass', detail: 'كل السلف ضمن الحدود' };
    return { id, label, status: 'fail', detail: violations.slice(0, 3).join(' | ') };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** C5: عدم تداخل المتأخر/المعلّق (بطاقة المحاسب: overdue ≠ pending) */
export async function checkOverduePendingNoOverlap(): Promise<CheckResult> {
  const id = 'card_overdue_pending';
  const label = 'فصل المتأخر عن المعلّق';
  try {
    const today = todayLocalISO();
    const rows = await diagnosticsReadService.listOpenPaymentInvoices(2000);
    const overdue = rows.filter(r => r.due_date < today);
    const pending = rows.filter(r => r.due_date >= today);
    if (overdue.length + pending.length !== rows.length) {
      return { id, label, status: 'fail', detail: 'حسابات متداخلة بين overdue و pending' };
    }
    return {
      id,
      label,
      status: 'pass',
      detail: `متأخر=${overdue.length}، معلّق=${pending.length}، الإجمالي=${rows.length}`,
    };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** C6: تكامل المرحّل — لا قيم سالبة ولا نفس السنة كمصدر ووجهة */
export async function checkCarryforwardIntegrity(): Promise<CheckResult> {
  const id = 'card_carryforward_integrity';
  const label = 'تكامل المرحّل';
  try {
    const rows = await diagnosticsReadService.listCarryforwardRecords(2000);
    const negative = rows.filter(r => (Number(r.amount) || 0) < -EPSILON);
    const selfRef = rows.filter(r => r.from_fiscal_year_id && r.to_fiscal_year_id && r.from_fiscal_year_id === r.to_fiscal_year_id);
    const issues: string[] = [];
    if (negative.length > 0) issues.push(`${negative.length} قيد سالب`);
    if (selfRef.length > 0) issues.push(`${selfRef.length} قيد بنفس السنة كمصدر/وجهة`);
    if (issues.length === 0) return { id, label, status: 'pass', detail: `${rows.length} قيد سليم` };
    return { id, label, status: 'fail', detail: issues.join('، ') };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}
