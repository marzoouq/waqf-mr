

# خطة تطبيق Arabic Reshaping على جميع ملفات PDF

## نتائج الفحص

**الملفات التي تستخدم reshaping بالفعل (2):**
- `core.ts` — `addHeader`, `addHeaderToAllPages`, `addFooter` ✓
- `paymentInvoice.ts` — جميع نقاط `doc.text` و autoTable ✓

**الملفات التي تحتاج إصلاح (10):**

| الملف | عدد نقاط `doc.text` العربية | عدد جداول autoTable بعناوين عربية |
|---|---|---|
| `expenses.ts` | 2 (عناوين) | 2 (head + body + foot) |
| `entities.ts` | 3 (عناوين) | 4 (عقارات، عقود، مستفيدين، وحدات) |
| `accounts.ts` | ~5 (عناوين + ملخصات) | 3+ (ملخص، توزيعات، تحصيل) |
| `beneficiary.ts` | ~8 (حصتي + ملخصات) | 2+ |
| `comparison.ts` | ~4 (عناوين أقسام) | 4 (مقارنة، شهري، مصروفات×2) |
| `reports.ts` | ~6 (عناوين) | 4+ |
| `invoices.ts` | 2 (عناوين) | 2 |
| `auditLog.ts` | ~3 (عناوين + إحصاءات) | 1 |
| `forensicAudit.ts` | ~8 (عناوين + ملخصات) | 2 |
| `bylaws.ts` | ~10 (عنوان، أجزاء، محتوى) | 1 (فهرس) |
| `annualReport.ts` | ~12 (عنوان، بطاقات، أقسام) | 0 |
| `comprehensiveBeneficiary.ts` | ~8 | 3+ |

## خطة التنفيذ

### النهج: استيراد `reshapeArabic as rs` و `reshapeRow` من `./core` في كل ملف

لكل ملف من الـ 10:
1. إضافة `reshapeArabic as rs, reshapeRow` للاستيراد من `./core`
2. لف كل نص عربي في `doc.text()` بـ `rs(...)` — مثال: `doc.text(rs('تقرير الدخل'), ...)`
3. لف عناوين الجداول `head: [[...]]` بـ `reshapeRow([...])`
4. لف صفوف `body` التي تحتوي نصوصاً عربية بـ `reshapeRow`
5. لف صفوف `foot` بـ `reshapeRow`

### ملاحظة مهمة
- الأرقام والنصوص الإنجليزية تمر بدون تعديل (الدالة تفحص تلقائياً)
- `splitTextToSize` في `bylaws.ts` و `annualReport.ts` يحتاج معالجة خاصة: يجب تطبيق `rs()` على كل سطر ناتج
- لا تغيير في `core.ts` أو `paymentInvoice.ts` (مُصلحة سابقاً)

