import { describe, it, expect } from 'vitest';
import { bankSectionView, bankBalanceSourceLabel, bankNoteToShow } from './bankSectionView';
import type { WaqfBankAccount, WaqfBankStatement } from '@/types';

const account = (over: Partial<WaqfBankAccount> = {}): WaqfBankAccount => ({
  id: 'a', bank_name: 'البنك', account_holder: 'الوقف', account_number: '1', iban: null,
  recorded_balance: 384986.6, balance_as_of: '2026-10-24', balance_source: 'corpus_carryforward',
  source_fiscal_year_id: 'fy', source_fiscal_year_label: '2025-2026', notes: null,
  visible_to_beneficiaries: false, statement_visible_to_beneficiaries: false, updated_at: '', ...over,
});
const statement: WaqfBankStatement = {
  id: 's', storage_path: 'statements/1.pdf', file_name: 'k.pdf', mime_type: 'application/pdf',
  file_size_bytes: 1, statement_date: null, notes: null, is_current: true, created_at: '',
};

describe('قسم الحساب البنكي — قرار الإظهار', () => {
  it('المستفيد لا يرى القسم ما لم يفعّله الناظر', () => {
    expect(bankSectionView('beneficiary', account(), statement).showSection).toBe(false);
    expect(bankSectionView('waqif', account(), statement).showSection).toBe(false);
  });
  it('إظهار القسم وحده لا يُظهر زر الكشف', () => {
    const v = bankSectionView('beneficiary', account({ visible_to_beneficiaries: true }), statement);
    expect(v.showSection).toBe(true);
    expect(v.showStatementDownload).toBe(false);
  });
  it('زر الكشف لا يظهر قبل رفع الكشف حتى لو أتاحه الناظر', () => {
    const a = account({ visible_to_beneficiaries: true, statement_visible_to_beneficiaries: true });
    expect(bankSectionView('beneficiary', a, null).showStatementDownload).toBe(false);
    expect(bankSectionView('beneficiary', a, statement).showStatementDownload).toBe(true);
  });
  it('إتاحة الكشف مع إخفاء القسم لا تُظهر شيئاً', () => {
    const v = bankSectionView('beneficiary', account({ statement_visible_to_beneficiaries: true }), statement);
    expect(v.showSection).toBe(false);
    expect(v.showStatementDownload).toBe(false);
  });
  it('المحاسب يطّلع على القسم والكشف دون تعديل', () => {
    const v = bankSectionView('accountant', account(), statement);
    expect(v).toEqual({ showSection: true, showStatementDownload: true, canEdit: false, showHistory: true });
  });
  it('الناظر وحده يعدّل', () => {
    expect(bankSectionView('admin', account(), null).canEdit).toBe(true);
    expect(bankSectionView('beneficiary', account({ visible_to_beneficiaries: true }), null).canEdit).toBe(false);
  });
  it('لا صف = لا قسم لأي دور', () => {
    expect(bankSectionView('admin', null, null).showSection).toBe(false);
  });
  it('مصدر الرصيد يذكر سنة رقبة الوقف المرحّلة', () => {
    expect(bankBalanceSourceLabel('corpus_carryforward', '2025-2026')).toContain('2025-2026');
    expect(bankBalanceSourceLabel('manual')).toBe('رصيد محدّث من الناظر');
  });
});

describe('bankNoteToShow', () => {
  it('يخفي الملاحظة المطابقة لوصف مصدر الرصيد (منع التكرار)', () => {
    expect(bankNoteToShow('رقبة الوقف المرحّلة من السنة 2025-2026', bankBalanceSourceLabel('corpus_carryforward', '2025-2026'))).toBeNull();
  });
  it('يعرض الملاحظة المختلفة', () => {
    expect(bankNoteToShow('تمت المطابقة مع كشف أكتوبر', 'رصيد محدّث من الناظر')).toBe('تمت المطابقة مع كشف أكتوبر');
  });
});
