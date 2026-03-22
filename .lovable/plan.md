

# تقرير الفحص الجنائي — تحقق مباشر من السيناريوهات

---

## F-01: أقسام ناقصة في إعدادات الإظهار/الإخفاء — مؤكد 🔴

**التحقق المباشر من الكود:**

`constants.ts` (سطر 124-135) يُعرّف:
- Admin: 15 قسم (يشمل `annual_report`, `support`, `chart_of_accounts`)
- Beneficiary: 12 قسم (يشمل `annual_report`, `support`)

`SettingsPage.tsx` — `SectionsTab` (سطر 332-336) يعرض 12 فقط:

| القسم | في constants.ts | في SectionsTab labels | النتيجة |
|-------|:---:|:---:|---------|
| `annual_report` | ✅ | ❌ | **ناقص** |
| `support` | ✅ | ❌ | **ناقص** |
| `chart_of_accounts` | ✅ | ❌ | **ناقص** |

`SettingsPage.tsx` — `BeneficiaryTab` (سطر 369-373) يعرض 10 فقط:

| القسم | في constants.ts | في BeneficiaryTab labels | النتيجة |
|-------|:---:|:---:|---------|
| `annual_report` | ✅ | ❌ | **ناقص** |
| `support` | ✅ | ❌ | **ناقص** |

**سيناريو التأثير:** الناظر يفتح الإعدادات → تبويب "الأقسام" → لا يرى خيار إخفاء التقرير السنوي أو الدعم الفني أو الشجرة المحاسبية. هذه الأقسام تظهر دائماً بالقيمة الافتراضية `true` بلا تحكم.

**الإصلاح:** إضافة 3 مفاتيح لـ `SectionsTab.labels` + إضافة 2 مفاتيح لـ `BeneficiaryTab.labels` + تحديث `defaultSections` المحلي في كلا المكونين.

---

## F-02: استيراد فارغ في ContractsPage — مؤكد 🟡

**التحقق المباشر:** سطر 5 في `ContractsPage.tsx`:
```
import {} from '@/components/ui/card';
```

لا يستورد شيئاً. كود ميت.

**الإصلاح:** حذف السطر.

---

## خطة التنفيذ

### 1. إصلاح `SectionsTab` في SettingsPage.tsx (سطر 329-336)
- إضافة `annual_report: true, support: true, chart_of_accounts: true` إلى `defaultSections`
- إضافة `annual_report: 'التقرير السنوي', support: 'الدعم الفني', chart_of_accounts: 'الشجرة المحاسبية'` إلى `labels`

### 2. إصلاح `BeneficiaryTab` في SettingsPage.tsx (سطر 366-373)
- إضافة `annual_report: true, support: true` إلى `defaultSections`
- إضافة `annual_report: 'التقرير السنوي', support: 'الدعم الفني'` إلى `labels`

### 3. حذف الاستيراد الفارغ في ContractsPage.tsx (سطر 5)

