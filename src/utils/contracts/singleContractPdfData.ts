/**
 * Pure builder: maps a contract (+ its payment invoices) to the single-contract PDF input.
 * لا حساب للأرقام — تُعرض القيم المخزّنة كما هي.
 */
import { CONTRACT_STATUSES, TENANT_ID_TYPES } from '@/constants/entities';
import { getEffectiveContractStatus } from '@/utils/contracts/contractStatus';
import { getPaymentTypeLabel } from '@/utils/financial/contracts/contractHelpers';
import { statusLabel as invoiceStatusLabel } from '@/utils/invoices/invoiceTemplate';

export interface SingleContractSource {
  contract_number: string | null;
  tenant_name: string | null;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  status: string | null;
  payment_type?: string | null;
  payment_count?: number | null;
  payment_amount?: number | null;
  notes?: string | null;
  tenant_id_type?: string | null;
  tenant_id_number?: string | null;
  tenant_crn?: string | null;
  tenant_tax_number?: string | null;
  tenant_street?: string | null;
  tenant_building?: string | null;
  tenant_district?: string | null;
  tenant_city?: string | null;
  tenant_postal_code?: string | null;
  property?: { property_number?: string | null; location?: string | null } | null;
  unit?: { unit_number?: string | null } | null;
  fiscal_year_id?: string | null;
}

export interface SingleContractPdfData {
  contractNumber: string;
  statusLabel: string;
  propertyLabel: string;
  unitLabel: string | null;
  startDate: string;
  endDate: string;
  annualRent: number;
  paymentTypeLabel: string | null;
  paymentCount: number | null;
  paymentAmount: number | null;
  tenantRows: Array<[string, string]>;
  notes: string | null;
  payments: Array<{ number: number; dueDate: string; amount: number; statusLabel: string }>;
  fiscalYearId: string | null;
}

const idTypeLabel = (v?: string | null) => TENANT_ID_TYPES.find(t => t.value === v)?.label ?? v ?? '';

export const buildSingleContractPdfData = (
  c: SingleContractSource,
  invoices: ReadonlyArray<{ payment_number: number; due_date: string; amount: number; status: string }> = [],
  propertyLabel?: string | null,
): SingleContractPdfData => {
  const effective = getEffectiveContractStatus(c.status, c.end_date);
  const address = [c.tenant_street, c.tenant_building, c.tenant_district, c.tenant_city, c.tenant_postal_code]
    .filter(Boolean).join('، ');
  const tenantRows: Array<[string, string]> = [['اسم المستأجر', c.tenant_name ?? '—']];
  if (c.tenant_id_number) tenantRows.push([idTypeLabel(c.tenant_id_type) || 'رقم الهوية', c.tenant_id_number]);
  if (c.tenant_crn) tenantRows.push(['السجل التجاري', c.tenant_crn]);
  if (c.tenant_tax_number) tenantRows.push(['الرقم الضريبي', c.tenant_tax_number]);
  if (address) tenantRows.push(['العنوان', address]);

  const prop = propertyLabel
    ?? [c.property?.property_number, c.property?.location].filter(Boolean).join(' — ');

  return {
    contractNumber: c.contract_number ?? '—',
    statusLabel: CONTRACT_STATUSES[effective as keyof typeof CONTRACT_STATUSES] ?? effective,
    propertyLabel: prop || '—',
    unitLabel: c.unit?.unit_number ?? null,
    startDate: c.start_date ?? '',
    endDate: c.end_date ?? '',
    annualRent: Number(c.rent_amount ?? 0),
    paymentTypeLabel: c.payment_type ? getPaymentTypeLabel(c.payment_type) : null,
    paymentCount: c.payment_count ?? null,
    paymentAmount: c.payment_amount === null || c.payment_amount === undefined ? null : Number(c.payment_amount),
    tenantRows,
    notes: c.notes ?? null,
    payments: [...invoices]
      .sort((a, b) => a.payment_number - b.payment_number)
      .map(i => ({ number: i.payment_number, dueDate: i.due_date, amount: Number(i.amount), statusLabel: invoiceStatusLabel(i.status) })),
    fiscalYearId: c.fiscal_year_id ?? null,
  };
};

export const singleContractFilename = (contractNumber: string) =>
  `lease-contract_${contractNumber.replace(/[^\w\u0600-\u06FF-]+/g, '-')}.pdf`;
