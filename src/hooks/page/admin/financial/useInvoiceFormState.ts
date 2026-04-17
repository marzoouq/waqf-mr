/**
 * هوك إدارة حالة نموذج الفاتورة (formData + editingInvoice + handlers)
 */
import { useState, useCallback } from 'react';
import type { Invoice } from '@/hooks/data/invoices/useInvoices';

export type InvoiceFormData = {
  invoice_number: string;
  invoice_type: string;
  amount: string;
  date: string;
  property_id: string;
  contract_id: string;
  description: string;
  status: string;
};

const EMPTY_FORM: InvoiceFormData = {
  invoice_number: '', invoice_type: '', amount: '', date: '',
  property_id: '', contract_id: '', description: '', status: 'pending',
};

export function useInvoiceFormState() {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>(EMPTY_FORM);

  const resetFormState = useCallback(() => {
    setFormData(EMPTY_FORM);
    setEditingInvoice(null);
  }, []);

  const loadInvoiceIntoForm = useCallback((item: Invoice) => {
    setEditingInvoice(item);
    setFormData({
      invoice_number: item.invoice_number || '',
      invoice_type: item.invoice_type,
      amount: item.amount.toString(),
      date: item.date,
      property_id: item.property_id || '',
      contract_id: item.contract_id || '',
      description: item.description || '',
      status: item.status,
    });
  }, []);

  return {
    editingInvoice,
    formData, setFormData,
    resetFormState,
    loadInvoiceIntoForm,
  };
}
