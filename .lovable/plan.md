

# خطة إصلاح الجولة الرابعة — بعد التحقق العميق

## نتائج التحقق

### مشاكل غير حقيقية (التقرير مخطئ):

| المشكلة المُبلَّغة | الحقيقة |
|---|---|
| #2 — `client_error` مرفوض من DB | **خاطئ** — المهاجرة الأخيرة `20260226` أزالت كل القيود على `event_type`. الدالة الحالية تقبل أي نوع بما فيه `client_error` |
| #3 — `console.error` في BeneficiaryDashboard | **مُصلح فعلاً** — السطر 98 يستخدم `logger.error` |
| #6 — `senderId` غير محمي | **خاطئ** — سياسة RLS لجدول `messages` تتحقق صراحةً: `auth.uid() = sender_id`. أي محاولة لإرسال رسالة بـ sender_id مختلف **تُرفض من قاعدة البيانات** |
| #8 — `eslint-disable` في InvoiceViewer | سلوك متعمد ومعتاد — حذف `blobUrl` من deps يمنع infinite loop. الحل الحالي صحيح مع cleanup في return |
| #15 — Messages 500 سجل | `.limit(500)` هو النمط المعتمد في المشروع (مذكور في memory: TypeScript constraints). الرسائل لكل محادثة نادراً ما تتجاوز 100 |
| #1 و #7 و #8 — `.env`, lockfiles | مُدارة من Lovable Cloud |

### مشاكل حقيقية تحتاج إصلاح (4 إصلاحات):

---

## 1. DataExportTab — استبعاد الحقول المشفرة من تصدير المستفيدين
**ملف:** `src/components/settings/DataExportTab.tsx`

المشكلة: `select('*')` على جدول `beneficiaries` يُصدّر `national_id` و `bank_account` المشفرة كـ base64 في CSV.

**الإصلاح:** عند تصدير المستفيدين، استخدام `select` محدد يستبعد الحقلين المشفرين + إضافة error handling في `handleExportAll`:

```typescript
// بدلاً من select('*') للمستفيدين:
if (tableKey === 'beneficiaries') {
  query = supabase.from('beneficiaries')
    .select('id, name, email, phone, share_percentage, notes, created_at, updated_at')
    .limit(5000);
}
```

وفي `handleExportAll`: إضافة متغير لتتبع الأخطاء وإشعار المستخدم:
```typescript
let failedTables: string[] = [];
// ...
if (error) { failedTables.push(table.label); continue; }
// بعد الحلقة:
if (failedTables.length > 0) {
  toast.warning(`تعذر تصدير: ${failedTables.join('، ')}`);
}
```

---

## 2. GlobalSearch — تقييد نتائج العقود للمستفيدين
**ملف:** `src/components/GlobalSearch.tsx`

المشكلة: المستفيدون يرون `tenant_name` في نتائج بحث العقود.

**الإصلاح:** عند عرض العقود للمستفيد، إخفاء اسم المستأجر:
```typescript
subtitle: isAdmin ? c.tenant_name : `حالة: ${c.status}`,
```

---

## 3. GlobalSearch — إضافة AbortController لمنع race condition
**ملف:** `src/components/GlobalSearch.tsx`

**الإصلاح:** إضافة `AbortController` ref واستخدامه في دالة البحث.

---

## 4. WaqfInfoBar — إضافة cache-bust عند رفع الشعار
**ملف:** `src/components/WaqfInfoBar.tsx` سطر 99

**الإصلاح:**
```typescript
logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
```

---

## ملخص التغييرات

| الملف | التغيير |
|---|---|
| `DataExportTab.tsx` | استبعاد PII من تصدير المستفيدين + error handling في ExportAll |
| `GlobalSearch.tsx` | إخفاء tenant_name للمستفيدين + AbortController |
| `WaqfInfoBar.tsx` سطر 99 | إضافة cache-bust |

4 تغييرات في 3 ملفات. لا تغييرات في قاعدة البيانات.

