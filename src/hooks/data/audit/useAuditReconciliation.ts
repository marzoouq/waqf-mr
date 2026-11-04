import { useQuery } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';

export interface AuditIssue {
  code: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  ref?: string;
  amount?: number;
  expected?: number;
}

export interface AuditTreeNode {
  label: string;
  amount: number;
  invoiced?: number;
  paid_count?: number;
  receipt_count?: number;
  count?: number;
  voucher_count?: number;
  children?: AuditTreeNode[];
}

export interface AuditReconciliation {
  fiscal_year: string;
  status: string;
  income_total: number;
  paid_invoices_total: number;
  expense_total: number;
  statement_income: number | null;
  statement_expenses: number | null;
  income_tree: AuditTreeNode[];
  expense_tree: AuditTreeNode[];
  issues: AuditIssue[];
  checked_at: string;
}

/** Read-only accounting reconciliation (server-side, admin/accountant). */
export const useAuditReconciliation = (fiscalYearId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ['audit_reconciliation', fiscalYearId],
    enabled: enabled && !!fiscalYearId,
    staleTime: 60_000,
    queryFn: async ({ signal }) =>
      (await rpc('audit_reconciliation', { p_fiscal_year_id: fiscalYearId as string }, { signal })) as unknown as AuditReconciliation,
  });
