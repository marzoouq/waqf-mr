/**
 * Pure display decisions for the waqf bank section.
 * الخادم هو صاحب القرار (RLS)؛ هذه الدالة تمنع إظهار ما لم يُأذن به حتى لو وصل.
 */
import type { AppRole, WaqfBankAccount, WaqfBankStatement, BankBalanceSource } from '@/types';
import { ltr } from '@/utils/format/bidi';

export interface BankSectionView {
  showSection: boolean;
  showStatementDownload: boolean;
  canEdit: boolean;
  showHistory: boolean;
}

const STAFF: readonly AppRole[] = ['admin', 'accountant'];

export const bankSectionView = (
  role: AppRole | null | undefined,
  account: WaqfBankAccount | null | undefined,
  statement: WaqfBankStatement | null | undefined,
): BankSectionView => {
  const isStaff = !!role && STAFF.includes(role);
  const isViewer = role === 'beneficiary' || role === 'waqif';
  const showSection = !!account && (isStaff || (isViewer && account.visible_to_beneficiaries));
  const hasFile = !!statement && statement.is_current;
  const showStatementDownload = showSection && hasFile
    && (isStaff || (!!account && account.statement_visible_to_beneficiaries));
  return { showSection, showStatementDownload, canEdit: role === 'admin', showHistory: isStaff };
};

export const bankBalanceSourceLabel = (source: BankBalanceSource | string, fiscalYearLabel?: string | null): string =>
  source === 'corpus_carryforward'
    ? (fiscalYearLabel ? `رقبة الوقف المرحّلة من السنة ${ltr(fiscalYearLabel)}` : 'رقبة الوقف المرحّلة')
    : 'رصيد محدّث من الناظر';

const stripIsolates = (t: string) => t.replace(/[\u2066\u2069]/g, '').trim();
/** Stored note is shown only when it adds something beyond the balance-source description. */
export const bankNoteToShow = (notes: string | null | undefined, sourceHint: string): string | null =>
  notes && stripIsolates(notes) !== stripIsolates(sourceHint) ? notes : null;
