import { describe, it, expect } from 'vitest';
import { buildClosureChecklist } from './closeYearChecklist.utils';

describe('buildClosureChecklist', () => {
  const defaults = {
    totalIncome: 100000,
    totalExpenses: 50000,
    hasAccount: true,
    distributionsAmount: 10000,
    availableAmount: 5000,
    pendingAdvances: 0,
    unpaidInvoices: 0,
    beneficiaryPercentage: 60,
  };

  it('يُرجع جميع العناصر ناجحة في الحالة المثالية', () => {
    const items = buildClosureChecklist(defaults);
    expect(items.every(i => i.passed)).toBe(true);
  });

  it('يفشل عند عدم وجود حساب ختامي (severity: error)', () => {
    const items = buildClosureChecklist({ ...defaults, hasAccount: false });
    const accountItem = items.find(i => i.label.includes('الحساب الختامي'));
    expect(accountItem?.passed).toBe(false);
    expect(accountItem?.severity).toBe('error');
  });

  it('يحذّر عند عدم وجود إيرادات', () => {
    const items = buildClosureChecklist({ ...defaults, totalIncome: 0 });
    const incomeItem = items.find(i => i.label.includes('الإيرادات'));
    expect(incomeItem?.passed).toBe(false);
    expect(incomeItem?.severity).toBe('warning');
  });

  it('يعطي خطأ عند تجاوز النسب 100%', () => {
    const items = buildClosureChecklist({ ...defaults, beneficiaryPercentage: 120 });
    const pctItem = items.find(i => i.label.includes('نسب المستفيدين'));
    expect(pctItem?.passed).toBe(false);
    expect(pctItem?.severity).toBe('error');
  });

  it('يحذّر عند 0% نسب المستفيدين', () => {
    const items = buildClosureChecklist({ ...defaults, beneficiaryPercentage: 0 });
    const pctItem = items.find(i => i.label.includes('نسب المستفيدين'));
    expect(pctItem?.passed).toBe(false);
    expect(pctItem?.severity).toBe('warning');
  });

  it('يحذّر عند وجود فواتير غير مسددة', () => {
    const items = buildClosureChecklist({ ...defaults, unpaidInvoices: 3 });
    const invItem = items.find(i => i.label.includes('فاتورة'));
    expect(invItem?.passed).toBe(false);
    expect(invItem?.severity).toBe('warning');
  });

  it('يحذّر عند وجود سُلف معلقة', () => {
    const items = buildClosureChecklist({ ...defaults, pendingAdvances: 2 });
    const advItem = items.find(i => i.label.includes('سلفة'));
    expect(advItem?.passed).toBe(false);
    expect(advItem?.severity).toBe('warning');
  });

  it('ينجح التوزيع عند عدم وجود مبلغ متاح', () => {
    const items = buildClosureChecklist({ ...defaults, distributionsAmount: 0, availableAmount: 0 });
    const distItem = items.find(i => i.label.includes('توزيع'));
    expect(distItem?.passed).toBe(true);
  });

  it('يحذّر عند عدم التوزيع مع وجود مبلغ متاح', () => {
    const items = buildClosureChecklist({ ...defaults, distributionsAmount: 0, availableAmount: 5000 });
    const distItem = items.find(i => i.label.includes('توزيع'));
    expect(distItem?.passed).toBe(false);
  });

  it('يُرجع 6 عناصر دائماً', () => {
    const items = buildClosureChecklist(defaults);
    expect(items).toHaveLength(6);
  });
});
