

# تحقق من خطة RPC الموحد — تنفيذ سيناريوهات

---

## السيناريو 1: هل الـ RPC يغطي كل البيانات المطلوبة؟

**التحقق المباشر من `BeneficiaryDashboard.tsx`:**

| البيانات المستخدمة | المصدر الحالي | هل RPC يغطيها؟ |
|---|---|---|
| `currentBeneficiary` (name, id, share_percentage, user_id) | `useBeneficiariesSafe()` + `useMyShare()` | ✅ `SELECT * FROM beneficiaries WHERE user_id = auth.uid()` |
| `totalBenPct` | `useTotalBeneficiaryPercentage()` RPC | ✅ `SELECT SUM(share_percentage) FROM beneficiaries` |
| `availableAmount` | `useFinancialSummary()` → `useComputedFinancials()` | ⚠️ **يحتاج تبسيط** |
| `myShare` | `useMyShare()` = `availableAmount × pct / totalPct` | ✅ حساب بسيط |
| `distributions` (آخر 3) | inline `useQuery` | ✅ |
| `advanceRequests.filter(pending).length` | `useAdvanceRequests()` | ✅ `COUNT(*)` كافٍ |
| `advanceSettings` | `useAppSettings()` → `getJsonSetting` | ✅ `SELECT value FROM app_settings WHERE key = 'advance_settings'` |
| `fiscalYear` (label, status, dates) | `useFiscalYear()` context | ❌ **يبقى منفصلاً** — سياق مشترك |
| `notifications` | `useNotifications()` | ❌ **يبقى منفصلاً** — realtime |

### ⚠️ نقطة حرجة: حساب `availableAmount`

الخطة تقول RPC يُرجع `availableAmount`. لكن `useComputedFinancials` يحسبها بمنطق معقد (60+ سطر). **المفاجأة**: الداشبورد لا يعرض `availableAmount` مباشرة — يعرض `myShare` فقط، وفقط عند `isClosed`.

**عند السنة المقفلة** (سطر 126 من useComputedFinancials):
```text
availableAmount = accounts.waqf_revenue - accounts.waqf_corpus_manual
myShare = availableAmount × share_percentage / totalBenPct
```

**عند السنة النشطة**: يعرض "تُحسب عند الإقفال" (سطر 262) — لا حاجة لحساب.

**القرار**: RPC يحسب `availableAmount` بالمعادلة البسيطة أعلاه عند `status='closed'`، ويُرجع `0` عند `active`. ✅ **لا حاجة لنقل كل منطق useComputedFinancials**

---

## السيناريو 2: هل حذف الهوكات يكسر صفحات أخرى؟

| الهوك | مستخدم في صفحات أخرى؟ | القرار |
|---|---|---|
| `useBeneficiariesSafe` | ✅ useRawFinancialData, MySharePage, DisclosurePage | **لا يُحذف** — يبقى كما هو |
| `useFinancialSummary` | ✅ AccountsPage, DisclosurePage, FinancialReports | **لا يُحذف** |
| `useMyShare` | ✅ MySharePage | **لا يُحذف** |
| `useAdvanceRequests` | ✅ admin AdvanceRequests page | **لا يُحذف** |
| `useTotalBeneficiaryPercentage` | ✅ useMyShare (used elsewhere) | **لا يُحذف** |

**الحكم**: ✅ الخطة صحيحة — الهوكات تبقى كاملة، فقط الداشبورد يستبدلها بالـ RPC.

---

## السيناريو 3: أمان الـ RPC

**سيناريو هجوم**: مستفيد يستدعي `get_beneficiary_dashboard` بـ `p_fiscal_year_id` لسنة غير منشورة.

**الحماية المطلوبة في RPC**:
```sql
-- يجب التحقق من أن السنة منشورة للمستفيد
SELECT * FROM fiscal_years 
WHERE id = p_fiscal_year_id 
  AND (published = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'))
```
✅ الخطة تذكر هذا صراحةً.

**سيناريو هجوم 2**: مستفيد يحاول رؤية بيانات مستفيد آخر.
```sql
-- RPC يستخدم auth.uid() داخلياً — لا يقبل user_id كمدخل
SELECT * FROM beneficiaries WHERE user_id = auth.uid()
```
✅ محصّن.

---

## السيناريو 4: Realtime invalidation

**الوضع الحالي**: `useBfcacheSafeChannel` يراقب `distributions` ويُبطل `['my-distributions-recent']`.

**بعد التغيير**: يحتاج لإبطال `['beneficiary-dashboard']` بدلاً منه.

**هل يؤثر؟** لا — نفس المنطق، فقط queryKey مختلف. ✅

---

## السيناريو 5: `AdvanceRequestDialog` props

السطر 343-351:
```typescript
<AdvanceRequestDialog
  beneficiaryId={currentBeneficiary.id!}
  fiscalYearId={fiscalYearId}
  estimatedShare={myShare}
  paidAdvances={0}          // ← مُثبّت حالياً على 0
  isFiscalYearActive={!isClosed}
  minAmount={advanceSettings?.min_amount ?? 500}
  maxPercentage={advanceSettings?.max_percentage ?? 50}
/>
```

كل هذه القيم متوفرة من RPC (`beneficiary.id`, `myShare` محسوب, `advanceSettings`). ✅

**ملاحظة**: `paidAdvances={0}` مُثبّت — هذا خطأ موجود مسبقاً (لا