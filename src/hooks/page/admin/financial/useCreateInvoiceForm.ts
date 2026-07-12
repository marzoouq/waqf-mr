/**
 * هوك إدارة حالة نموذج إنشاء فاتورة من قالب
 */
import { useState, useCallback } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import type { Contract } from '@/types';
import type { AllowanceChargeItem } from '@/types/invoices';
import { useInvoiceLineItems, type LineItem } from './useInvoiceLineItems';

export type { LineItem };

export const INVOICE_TYPES = [
  { value: 'rent', label: 'إيجار' },
  { value: 'maintenance', label: 'صيانة ومقاولات' },
  { value: 'utilities', label: 'خدمات (كهرباء/مياه)' },
  { value: 'other', label: 'أخرى' },
];

interface UseCreateInvoiceFormParams {
  contracts: Contract[];
  /** نسبة الضريبة الافتراضية من إعدادات النظام (تُستخدم عندما لا يكون العقار معفى) */
  defaultVatRate?: number;
  onSave: (data: {
    invoice_number: string;
    invoice_type: string;
    amount: number;
    date: string;
    property_id: string | null;
    contract_id: string | null;
    description: string | null;
    status: string;
    vat_rate: number;
    vat_amount: number;
  }) => Promise<void>;
}

/** نسبة الضريبة الفعلية حسب إعفاء العقار */
const resolveVatRateFor = (c: Contract | undefined | null, defaultVatRate: number): number => {
  const vatExempt = (c as unknown as { property?: { vat_exempt?: boolean } } | undefined)?.property?.vat_exempt;
  return vatExempt ? 0 : safeNumber(defaultVatRate);
};

export function useCreateInvoiceForm({ contracts, onSave, defaultVatRate = 15 }: UseCreateInvoiceFormParams) {
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceType, setInvoiceType] = useState('rent');
  const [contractId, setContractId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [notes, setNotes] = useState('');
  const [allowances, setAllowances] = useState<AllowanceChargeItem[]>([]);
  const [charges, setCharges] = useState<AllowanceChargeItem[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<'professional' | 'simplified'>('professional');

  const selectedContract = contracts.find(c => c.id === contractId);

  const resolveCurrentVatRate = useCallback(
    () => resolveVatRateFor(contracts.find(c => c.id === contractId), defaultVatRate),
    [contracts, contractId, defaultVatRate],
  );

  const {
    items, setItems, addItem, removeItem, updateItem,
    computedItems, totalExVat, totalVat, grandTotal, resetItems,
  } = useInvoiceLineItems(defaultVatRate, resolveCurrentVatRate);

  // عند اختيار عقد — تعبئة تلقائية
  const handleContractChange = (cId: string) => {
    setContractId(cId);
    const c = contracts.find(ct => ct.id === cId);
    if (!c) return;
    setPropertyId(c.property_id);
    const rate = resolveVatRateFor(c, defaultVatRate);
    if (c.payment_amount) {
      setItems([{
        id: safeUuid(),
        description: `إيجار — عقد ${c.contract_number}`,
        quantity: 1,
        unitPrice: safeNumber(c.payment_amount),
        vatRate: rate,
      }]);
    } else {
      setItems(prev => prev.map(it => ({ ...it, vatRate: rate })));
    }
  };

  const isStandard = !!selectedContract?.tenant_tax_number;

  const missingFields: string[] = [];
  if (isStandard) {
    if (!selectedContract?.tenant_tax_number) missingFields.push('الرقم الضريبي للمشتري');
    if (!selectedContract?.tenant_street) missingFields.push('عنوان المشتري');
  }

  const buyerAddress = selectedContract
    ? [selectedContract.tenant_street, selectedContract.tenant_building, selectedContract.tenant_district, selectedContract.tenant_city, selectedContract.tenant_postal_code].filter(Boolean).join('، ')
    : '';

  const handleSave = async () => {
    if (!invoiceType || !invoiceDate) return;
    if (grandTotal <= 0) return;

    const totalBase = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const vatRate = totalBase <= 0
      ? (items[0]?.vatRate ?? resolveCurrentVatRate())
      : Math.round(items.reduce((s, i) => s + ((i.quantity * i.unitPrice) / totalBase) * i.vatRate, 0) * 100) / 100;

    await onSave({
      invoice_number: invoiceNumber || (null as unknown as string),
      invoice_type: invoiceType,
      amount: grandTotal,
      date: invoiceDate,
      property_id: propertyId || null,
      contract_id: contractId || null,
      description: items.map(i => i.description).filter(Boolean).join(' | ') || notes || null,
      status: 'pending',
      vat_rate: vatRate,
      vat_amount: totalVat,
    });

    // إعادة تهيئة
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setContractId('');
    setPropertyId('');
    setNotes('');
    resetItems();
    setAllowances([]);
    setCharges([]);
    setActiveTab('form');
  };

  return {
    activeTab, setActiveTab,
    invoiceNumber, setInvoiceNumber,
    invoiceDate, setInvoiceDate,
    invoiceType, setInvoiceType,
    contractId, propertyId, setPropertyId,
    notes, setNotes,
    items, setItems,
    allowances, setAllowances,
    charges, setCharges,
    previewTemplate, setPreviewTemplate,
    selectedContract,
    handleContractChange,
    addItem, removeItem, updateItem,
    computedItems,
    totalExVat, totalVat, grandTotal,
    isStandard, missingFields, buyerAddress,
    handleSave,
  };
}
