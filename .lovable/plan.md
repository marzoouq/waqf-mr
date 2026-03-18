

# الجولة 16 — إصلاح التصدير (PDF): 6 إصلاحات في 3 ملفات

## الاكتشاف الجذري: `reverseBidi` يعكس ترتيب الكلمات مرتين

### المشكلة المُثبتة بالكود:

1. `arabic-reshaper` v1.1.0 `convertArabic()` يُحوّل الحروف لأشكال متصلة (Presentation Forms-B) **بدون أي عكس** — يحافظ على نفس ترتيب الأحرف
2. jsPDF مع `Identity-H` encoding (سطر 70 في `core.ts`) يُفوّض عرض RTL لعارض الـ PDF (Chrome, Acrobat, إلخ)
3. `reverseBidi` يعكس ترتيب الكلمات → عارض الـ PDF يعكسها مرة ثانية = **ترتيب خاطئ**

### مثال عملي:

```
الاسم الأصلي: "محمد أحمد العلي"
↓ convertArabic → أشكال متصلة بنفس الترتيب
↓ reverseBidi → "العلي أحمد محمد" (عكس أول)
↓ PDF viewer RTL → يعرض من اليمين لليسار → القارئ يقرأ "محمد أحمد العلي"

لكن في autoTable مع halign:'right':
"العلي أحمد محمد" يُعرض في الخلية من اليمين
→ القارئ يقرأ الكلمة اليمنى أولاً = "العلي" ← هذا الاسم الأخير!
```

المشكلة تتفاقم في `autoTable` لأن `halign: 'right'` يُحاذي النص يميناً لكن الكلمات مقلوبة بالفعل.

---

## الإصلاحات المطلوبة — 6 تغييرات في 3 ملفات

### الملف 1: `src/utils/pdf/arabicReshaper.ts`

**الإصلاح الجذري — إزالة `reverseBidi`:**

```typescript
export const reshapeArabic = (text: string): string => {
  if (!text || !hasArabic(text)) return text;
  try {
    // تشكيل الحروف فقط — PDF viewer يتكفل بـ RTL
    return ArabicReshaper.convertArabic(text);
  } catch {
    return text;
  }
};
```

حذف دالة `reverseBidi` بالكامل (سطور 41-50) ومنع استدعائها (سطر 67).

**لماذا هذا آمن:**
- jsPDF + `Identity-H` + Arabic font = PDF viewer يعالج RTL تلقائياً
- GitHub issue #1025 لـ jsPDF-AutoTable يؤكد أن Arabic يعمل بدون عكس يدوي
- `convertArabic` ضروري فقط لتشكيل الحروف (اتصال الأشكال)

### الملف 2: `src/utils/pdf/beneficiary.ts`

**PDF-03** (سطر 43): استبدال الحساب الديناميكي لنسبة الناظر بـ `adminPct` المُخزَّنة:
- إضافة `adminPct?: number; waqifPct?: number; paidAdvances?: number; carryforwardDeducted?: number; fiscalYear?: string;` للـ interface (سطر 11)
- سطر 43: `data.adminPct ?? 10` بدلاً من `Math.round(adminShare / netRevenue * 100)`
- سطر 44: `data.waqifPct ?? 5` بدلاً من الحساب الديناميكي

**PDF-04** (بعد سطر 48): إضافة بنود السُلف والمرحّل والصافي:
```
['(-) السُلف المصروفة', paidAdvances]  // يظهر فقط إذا > 0
['(-) فروق مرحّلة', carryforwardDeducted]  // يظهر فقط إذا > 0
['صافي المبلغ المستحق', net]  // يظهر دائماً
```

**IMP-03** (سطر 78): إضافة السنة المالية لاسم الملف:
```
doc.save(`my-share-${data.beneficiaryName}-${data.fiscalYear || 'all'}.pdf`);
```

### الملف 3: `src/pages/beneficiary/MySharePage.tsx`

**PDF-04 (caller)** (سطور 123-139): تمرير البيانات الجديدة لـ `generateMySharePDF`:
```tsx
paidAdvances: paidAdvancesTotal,
carryforwardDeducted: actualCarryforward,  // باستخدام منطق F7
adminPct: /* from account or settings */,
waqifPct: /* from account or settings */,
fiscalYear: selectedFY?.label,
```

**PDF-05** (سطور 160-172): إصلاح `handleDownloadDistributionsPDF`:
- تمرير `availableAmount: myShare` (حصة الفرد) بدلاً من `beneficiariesShare` (الكل)
- تصحيح الـ footer: النسبة الفعلية بدلاً من "100%"

---

## بنود مدحوضة من التقرير الأصلي

| # | الادعاء | الحقيقة |
|---|---------|---------|
| PDF-01/02 | reshapeRow تعكس ترتيب الأعمدة | `reshapeRow` تستخدم `.map()` — لا تعكس الأعمدة |
| PDF-06 | قسم 1 و6 مكرران | القسم 1 = ملخص سريع (3 بنود)، القسم 6 = تفصيلي (4+ بنود). مقبول كـ Executive Summary |
| PDF-07 | ترتيب أقسام خاطئ | Executive Summary أولاً = نمط شائع |
| SECT-01 | بطاقة الموبايل مفقود منها الحالة | `getStatusBadge(dist.status)` موجود سطر 516 |
| SECT-03 | myAdvances لا تُعرض | قسمان كاملان سطور 559-697 |

## ملخص التأثير

- **3 ملفات** تُعدَّل
- الإصلاح الجذري (إزالة `reverseBidi`) يُصلح **جميع** مشاكل ترتيب الأسماء والنصوص العربية متعددة الكلمات في كل ملفات الـ PDF
- 5 إصلاحات إضافية لبيانات مفقودة/مضللة في `generateMySharePDF` و`generateDistributionsPDF`

