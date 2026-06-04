/**
 * بطاقة 10 — تدقيق رقمي DB ↔ RPC ↔ UI
 *
 * يقارن ثلاث طبقات للأرقام في النظام:
 *   - DB raw: مجاميع مباشرة من الجداول (income, expenses, accounts)
 *   - RPC: قيم من get_dashboard_full_summary
 *   - UI logic: حساب client-side من نفس مدخلات RPC (لمحاكاة ما تعرضه اللوحات)
 *
 * threshold موحَّد مع varianceReport: 0.01 SAR.
 */
import { diagnosticsReadService } from '@/lib/services/diagnosticsReadService';
import type { CheckResult } from '../types';

const EPSILON = 0.01;

/** N1: SUM(income.amount) من DB يطابق aggregated.totals.total_income من RPC */
export async function checkDbVsRpcTotalIncome(): Promise<CheckResult> {
  const id = 'audit_db_vs_rpc_total_income';
  const label = 'تطابق إجمالي الإيرادات (DB ↔ RPC)';
  try {
    const fy = await diagnosticsReadService.getLatestFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مالية متاحة' };

    const [incomeRows, rpc] = await Promise.all([
      diagnosticsReadService.listIncomeByFy(fy.id),
      diagnosticsReadService.getDashboardFullSummary(fy.id),
    ]);
    if (!rpc) return { id, label, status: 'warn', detail: 'RPC غير متاحة' };

    const dbTotal = incomeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const rpcTotal = Number(rpc.totals?.total_income ?? 0);
    const diff = Math.abs(dbTotal - rpcTotal);
    if (diff <= EPSILON) {
      return { id, label, status: 'pass', detail: `${fy.label}: ${dbTotal.toFixed(2)} = ${rpcTotal.toFixed(2)}` };
    }
    return {
      id,
      label,
      status: 'fail',
      detail: `${fy.label}: DB=${dbTotal.toFixed(2)} ≠ RPC=${rpcTotal.toFixed(2)} (Δ=${diff.toFixed(2)})`,
    };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/** N2: SUM(expenses.amount) من DB يطابق aggregated.totals.total_expenses من RPC */
export async function checkDbVsRpcExpenses(): Promise<CheckResult> {
  const id = 'audit_db_vs_rpc_expenses';
  const label = 'تطابق إجمالي المصروفات (DB ↔ RPC)';
  try {
    const fy = await diagnosticsReadService.getLatestFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مالية متاحة' };

    const [expRows, rpc] = await Promise.all([
      diagnosticsReadService.listExpensesByFy(fy.id),
      diagnosticsReadService.getDashboardFullSummary(fy.id),
    ]);
    if (!rpc) return { id, label, status: 'warn', detail: 'RPC غير متاحة' };

    const dbTotal = expRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const rpcTotal = Number(rpc.totals?.total_expenses ?? 0);
    const diff = Math.abs(dbTotal - rpcTotal);
    if (diff <= EPSILON) {
      return { id, label, status: 'pass', detail: `${fy.label}: ${dbTotal.toFixed(2)} = ${rpcTotal.toFixed(2)}` };
    }
    return {
      id,
      label,
      status: 'fail',
      detail: `${fy.label}: DB=${dbTotal.toFixed(2)} ≠ RPC=${rpcTotal.toFixed(2)} (Δ=${diff.toFixed(2)})`,
    };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/**
 * N3: available_amount من RPC يطابق إعادة الحساب client-side
 *     الصيغة الموحَّدة (متطابقة مع UI): max(0, waqf_revenue - waqf_corpus_manual)
 */
export async function checkRpcVsUiAvailableAmount(): Promise<CheckResult> {
  const id = 'audit_rpc_vs_ui_available';
  const label = 'تطابق المتاح للتوزيع (RPC ↔ UI)';
  try {
    const fy = await diagnosticsReadService.getLatestFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مالية متاحة' };

    const rpc = await diagnosticsReadService.getDashboardFullSummary(fy.id);
    if (!rpc?.totals) return { id, label, status: 'warn', detail: 'RPC غير متاحة' };

    const waqfRevenue = Number(rpc.totals.waqf_revenue ?? 0);
    const corpusManual = Number(rpc.totals.waqf_corpus_manual ?? 0);
    const rpcAvailable = Number(rpc.totals.available_amount ?? 0);
    const uiAvailable = Math.max(0, waqfRevenue - corpusManual);
    const diff = Math.abs(rpcAvailable - uiAvailable);

    if (diff <= EPSILON) {
      return { id, label, status: 'pass', detail: `${fy.label}: ${rpcAvailable.toFixed(2)} = ${uiAvailable.toFixed(2)}` };
    }
    return {
      id,
      label,
      status: 'fail',
      detail: `${fy.label}: RPC=${rpcAvailable.toFixed(2)} ≠ UI=${uiAvailable.toFixed(2)} (Δ=${diff.toFixed(2)})`,
    };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}

/**
 * N4: سلامة snapshot لسنة مقفلة — مقارنة snapshot المخزَّن
 *     مع إعادة حساب نظري من جداول المصدر. warn فقط (لا fail) — drifts السنوات المقفلة قد تكون متوقعة.
 */
export async function checkSnapshotIntegrityClosedYear(): Promise<CheckResult> {
  const id = 'audit_snapshot_closed_year';
  const label = 'سلامة snapshot لآخر سنة مقفلة';
  try {
    const fy = await diagnosticsReadService.getLatestClosedFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مقفلة للفحص' };

    const [acct, incomeRows] = await Promise.all([
      diagnosticsReadService.getAccountSnapshotForFy(fy.id),
      diagnosticsReadService.listIncomeByFy(fy.id),
    ]);
    if (!acct) return { id, label, status: 'info', detail: `${fy.label}: لا snapshot مخزَّن` };

    const snapIncome = Number(acct.total_income ?? 0);
    const liveIncome = incomeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const diff = Math.abs(snapIncome - liveIncome);

    if (diff <= EPSILON) {
      return { id, label, status: 'pass', detail: `${fy.label}: snapshot مطابق (${snapIncome.toFixed(2)})` };
    }
    return {
      id,
      label,
      status: 'warn',
      detail: `${fy.label}: snapshot=${snapIncome.toFixed(2)} ≠ live=${liveIncome.toFixed(2)} (Δ=${diff.toFixed(2)}) — قد يكون متوقعاً`,
    };
  } catch (e) {
    return { id, label, status: 'warn', detail: String(e) };
  }
}
