/**
 * بطاقة 10 — تدقيق رقمي DB ↔ RPC ↔ UI
 *
 * يقارن ثلاث طبقات للأرقام في النظام:
 *   - DB raw: مجاميع مباشرة من الجداول (income, expenses, accounts)
 *   - RPC: قيم من get_dashboard_full_summary
 *   - UI logic: حساب client-side من نفس مدخلات RPC (لمحاكاة ما تعرضه اللوحات)
 *
 * فجوة مكشوفة سابقاً: cardConsistency.ts يفحص DB فقط، varianceReport.ts pure (لا يقارن طبقات)،
 * هذه البطاقة تربط الطبقات معاً وتكشف drifts خفية بعد Stage 3.
 *
 * threshold موحَّد مع varianceReport: 0.01 SAR.
 */
import { supabase } from '@/integrations/supabase/client';
import type { CheckResult } from '../types';

const EPSILON = 0.01;

interface FySnapshot {
  id: string;
  label: string;
  status: string;
}

interface RpcAggregated {
  totals?: {
    total_income?: number;
    total_expenses?: number;
    waqf_revenue?: number;
    waqf_corpus_manual?: number;
    available_amount?: number;
  };
}

/** يلتقط آخر سنة مالية (نشطة أو آخر مقفلة) لتوحيد كل الفحوصات */
async function getLatestFy(): Promise<FySnapshot | null> {
  const { data: active } = await supabase
    .from('fiscal_years')
    .select('id, label, status')
    .eq('status', 'active')
    .maybeSingle();
  if (active) return active as FySnapshot;
  const { data: closed } = await supabase
    .from('fiscal_years')
    .select('id, label, status')
    .eq('status', 'closed')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (closed as FySnapshot) ?? null;
}

async function callRpcSummary(fyId: string): Promise<RpcAggregated | null> {
  const { data, error } = await supabase.rpc('get_dashboard_full_summary', {
    p_fiscal_year_id: fyId,
  });
  if (error || !data) return null;
  // RPC تعيد Json — نطبّع شكلها لما نحتاجه
  return data as unknown as RpcAggregated;
}

/** N1: SUM(income.amount) من DB يطابق aggregated.totals.total_income من RPC */
export async function checkDbVsRpcTotalIncome(): Promise<CheckResult> {
  const id = 'audit_db_vs_rpc_total_income';
  const label = 'تطابق إجمالي الإيرادات (DB ↔ RPC)';
  try {
    const fy = await getLatestFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مالية متاحة' };

    const [{ data: incomeRows, error: incErr }, rpc] = await Promise.all([
      supabase.from('income').select('amount').eq('fiscal_year_id', fy.id),
      callRpcSummary(fy.id),
    ]);
    if (incErr) return { id, label, status: 'warn', detail: incErr.message };
    if (!rpc) return { id, label, status: 'warn', detail: 'RPC غير متاحة' };

    const dbTotal = (incomeRows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
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
    const fy = await getLatestFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مالية متاحة' };

    const [{ data: expRows, error: expErr }, rpc] = await Promise.all([
      supabase.from('expenses').select('amount').eq('fiscal_year_id', fy.id),
      callRpcSummary(fy.id),
    ]);
    if (expErr) return { id, label, status: 'warn', detail: expErr.message };
    if (!rpc) return { id, label, status: 'warn', detail: 'RPC غير متاحة' };

    const dbTotal = (expRows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
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
    const fy = await getLatestFy();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مالية متاحة' };

    const rpc = await callRpcSummary(fy.id);
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
    const { data: fy } = await supabase
      .from('fiscal_years')
      .select('id, label')
      .eq('status', 'closed')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!fy) return { id, label, status: 'info', detail: 'لا سنة مقفلة للفحص' };

    const [{ data: acct }, { data: incomeRows }] = await Promise.all([
      supabase
        .from('accounts')
        .select('total_income, total_expenses, waqf_revenue, waqf_corpus_manual')
        .eq('fiscal_year_id', fy.id)
        .maybeSingle(),
      supabase.from('income').select('amount').eq('fiscal_year_id', fy.id),
    ]);
    if (!acct) return { id, label, status: 'info', detail: `${fy.label}: لا snapshot مخزَّن` };

    const snapIncome = Number(acct.total_income ?? 0);
    const liveIncome = (incomeRows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
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
