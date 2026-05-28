
# تقرير التدقيق وخطة الإصلاح

## نتائج التدقيق (تلقائي عبر وكيلين متوازيين)

**لوحة الناظر**: 128 عنصر تفاعلي · ✅ 101 يعمل · 🚧 1 جزئي · ❌ 0 مفقود · 🧭 26 تنقل/فلتر  
**واجهة المستفيد**: 45 عنصر · ✅ 28 يعمل · 🚧 4 جزئي · ❌ 5 مفقود · 🧭 5 تنقل

النظام في حالة جيدة عموماً — المشاكل محصورة في **15 خلل حرج/متوسط** سنصلحها.

---

## أولاً: مشاكل واجهة المستفيد (Beneficiary)

| # | الصفحة | المشكلة | الإصلاح |
|---|--------|---------|---------|
| B1 | `MySharePage` / `AdvanceRequestDialog` | زر "طلب سلفة" معطّل عكسياً: `isFiscalYearActive={selectedFY?.status !== 'closed'}` → السلف متاحة فقط على السنوات المغلقة | عكس المنطق: `isFiscalYearActive={selectedFY?.status === 'active'}` وتفعيل الزر للسنة النشطة فقط |
| B2 | `AdvanceRequestDialog` | `beneficiaryName` لا يُمرَّر لـ `mutateAsync` → إشعار الناظر يظهر "غير معروف" | تمرير `beneficiaryName` من `useMySharePage` للحوار ثم للـ mutation |
| B3 | `SupportPage` | `isError`/`error`/`refetch` تُرجَع من الـ hook لكنها غير مستخدمة → فشل الجلب يظهر قائمة فارغة بلا رسالة | عرض رسالة خطأ + زر "إعادة المحاولة" |
| B4 | `BeneficiarySettingsPage` | لا يوجد حقل لرقم الحساب البنكي ولا تعديل ذاتي للهاتف | إضافة تبويب "البيانات البنكية" مع حقل `bank_account` (تشفير AES عبر RPC موجود)، وحقل هاتف قابل للتعديل |
| B5 | `BeneficiaryMessagesPage` | `activeTab` معاد من الـ hook لكن JSX يمرّر `'chat'` ثابت → محادثات الدعم غير ظاهرة | استخدام `activeTab/setActiveTab` فعلياً وإضافة تبويب "الدعم" |
| B6 | `MySharePage` (3 أزرار PDF) | تعود بصمت عند السنة النشطة بدون tooltip/toast | إضافة `disabled` + tooltip "متاح بعد إقفال السنة" |
| B7 | `BeneficiaryMessagesPage` "دعم جديد" | يُنشئ `conversations` بدلاً من `support_tickets` → نظامان متوازيان | توحيد: زر يفتح `NewTicketDialog` الموجود في `SupportPage` |
| B8 | `useCreateTicket` | فشل `notify_admins` RPC مبتلَع صامتاً | إضافة `logger.error` ورفع toast للناظر إن لزم |

## ثانياً: مشاكل لوحة الناظر (Admin)

| # | الصفحة | المشكلة | الإصلاح |
|---|--------|---------|---------|
| A1 | `InvoicesPage` "إنشاء من قالب" | `InvoicesPageDialogs` template-submit غير متتبَّع — يجب التحقق من ربطه بـ mutation | فحص `InvoicesPageDialogs` وربطه بـ `createInvoice` إن كان مفقوداً |
| A2 | `AccountsPage` "إنشاء حساب ختامي" | `buildAccountData()` يضع `fiscal_year_id=''` إن كان `selectedFY` null → INSERT تالف | guard: `if (!selectedFY?.id) { toast.error('اختر سنة مالية'); return; }` |
| A3 | `AnnualReportPage` add/edit | فشل صامت عند غياب `fiscalYearId` | إظهار toast "الرجاء اختيار سنة مالية" |
| A4 | `DistributionsPage` "تنفيذ التوزيع" | تمرير `fiscalYearId=undefined` ممكن عند `'all'` | تعطيل الزر ما لم يكن هناك سنة محددة + guard في `useDistribute` |
| A5 | `UserManagementPage` "ربط مستفيد" | `.from('beneficiaries').update()` مباشر يتجاوز `admin-users` edge fn → لا audit | نقله إلى edge function `admin-users` بـ action `link_beneficiary` |
| A6 | `useCloseFiscalYear` | لا يُبطل cache `['fiscal_years']` بعد الإقفال | إضافة `qc.invalidateQueries({queryKey:['fiscal_years']})` |
| A7 | `EmailMonitorPage` Retry DLQ | `isRetrying` مشترك بين queue auth و transactional | حالتان منفصلتان `isRetryingAuth` / `isRetryingTx` |

---

## مخطط التنفيذ

```text
المرحلة 1 — إصلاحات Frontend الخالصة (لا تغييرات DB)
  ├─ B1, B6  — منطق تفعيل/تعطيل زر السلفة + tooltips
  ├─ B2      — تمرير beneficiaryName
  ├─ B3      — عرض خطأ + retry في SupportPage
  ├─ B5      — تفعيل tabs في BeneficiaryMessagesPage
  ├─ B7      — توحيد زر "دعم جديد" على NewTicketDialog
  ├─ B8      — تسجيل فشل notify_admins
  ├─ A2, A3, A4 — guards واضحة + toasts
  ├─ A6      — invalidation بعد إقفال السنة
  ├─ A7      — فصل isRetrying لقائمتي DLQ
  └─ A1      — فحص InvoicesPageDialogs وربط template-submit

المرحلة 2 — إضافات تتطلب Frontend + Backend خفيف
  ├─ B4: تبويب "البيانات البنكية" في BeneficiarySettingsPage
  │      └─ يحتاج RPC: update_beneficiary_self(bank_account, phone)
  │         مع تشفير bank_account عبر pgcrypto الموجود
  └─ A5: نقل link_beneficiary إلى edge function admin-users
          └─ إضافة action جديد + audit log entry

المرحلة 3 — تحقق
  ├─ tsc + tests (vitest)
  └─ فحص يدوي للأزرار المصلحة في preview
```

## التفاصيل التقنية (للمراجعة)

**الملفات المتأثرة (~16 ملف):**
- `src/hooks/page/beneficiary/myshare/useMySharePage.ts`, `AdvanceRequestDialog.tsx` (B1, B2, B6)
- `src/pages/beneficiary/SupportPage.tsx` + `useSupportPage.ts` (B3)
- `src/pages/beneficiary/BeneficiarySettingsPage.tsx` + tab جديد `BankAccountTab.tsx` (B4)
- `src/pages/beneficiary/BeneficiaryMessagesPage.tsx` (B5, B7)
- `src/hooks/data/support/useCreateTicket.ts` (B8)
- `src/hooks/page/admin/accounts/useAccountsActions.ts` (A2, A6)
- `src/hooks/page/admin/annual-report/useAnnualReportPage.ts` (A3)
- `src/pages/dashboard/DistributionsPage.tsx` + `useDistribute.ts` (A4)
- `src/hooks/page/admin/users/useUserManagement.ts` + `supabase/functions/admin-users/index.ts` (A5)
- `src/hooks/page/admin/email/useEmailMonitorActions.ts` (A7)
- `src/components/invoices/InvoicesPageDialogs.tsx` (A1)

**Migrations مطلوبة (المرحلة 2 فقط):**
- RPC `update_beneficiary_self(p_bank_account text, p_phone text)` security definer — يتحقق `auth.uid()` ويشفّر `bank_account`
- لا جداول جديدة، لا تغييرات schema

**معايير المشروع المُلتزَم بها:**
- Page Hook Pattern: كل المنطق في `hooks/page/`
- No toast في `hooks/data/` (التوست في طبقة page فقط)
- `logger` بدل `console`
- `sessionStorage` للـ fiscal_year_id
- RLS تبقى كما هي (لا توسعة صلاحيات)

## ما لن يُنفَّذ

- العناصر المصنّفة NAV_ONLY (26 في الناظر، 5 في المستفيد) — تعمل كما هو متوقع (تنقل/فلترة client-side)
- تبويب الـ Theme المحفوظ في localStorage (مقصود — تفضيل جهاز)
- المكونات القراءة-فقط (`DisclosurePage`, `AdminDashboard` widgets, إلخ)

---

**التقدير**: ~15 إصلاح موزّعة على ~16 ملف + migration واحد. كل الأخطاء قابلة للإصلاح دون كسر أي ميزة موجودة.
