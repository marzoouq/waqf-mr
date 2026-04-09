/**
 * هوك إدارة حالة نموذج إنشاء فاتورة من قالب
 */
import { useState, useMemo } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import type { Contract } from '@/types/database';
import type { AllowanceChargeItem } from '@/components/invoices';

export const INVOICE_TYPES = [
  { value: 'rent', label: 'إيجار' },
  { value: 'maintenance', label: 'صيانة ومقاولات' },
  { value: 'utilities', label: 'خدمات (كهرباء/مياه)' },
  { value: 'other', label: 'أخرى' },
];

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface UseCreateInvoiceFormParams {
  contracts: Contract[];
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

export function useCreateInvoiceForm({ contracts, onSave }: UseCreateInvoiceFormParams) {
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceType, setInvoiceType] = useState('rent');
  const [contractId, setContractId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, vatRate: 15 },
  ]);
  const [allowances, setAllowances] = useState<AllowanceChargeItem[]>([]);
  const [charges, setCharges] = useState<AllowanceChargeItem[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<'professional' | 'simplified'>('professional');

  const selectedContract = contracts.find(c => c.id === contractId);

  // عند اختيار عقد — تعبئة تلقائية
  const handleContractChange = (cId: string) => {
    setContractId(cId);
    const c = contracts.find(ct => ct.id === cId);
    if (c) {
      setPropertyId(c.property_id);
      if (c.payment_amount) {
        setItems([{
          id: crypto.randomUUID(),
          description: `إيجار — عقد ${c.contract_number}`,
          quantity: 1,
          unitPrice: safeNumber(c.payment_amount),
          vatRate: 15,
        }]);
      }
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, vatRate: 15 }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  // حسابات
  const computedItems = useMemo(() => items.map(item => {
    const subtotal = safeNumber(item.quantity) * safeNumber(item.unitPrice);
    const vatAmount = Math.round(subtotal * (safeNumber(item.vatRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { ...item, subtotal, vatAmount, total };
  }), [items]);

  const totalExVat = computedItems.reduce((s, i) => s + i.subtotal, 0);
  const totalVat = computedItems.reduce((s, i) => s + i.vatAmount, 0);
  const grandTotal = Math.round((totalExVat + totalVat) * 100) / 100;

  const isStandard = !!selectedContract?.tenant_tax_number;

  // حقول ناقصة
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

    await onSave({
      // حقل nullable لكن الـ type يتوقع string — cast ضروري
      invoice_number: invoiceNumber || null as unknown as string,
      invoice_type: invoiceType,
      amount: grandTotal,
      date: invoiceDate,
      property_id: propertyId || null,
      contract_id: contractId || null,
      description: items.map(i => i.description).filter(Boolean).join(' | ') || notes || null,
      status: 'pending',
      vat_rate: (() => {
        const totalBase = items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
        if (totalBase <= 0) return items[0]?.vatRate || 15;
        return Math.round(items.reduce((s, i) => s + ((i.quantity * i.unitPrice) / totalBase) * i.vatRate, 0) * 100) / 100;
      })(),
      vat_amount: totalVat,
    });

    // إعادة تهيئة
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setContractId('');
    setPropertyId('');
    setNotes('');
    setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, vatRate: 15 }]);
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
