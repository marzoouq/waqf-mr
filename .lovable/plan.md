

# خطة تنظيف ما بعد الفحص الجنائي — 3 بنود

## التحقق المؤكّد

- **M1**: `html2canvas` موجود في `vite.config.ts` سطور 53, 63, 170 ✅
- **M2**: 10 ملفات اختبار تحتوي على `vi.mock` لـ `useFinancialSummary` المحذوف ✅
- **M3**: 4 نتائج أمنية من `supabase_lov` غير موثّقة (لم تُعلّم كـ ignored) ✅

---

## التغييرات

### 1. تنظيف `html2canvas` من `vite.config.ts`

| السطر | التغيير |
|-------|---------|
| 53 | حذف `'**/vendor-html2canvas*.js'` من `globIgnores` |
| 63 | حذف `html2canvas\|` من regex الـ `urlPattern` |
| 170 | حذف سطر `if (id.includes('node_modules/html2canvas')...)` بالكامل |

### 2. تنظيف mocks `useFinancialSummary` من 10 ملفات اختبار

حذف `vi.mock('@/hooks/financial/useFinancialSummary', ...)` والمتغيرات المرتبطة من:
- `AdminDashboard.test.tsx`
- `PropertiesPage.test.tsx`
- `WaqifDashboard.test.tsx`
- `MySharePage.test.tsx`
- `DisclosurePage.test.tsx`
- `YearOverYearComparison.test.tsx`
- `AccountsViewPage.test.tsx`
- `ReportsPage.test.tsx`
- `FinancialReportsPage.test.tsx`
- `BeneficiaryDashboard.test.tsx`

### 3. توثيق النتائج الأمنية الأربع كمخاطر مقبولة

استخدام `security--manage_security_finding` لتحديث 4 نتائج `supabase_lov`:

| النتيجة | الإجراء | السبب |
|---------|---------|-------|
| `user_roles_self_read_escalation` | ignore | لا يوجد مسار INSERT لغير الأدمن — سياسة RESTRICTIVE مؤكدة |
| `contracts_tenant_pii_exposure` | ignore | مقصود — المحاسب يحتاج بيانات المستأجرين لإصدار الفواتير |
| `zatca_certificates_private_key_exposure` | ignore | المفتاح مشفّر عبر trigger + SELECT محجوب بـ `USING(false)` + الإدارة عبر Edge Functions فقط |
| `realtime_messages_no_rls` | ignore | لا Broadcast/Presence — فقط postgres_changes المحمي بـ RLS على كل جدول |

---

## ترتيب التنفيذ
1. تنظيف `vite.config.ts`
2. تنظيف 10 ملفات اختبار (بالتوازي)
3. توثيق النتائج الأمنية
4. فحص TypeScript build

