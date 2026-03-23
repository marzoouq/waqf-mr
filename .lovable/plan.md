

# فحص جنائي هجين — صفحة العقود

---

## 1. الحالة العامة

| الفحص | النتيجة |
|-------|---------|
| أخطاء TypeScript / imports | ✅ لا توجد |
| بنية الصفحة | ✅ ممتازة — المنطق في `useContractsPage` hook + الصفحة عرض فقط (242 سطر) |
| 4 تبويبات | ✅ عقود + استحقاقات + فواتير + تحصيل |
| Pagination | ✅ |
| فلاتر | ✅ حالة + عقار + نوع دفع + بحث نص |
| Mobile responsive | ✅ `NativeSelect` للجوال + `TabsList` للديسكتوب |
| RLS / أمان | ✅ `useContractsByFiscalYear` يحدد الأعمدة |
| `select('*')` | ✅ لا يوجد |
| Stale closure | ✅ `stats` يتضمن `isSpecificYear` + `contractAllocations` في deps |

---

## 2. تناقضات وأخطاء مكتشفة

### 2.1 خطأ حرج — التجديد الجماعي لا ينقل بيانات المستأجر (PII)

| العملية | بيانات المستأجر المنقولة |
|---------|------------------------|
| **تجديد فردي** (`handleRenew` سطر 60-74) | ❌ لا ينقل: `tenant_id_type`, `tenant_id_number`, `tenant_tax_number`, `tenant_crn`, عنوان المستأجر — يستخدم القيم الافتراضية الفارغة |
| **تجديد جماعي** (`handleBulkRenew` سطر 184-224) | ❌ لا ينقل أي بيانات مستأجر — الكائن `newContract` لا يحتوي على حقول PII إطلاقاً |

**الأثر:** عند تجديد عقد (فردي أو جماعي)، العقد الجديد يفقد:
- رقم هوية المستأجر ونوعها
- الرقم الضريبي
- السجل التجاري
- العنوان الكامل

هذا يؤثر على فواتير ZATCA التي تحتاج هذه البيانات.

### 2.2 تناقض — التجديد الفردي يفتح النموذج بدون تواريخ

`handleRenew` (سطر 66) يضبط `start_date: '', end_date: ''` — المستخدم يملأها يدوياً. لكن `handleBulkRenew` (سطر 194-197) يحسب التواريخ تلقائياً. هذا تناقض سلوكي — **الفردي لا يقترح تواريخ رغم أن المنطق موجود في الجماعي**.

### 2.3 ملاحظة — `statusCounts` يعتمد على أحدث عقد فقط

`statusCounts` (سطر 257-266) يحسب الحالة من `group[0].status` — أي أحدث إصدار. هذا **سلوك مقصود** (آخر إصدار يمثل الحالة الحالية) لكنه يعني أن عقداً قديماً منتهياً داخل مجموعة نشطة لا يُعد "منتهياً" في الفلتر. **مقبول معمارياً**.

### 2.4 ملاحظة — `allExpanded` قد يكون `true` بشكل خاطئ

سطر 295: `allExpanded = expandedGroups.size >= filteredGroups.length` — إذا وسّعت 5 مجموعات ثم فلترت لتبقى 3، يُعتبر الكل موسّعاً رغم أن المجموعات المُفلترة قد لا تكون في `expandedGroups`. **تأثير بسيط — زر "طي الكل" يظهر بدل "توسيع الكل"**.

---

## 3. خطة الإصلاح

### الإصلاح 1 — نقل بيانات المستأجر عند التجديد الجماعي (أولوية عالية)

**الملف:** `src/hooks/page/useContractsPage.ts` — `handleBulkRenew` (سطر 203-210)

إضافة حقول PII من العقد الأصلي إلى `newContract`:
```
tenant_id_type, tenant_id_number, tenant_tax_number, tenant_crn,
tenant_street, tenant_building, tenant_district, tenant_city, tenant_postal_code
```

### الإصلاح 2 — نقل بيانات المستأجر عند التجديد الفردي (أولوية عالية)

**الملف:** `src/hooks/page/useContractsPage.ts` — `handleRenew` (سطر 64-71)

تغيير القيم الفارغة إلى قيم العقد الأصلي:
```
tenant_id_type: contract.tenant_id_type || 'NAT',
tenant_id_number: contract.tenant_id_number || '',
...
```

### الإصلاح 3 — اقتراح تواريخ تلقائية عند التجديد الفردي (أولوية متوسطة)

**الملف:** `src/hooks/page/useContractsPage.ts` — `handleRenew` (سطر 66)

حساب `start_date` و `end_date` بنفس منطق `handleBulkRenew`:
```
const oldStart = new Date(contract.start_date);
const oldEnd = new Date(contract.end_date);
const durationMs = oldEnd.getTime() - oldStart.getTime();
const newStart = new Date(oldEnd);
const newEnd = new Date(newStart.getTime() + durationMs);
start_date: newStart.toISOString().split('T')[0],
end_date: newEnd.toISOString().split('T')[0],
```

### الإصلاح 4 — تصحيح `allExpanded` (أولوية منخفضة)

**الملف:** `src/hooks/page/useContractsPage.ts` — سطر 295

تغيير من:
```
expandedGroups.size >= filteredGroups.length
```
إلى:
```
filteredGroups.length > 0 && filteredGroups.every(([base]) => expandedGroups.has(base))
```

---

## 4. ملخص

| # | المشكلة | الخطورة | النوع |
|---|---------|---------|-------|
| 1 | التجديد الجماعي يفقد PII المستأجر | **عالية** | خطأ بيانات |
| 2 | التجديد الفردي يفقد PII المستأجر | **عالية** | خطأ بيانات |
| 3 | التجديد الفردي لا يقترح تواريخ | **متوسطة** | تناقض سلوكي |
| 4 | `allExpanded` قد يكون غير دقيق بعد الفلترة | **منخفضة** | خطأ عرض |

**جميع الإصلاحات في ملف واحد:** `src/hooks/page/useContractsPage.ts`

