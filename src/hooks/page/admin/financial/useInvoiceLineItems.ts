/**
 * إدارة بنود الفاتورة — items + add/remove/update + الحسابات.
 * مفصول لتقليل حجم useCreateInvoiceForm.
 */
import { useState, useMemo, useCallback } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { safeUuid } from '@/lib/utils/safeUuid';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

const makeBlankItem = (vatRate: number): LineItem => ({
  id: safeUuid(),
  description: '',
  quantity: 1,
  unitPrice: 0,
  vatRate,
});

export function useInvoiceLineItems(defaultVatRate: number, resolveCurrentVatRate: () => number) {
  const [items, setItems] = useState<LineItem[]>([makeBlankItem(defaultVatRate)]);

  const addItem = useCallback(() => {
    const rate = resolveCurrentVatRate();
    setItems(prev => [...prev, makeBlankItem(rate)]);
  }, [resolveCurrentVatRate]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => (prev.length <= 1 ? prev : prev.filter(i => i.id !== id)));
  }, []);

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  }, []);

  const computedItems = useMemo(() => items.map(item => {
    const subtotal = safeNumber(item.quantity) * safeNumber(item.unitPrice);
    const vatAmount = Math.round(subtotal * (safeNumber(item.vatRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { ...item, subtotal, vatAmount, total };
  }), [items]);

  const totalExVat = computedItems.reduce((s, i) => s + i.subtotal, 0);
  const totalVat = computedItems.reduce((s, i) => s + i.vatAmount, 0);
  const grandTotal = Math.round((totalExVat + totalVat) * 100) / 100;

  const resetItems = useCallback(() => {
    setItems([makeBlankItem(safeNumber(defaultVatRate))]);
  }, [defaultVatRate]);

  return {
    items, setItems, addItem, removeItem, updateItem,
    computedItems, totalExVat, totalVat, grandTotal,
    resetItems,
  };
}
