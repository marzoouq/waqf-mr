/**
 * اختبارات طبقة حماية إشعارات العقود الإدارية للمستفيد
 */
import { describe, it, expect } from 'vitest';
import {
  isAdminContractNotification,
  shouldHideForBeneficiary,
} from './beneficiaryNotificationVisibility';

const expiringSoon = { title: 'عقد قارب على الانتهاء', message: 'العقد رقم 1 قارب على الانتهاء' };
const expired = { title: 'عقود منتهية', message: 'لديك 3 عقود منتهية بحاجة للمتابعة' };
const messageOnly = { title: 'تنبيه', message: 'العقد رقم 5 قارب على الانتهاء' };
const unrelated = { title: 'فاتورة جديدة', message: 'تم إصدار فاتورة جديدة' };

describe('isAdminContractNotification', () => {
  it('يلتقط إشعار اقتراب الانتهاء من العنوان', () => {
    expect(isAdminContractNotification(expiringSoon)).toBe(true);
  });

  it('يلتقط إشعار اقتراب الانتهاء من الرسالة فقط', () => {
    expect(isAdminContractNotification(messageOnly)).toBe(true);
  });

  it('يلتقط إشعار العقود المنتهية', () => {
    expect(isAdminContractNotification(expired)).toBe(true);
  });

  it('لا يلتقط الإشعارات غير الإدارية', () => {
    expect(isAdminContractNotification(unrelated)).toBe(false);
  });

  it('يتعامل مع الحقول الفارغة بأمان', () => {
    expect(isAdminContractNotification({ title: '', message: '' })).toBe(false);
  });
});

describe('shouldHideForBeneficiary', () => {
  // مصفوفة الحالات: 4 تركيبات إعدادات × 3 أنواع إشعارات
  const scenarios = [
    {
      name: 'كلا الإعدادين معطّل',
      settings: { notify_beneficiary_contract_expiry: false, notify_beneficiary_expired_contracts: false },
      expectations: { expiring: true, expired: true, unrelated: false },
    },
    {
      name: 'expiry معطّل، expired مفعّل',
      settings: { notify_beneficiary_contract_expiry: false, notify_beneficiary_expired_contracts: true },
      expectations: { expiring: true, expired: false, unrelated: false },
    },
    {
      name: 'expiry مفعّل، expired معطّل',
      settings: { notify_beneficiary_contract_expiry: true, notify_beneficiary_expired_contracts: false },
      expectations: { expiring: false, expired: true, unrelated: false },
    },
    {
      name: 'كلا الإعدادين مفعّل',
      settings: { notify_beneficiary_contract_expiry: true, notify_beneficiary_expired_contracts: true },
      expectations: { expiring: false, expired: false, unrelated: false },
    },
  ];

  scenarios.forEach(({ name, settings, expectations }) => {
    describe(name, () => {
      it(`اقتراب الانتهاء → ${expectations.expiring ? 'إخفاء' : 'إظهار'}`, () => {
        expect(shouldHideForBeneficiary(expiringSoon, settings)).toBe(expectations.expiring);
      });
      it(`عقود منتهية → ${expectations.expired ? 'إخفاء' : 'إظهار'}`, () => {
        expect(shouldHideForBeneficiary(expired, settings)).toBe(expectations.expired);
      });
      it('إشعار غير ذي صلة → دائماً إظهار', () => {
        expect(shouldHideForBeneficiary(unrelated, settings)).toBe(expectations.unrelated);
      });
    });
  });
});
