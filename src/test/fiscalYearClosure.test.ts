/**
 * اختبارات منطق إقفال وإعادة فتح السنة المالية.
 * تغطي: close_fiscal_year و reopen_fiscal_year RPCs
 * — التحقق من الأدوار، الحالات، الحسابات الختامية، والتحذيرات.
 */
import { describe, it, expect } from 'vitest';

// ─── محاكاة بنية close_fiscal_year ───

interface CloseParams {
  fiscal_year_id: string;
  account_data: Record<string, number>;
  waqf_corpus_manual: number;
  caller_role: 'admin' | 'accountant' | 'beneficiary' | 'waqif' | null;
  fy_status: 'active' | 'closed' | null;
  pending_distributions: number;
  pending_advances: number;
  unpaid_invoices: number;
  existing_account_id: string | null;
  existing_next_fy: string | null;
}

interface CloseResult {
  success: boolean;
  account_id: string;
  carried_invoices: number;
  warnings: string[];
}

/**
 * محاكاة منطق close_fiscal_year RPC بدون قاعدة بيانات فعلية.
 * يعكس المنطق الحقيقي من migration 20260323032316.
 */
function simulateCloseFiscalYear(params: CloseParams): CloseResult {
  const {
    caller_role, fy_status, pending_distributions, pending_advances,
    unpaid_invoices, existing_account_id,
  } = params;

  // 1. التحقق من الدور
  // #10: الناظر فقط — المحاسب لم يعد يملك صلاحية الإقفال
  if (caller_role !== 'admin') {
    throw new Error('فقط الناظر يملك صلاحية إقفال السنة المالية');
  }

  // 2. التحقق من وجود السنة
  if (fy_status === null) {
    throw new Error('السنة المالية غير موجودة');
  }

  // 3. التحقق من الحالة
  if (fy_status === 'closed') {
    throw new Error('السنة المالية مقفلة بالفعل');
  }

  // 4. جمع التحذيرات
  const warnings: string[] = [];
  if (pending_distributions > 0) {
    warnings.push(`يوجد ${pending_distributions} توزيع بحالة معلقة`);
  }
  if (pending_advances > 0) {
    warnings.push(`يوجد ${pending_advances} طلب سلفة بحالة معلقة أو موافق عليها`);
  }

  // 5. إنشاء أو تحديث الحساب
  const account_id = existing_account_id ?? 'new-account-id';

  // 6. ترحيل الفواتير
  if (unpaid_invoices > 0) {
    warnings.push(`تم ترحيل ${unpaid_invoices} فاتورة غير مسددة للسنة التالية`);
  }

  return {
    success: true,
    account_id,
    carried_invoices: unpaid_invoices,
    warnings,
  };
}

// ─── محاكاة reopen_fiscal_year ───

interface ReopenParams {
  fiscal_year_id: string;
  reason: string | null;
  caller_role: 'admin' | 'accountant' | 'beneficiary' | null;
  fy_status: 'active' | 'closed' | null;
  fy_label: string | null;
}

function simulateReopenFiscalYear(params: ReopenParams): { label: string } {
  const { caller_role, fy_status, fy_label, reason } = params;

  // الناظر فقط
  if (caller_role !== 'admin') {
    throw new Error('غير مصرح بإعادة فتح السنة المالية');
  }

  if (fy_label === null || fy_status === null) {
    throw new Error('السنة المالية غير موجودة');
  }

  if (fy_status !== 'closed') {
    throw new Error('السنة المالية ليست مقفلة');
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error('سبب إعادة الفتح مطلوب');
  }

  return { label: fy_label };
}

// ─── الاختبارات ───

describe('close_fiscal_year — التحقق من الأدوار', () => {
  const baseParams: CloseParams = {
    fiscal_year_id: 'fy-1',
    account_data: { total_income: 100000, total_expenses: 20000 },
    waqf_corpus_manual: 5000,
    caller_role: 'admin',
    fy_status: 'active',
    pending_distributions: 0,
    pending_advances: 0,
    unpaid_invoices: 0,
    existing_account_id: null,
    existing_next_fy: null,
  };

  it('admin يمكنه إقفال السنة المالية', () => {
    const result = simulateCloseFiscalYear({ ...baseParams, caller_role: 'admin' });
    expect(result.success).toBe(true);
  });

  it('accountant لا يمكنه إقفال السنة المالية (admin فقط)', () => {
    expect(() => simulateCloseFiscalYear({ ...baseParams, caller_role: 'accountant' }))
      .toThrow('فقط الناظر يملك صلاحية إقفال السنة المالية');
  });

  it('beneficiary لا يمكنه إقفال السنة', () => {
    expect(() => simulateCloseFiscalYear({ ...baseParams, caller_role: 'beneficiary' }))
      .toThrow('فقط الناظر يملك صلاحية إقفال السنة المالية');
  });

  it('waqif لا يمكنه إقفال السنة', () => {
    expect(() => simulateCloseFiscalYear({ ...baseParams, caller_role: 'waqif' }))
      .toThrow('فقط الناظر يملك صلاحية إقفال السنة المالية');
  });

  it('مستخدم غير مصادق لا يمكنه الإقفال', () => {
    expect(() => simulateCloseFiscalYear({ ...baseParams, caller_role: null }))
      .toThrow('فقط الناظر يملك صلاحية إقفال السنة المالية');
  });
});

describe('close_fiscal_year — التحقق من الحالة', () => {
  const baseParams: CloseParams = {
    fiscal_year_id: 'fy-1',
    account_data: { total_income: 100000 },
    waqf_corpus_manual: 0,
    caller_role: 'admin',
    fy_status: 'active',
    pending_distributions: 0,
    pending_advances: 0,
    unpaid_invoices: 0,
    existing_account_id: null,
    existing_next_fy: null,
  };

  it('لا يمكن إقفال سنة مقفلة بالفعل', () => {
    expect(() => simulateCloseFiscalYear({ ...baseParams, fy_status: 'closed' }))
      .toThrow('السنة المالية مقفلة بالفعل');
  });

  it('لا يمكن إقفال سنة غير موجودة', () => {
    expect(() => simulateCloseFiscalYear({ ...baseParams, fy_status: null }))
      .toThrow('السنة المالية غير موجودة');
  });
});

describe('close_fiscal_year — التحذيرات', () => {
  const baseParams: CloseParams = {
    fiscal_year_id: 'fy-1',
    account_data: { total_income: 200000, total_expenses: 50000 },
    waqf_corpus_manual: 10000,
    caller_role: 'admin',
    fy_status: 'active',
    pending_distributions: 0,
    pending_advances: 0,
    unpaid_invoices: 0,
    existing_account_id: null,
    existing_next_fy: null,
  };

  it('يُنجح الإقفال بدون تحذيرات عند عدم وجود معلقات', () => {
    const result = simulateCloseFiscalYear(baseParams);
    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('يحذّر عند وجود توزيعات معلقة', () => {
    const result = simulateCloseFiscalYear({ ...baseParams, pending_distributions: 3 });
    expect(result.success).toBe(true);
    expect(result.warnings).toContain('يوجد 3 توزيع بحالة معلقة');
  });

  it('يحذّر عند وجود سلف معلقة', () => {
    const result = simulateCloseFiscalYear({ ...baseParams, pending_advances: 2 });
    expect(result.success).toBe(true);
    expect(result.warnings).toContain('يوجد 2 طلب سلفة بحالة معلقة أو موافق عليها');
  });

  it('يحذّر عند ترحيل فواتير غير مسددة', () => {
    const result = simulateCloseFiscalYear({ ...baseParams, unpaid_invoices: 5 });
    expect(result.success).toBe(true);
    expect(result.carried_invoices).toBe(5);
    expect(result.warnings).toContain('تم ترحيل 5 فاتورة غير مسددة للسنة التالية');
  });

  it('يجمع تحذيرات متعددة في آن واحد', () => {
    const result = simulateCloseFiscalYear({
      ...baseParams,
      pending_distributions: 1,
      pending_advances: 2,
      unpaid_invoices: 3,
    });
    expect(result.warnings).toHaveLength(3);
  });
});

describe('close_fiscal_year — الحساب الختامي', () => {
  it('ينشئ حساباً جديداً إذا لم يكن موجوداً', () => {
    const result = simulateCloseFiscalYear({
      fiscal_year_id: 'fy-1',
      account_data: { total_income: 100000 },
      waqf_corpus_manual: 0,
      caller_role: 'admin',
      fy_status: 'active',
      pending_distributions: 0,
      pending_advances: 0,
      unpaid_invoices: 0,
      existing_account_id: null,
      existing_next_fy: null,
    });
    expect(result.account_id).toBe('new-account-id');
  });

  it('يحدّث الحساب الموجود مسبقاً', () => {
    const result = simulateCloseFiscalYear({
      fiscal_year_id: 'fy-1',
      account_data: { total_income: 100000 },
      waqf_corpus_manual: 0,
      caller_role: 'admin',
      fy_status: 'active',
      pending_distributions: 0,
      pending_advances: 0,
      unpaid_invoices: 0,
      existing_account_id: 'existing-acc-id',
      existing_next_fy: null,
    });
    expect(result.account_id).toBe('existing-acc-id');
  });
});

// ─── reopen_fiscal_year ───

describe('reopen_fiscal_year — التحقق من الأدوار', () => {
  it('admin يمكنه إعادة فتح السنة المقفلة', () => {
    const result = simulateReopenFiscalYear({
      fiscal_year_id: 'fy-1',
      reason: 'تصحيح بيانات',
      caller_role: 'admin',
      fy_status: 'closed',
      fy_label: '1445/1446',
    });
    expect(result.label).toBe('1445/1446');
  });

  it('accountant لا يمكنه إعادة فتح السنة', () => {
    expect(() => simulateReopenFiscalYear({
      fiscal_year_id: 'fy-1',
      reason: 'تصحيح',
      caller_role: 'accountant',
      fy_status: 'closed',
      fy_label: '1445/1446',
    })).toThrow('غير مصرح بإعادة فتح السنة المالية');
  });

  it('beneficiary لا يمكنه إعادة فتح السنة', () => {
    expect(() => simulateReopenFiscalYear({
      fiscal_year_id: 'fy-1',
      reason: 'تصحيح',
      caller_role: 'beneficiary',
      fy_status: 'closed',
      fy_label: '1445/1446',
    })).toThrow('غير مصرح بإعادة فتح السنة المالية');
  });
});

describe('reopen_fiscal_year — التحقق من الحالة', () => {
  it('لا يمكن إعادة فتح سنة نشطة', () => {
    expect(() => simulateReopenFiscalYear({
      fiscal_year_id: 'fy-1',
      reason: 'سبب',
      caller_role: 'admin',
      fy_status: 'active',
      fy_label: '1445/1446',
    })).toThrow('السنة المالية ليست مقفلة');
  });

  it('لا يمكن إعادة فتح سنة غير موجودة', () => {
    expect(() => simulateReopenFiscalYear({
      fiscal_year_id: 'fy-missing',
      reason: 'سبب',
      caller_role: 'admin',
      fy_status: null,
      fy_label: null,
    })).toThrow('السنة المالية غير موجودة');
  });
});

describe('reopen_fiscal_year — التحقق من السبب', () => {
  it('يرفض إعادة الفتح بدون سبب', () => {
    expect(() => simulateReopenFiscalYear({
      fiscal_year_id: 'fy-1',
      reason: null,
      caller_role: 'admin',
      fy_status: 'closed',
      fy_label: '1445/1446',
    })).toThrow('سبب إعادة الفتح مطلوب');
  });

  it('يرفض سبب فارغ', () => {
    expect(() => simulateReopenFiscalYear({
      fiscal_year_id: 'fy-1',
      reason: '   ',
      caller_role: 'admin',
      fy_status: 'closed',
      fy_label: '1445/1446',
    })).toThrow('سبب إعادة الفتح مطلوب');
  });

  it('يقبل سبباً نصياً صالحاً', () => {
    const result = simulateReopenFiscalYear({
      fiscal_year_id: 'fy-1',
      reason: 'اكتشاف خطأ في بيانات الدخل',
      caller_role: 'admin',
      fy_status: 'closed',
      fy_label: '1446/1447',
    });
    expect(result.label).toBe('1446/1447');
  });
});

describe('close → reopen دورة كاملة', () => {
  it('يمكن إقفال سنة ثم إعادة فتحها', () => {
    // إقفال
    const closeResult = simulateCloseFiscalYear({
      fiscal_year_id: 'fy-cycle',
      account_data: { total_income: 500000, total_expenses: 100000 },
      waqf_corpus_manual: 20000,
      caller_role: 'admin',
      fy_status: 'active',
      pending_distributions: 0,
      pending_advances: 0,
      unpaid_invoices: 0,
      existing_account_id: null,
      existing_next_fy: null,
    });
    expect(closeResult.success).toBe(true);

    // إعادة فتح
    const reopenResult = simulateReopenFiscalYear({
      fiscal_year_id: 'fy-cycle',
      reason: 'تصحيح مبلغ الزكاة',
      caller_role: 'admin',
      fy_status: 'closed',
      fy_label: '1445/1446',
    });
    expect(reopenResult.label).toBe('1445/1446');
  });

  it('المحاسب لا يمكنه إقفال ولا إعادة فتح السنة', () => {
    // المحاسب لم يعد يملك صلاحية الإقفال (#10)
    expect(() => simulateCloseFiscalYear({
      fiscal_year_id: 'fy-cycle-2',
      account_data: { total_income: 100000 },
      waqf_corpus_manual: 0,
      caller_role: 'accountant',
      fy_status: 'active',
      pending_distributions: 0,
      pending_advances: 0,
      unpaid_invoices: 0,
      existing_account_id: null,
      existing_next_fy: null,
    })).toThrow('فقط الناظر يملك صلاحية إقفال السنة المالية');
    expect(closeResult.success).toBe(true);

    expect(() => simulateReopenFiscalYear({
      fiscal_year_id: 'fy-cycle-2',
      reason: 'تصحيح',
      caller_role: 'accountant',
      fy_status: 'closed',
      fy_label: '1445/1446',
    })).toThrow('غير مصرح بإعادة فتح السنة المالية');
  });
});
