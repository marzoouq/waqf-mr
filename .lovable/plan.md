

# خطة تنفيذ المهام المتبقية — 4 دورات (23 مهمة فعلية)

## مهام مُكتشف أنها مُنفَّذة بالفعل (إزالة من الخطة)

- **#16** — `check_rate_limit` race condition: مُصلح في migration `20260314030137` — يستخدم `ON CONFLICT DO UPDATE SET count = rate_limits.count + 1` ويُعيد قراءة العداد بعد الإدراج
- **#38** — deficit في UI: مُنفَّذ في `DistributeDialog.tsx`

---

## الدورة 1 — إصلاحات كود فورية (8 ملفات، خطر صفري)

### 1. `useDistributionHistory.ts` (#27 + #76)
- تغيير `accounts!inner(fiscal_year)` → `accounts(fiscal_year)` (left join)
- تعريف interface `DistributionJoinRow` بدل `Record<string, unknown>` مع fallback `'-'` عند عدم وجود حساب

### 2. `useBeneficiaryDashboardData.ts` (#36)
- تحسين رسالة الخطأ: `` `استجابة غير متوقعة: ${typeof data}` ``

### 3. `useAccounts.ts` (#44)
- تغيير `retry: 2` → smart retry يتجاهل أخطاء 401/unauthorized (متوافق مع نمط المشروع الموثّق في الذاكرة)

### 4. `useYearComparisonData.ts` (#46 + #31 + #47)
- إضافة `!isFyAll(year1Id) && !isFyAll(year2Id)` في `enabled`
- تبسيط `useMemo` dependencies → الاعتماد على `data` كاملاً
- إضافة comment `// تحويل 1-12 → 0-11 للتوافق مع JS Date.getMonth()` على سطر 47

### 5. `useContractAllocations.ts` (#50 + #55 + #83)
- حذف `fromAllocations` helper → `supabase.from('contract_fiscal_allocations')` مباشرة
- إزالة `JSON.parse(JSON.stringify(rows))` → تمرير `rows` مباشرة (سطر 53)
- إضافة `enabled: !!fiscalYearId || fiscalYearId === null` لمنع الجلب قبل تحديد السنة

### 6. `useMultiYearSummary.ts` (#45)
- إضافة comment سطر 70: `// المبلغ المتاح للتوزيع = ريع الوقف − رقبة الوقف المُخصصة يدوياً`

### 7. `useHistoricalComparison.ts` (#52)
- استخراج `isError` و `error` من `useMultiYearSummary` وإعادتهما في النتيجة

### 8. `useContractAllocations.ts` (#28)
- إضافة `logger.warn` عند وصول النتائج لحد 500 سجل

---

## الدورة 2 — تحسينات وتوثيق (4 ملفات)

### 9. `useAdvanceRequests.ts` (#33 + #39)
- تمرير `beneficiaryName` كـ parameter اختياري في `useCreateAdvanceRequest` بدل جلبه من `beneficiaries_safe`
- تحديد أعمدة صريحة في `.select()` سطر 33 بدل `*`

### 10-12. `distributionCalcPure.ts` + `useDistributionCalculation.ts` + `useDistribute.ts` (#49)
- **لن يُنفَّذ**: `beneficiary_user_id` مطلوب في `useDistribute.ts` لإرسال الإشعارات، والكود الحالي يمرره من `calculateDistributions` → `useDistributionCalculation` → `useDistribute`. إزالته يكسر سلسلة الإشعارات. **القرار: إبقاء كما هو** — التصميم الحالي صحيح ومُختبر.

**المتبقي في الدورة 2: مهمتان فقط (#33 + #39)**

---

## الدورة 3 — DB Migration (migration واحد)

### 13. تحسين `ticket_number` (#63)
```sql
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1;
ALTER TABLE support_tickets 
  ALTER COLUMN ticket_number SET DEFAULT 
    'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('ticket_number_seq')::text, 6, '0');
```

### 14-16. Validation triggers لـ `support_tickets` (#64-66)
- استخدام validation trigger (وفقاً لقواعد المشروع — لا CHECK constraints للتحقق الزمني):
```sql
CREATE FUNCTION validate_support_ticket() RETURNS trigger ...
-- يتحقق من: status IN ('open','in_progress','resolved','closed','cancelled')
-- priority IN ('low','medium','high','critical')
-- category IN ('general','technical','financial','billing')
```

### 17. حد طول `content` في replies (#67)
```sql
CREATE FUNCTION validate_reply_content() RETURNS trigger ...
-- length(content) <= 10000
```

### 18. إصلاح `generate_contract_invoices` (#3)
- إضافة متغير `v_prev_due_date` وتخطي التكرار عند تطابق التواريخ:
```sql
IF v_due_date = v_prev_due_date THEN CONTINUE; END IF;
v_prev_due_date := v_due_date;
```

---

## الدورة 4 — اختبارات (ملفات جديدة)

### 19. استخراج واختبار `toMonthMap` و `toExpenseRecord` (#85)
- ملف جديد: `src/hooks/data/financial/yearComparisonHelpers.ts` — نقل الدوال المساعدة
- ملف اختبار: `src/hooks/data/financial/yearComparisonHelpers.test.ts`
- تحديث imports في `useYearComparisonData.ts`

### 20. استخراج واختبار `mapEntry` (#86)
- ملف جديد: `src/hooks/data/financial/multiYearHelpers.ts`
- ملف اختبار: `src/hooks/data/financial/multiYearHelpers.test.ts`
- تحديث imports في `useMultiYearSummary.ts`

---

## ملخص نهائي

| الدورة | الملفات | المهام | الخطورة |
|--------|---------|--------|---------|
| 1 | 8 ملفات | 8 | صفر — تغييرات داخلية |
| 2 | 1 ملف | 2 | منخفض — تغيير API |
| 3 | 1 migration | 6 | منخفض — triggers دفاعية |
| 4 | 4 ملفات جديدة + 2 تحديث | 2 | صفر — اختبارات |

**إجمالي: 18 مهمة فعلية** (بعد إزالة #16 المُنفَّذ و #49 غير المُستحسن)

## مهام مؤجلة

| # | السبب |
|---|-------|
| #11/#12 | `ai_chat_sessions` غير موجود بعد |
| #49 | التصميم الحالي صحيح — `beneficiary_user_id` مطلوب لسلسلة الإشعارات |
| #92 | تغيير معماري كبير (Zod validation) |

