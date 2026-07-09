import { describe, it, expect } from 'vitest';
import { mapExpenseTypeToInvoiceType } from './expenseInvoiceTypeMap';

describe('mapExpenseTypeToInvoiceType', () => {
  it('يحوّل كهرباء ومياه إلى utilities', () => {
    expect(mapExpenseTypeToInvoiceType('كهرباء')).toBe('utilities');
    expect(mapExpenseTypeToInvoiceType('مياه')).toBe('utilities');
  });

  it('يحوّل صيانة وعمالة إلى maintenance', () => {
    expect(mapExpenseTypeToInvoiceType('صيانة')).toBe('maintenance');
    expect(mapExpenseTypeToInvoiceType('عمالة')).toBe('maintenance');
  });

  it('يُرجع other للأنواع غير المُخرَّطة أو الفارغة', () => {
    expect(mapExpenseTypeToInvoiceType('أخرى')).toBe('other');
    expect(mapExpenseTypeToInvoiceType('تأمين')).toBe('other');
    expect(mapExpenseTypeToInvoiceType('')).toBe('other');
    expect(mapExpenseTypeToInvoiceType(null)).toBe('other');
    expect(mapExpenseTypeToInvoiceType(undefined)).toBe('other');
  });

  it('يتجاهل المسافات', () => {
    expect(mapExpenseTypeToInvoiceType('  كهرباء  ')).toBe('utilities');
  });
});
