# خطة ربط البيانات الإدارية بالواجهات في الزمن الحقيقي

## الهدف
ضمان أن أي تعديل يقوم به الناظر/المحاسب على العقارات أو العقود أو الدخل أو المصروفات أو المستفيدين ينعكس **فوراً** على:
- صفحات المستفيد (حصتي، الإفصاح، التقارير المالية، عرض العقارات/العقود)
- صفحات الواقف (لوحة التحكم، التقارير)
- توليد التقارير وحساب الحصص

دون المساس بأي مكون آخر (UI/منطق محاسبي/RLS/مصادقة).

---

## الوضع الحالي (تشخيص)

**جداول مفعّلة في Realtime حالياً:**
`income, expenses, accounts, payment_invoices, contracts, distributions, advance_requests, fiscal_years, app_settings, support_tickets, support_ticket_replies`

**جداول غير مفعّلة (الفجوة):**
`properties, beneficiaries, units, tenant_payments, expense_budgets, annual_report_items, annual_report_status, advance_carryforward, invoices, invoice_items`

**هوكات الصفحات بدون اشتراك Realtime:**
- `useMySharePage` — حصة المستفيد
- `useDisclosurePage` — الإفصاح
- `useFinancialReportsPage` — التقارير المالية
- `useAnnualReportPage` + `useReportsData` — التقارير السنوية
- `useAnnualReportViewPage`, `usePropertiesViewPage`, `useContractsViewPage` — عروض المستفيد

---

## الخطوات (3 بنود فقط)

### 1) ترقية النشر في قاعدة البيانات (Migration)
إضافة الجداول الناقصة إلى `supabase_realtime` مع ضبط `REPLICA IDENTITY FULL`. لا تغيير على RLS أو دوال أو مشغّلات. السياسات الحالية (المقيِّدة للسنوات غير المنشورة) تبقى تحكم البث.

### 2) إضافة اشتراكات Realtime لهوكات الصفحات
استخدام الهوك الموحّد `useDashboardRealtime` فقط (نفس النمط المعتمد) — لا منطق جديد، فقط استدعاء واحد في كل هوك:

| الهوك | الجداول المراقبة | المفاتيح الإضافية |
|---|---|---|
| `useMySharePage` | `accounts, distributions, advance_requests, advance_carryforward, beneficiaries, fiscal_years` | `['my-share']` |
| `useDisclosurePage` | `accounts, income, expenses, distributions, fiscal_years` | `['disclosure']` |
| `useFinancialReportsPage` | `income, expenses, accounts, distributions, payment_invoices, fiscal_years` | `['financial-reports']` |
| `useAnnualReportPage` | `annual_report_items, annual_report_status, accounts, fiscal_years` | `['annual-report']` |
| `useReportsData` | `accounts, income, expenses, distributions, fiscal_years` | `['reports-data']` |
| `usePropertiesViewPage` | `properties, units` | — |
| `useContractsViewPage` | `contracts, properties, payment_invoices` | — |
| `useAnnualReportViewPage` | `annual_report_items, annual_report_status` | — |

### 3) توسيع اشتراك لوحة الإدارة
إضافة الجداول التشغيلية المفقودة إلى `useAdminDashboardPage` ليرى الناظر تغييرات الفِرَق الأخرى مباشرة:
- من: `['income','expenses','accounts','payment_invoices','messages']`
- إلى: `['income','expenses','accounts','payment_invoices','messages','properties','contracts','beneficiaries','distributions','advance_requests']`

---

## ما لن يُلمس (ضمانات عدم الإضرار)
- لا تعديل على: `AuthContext`, `ProtectedRoute`, `client.ts`, `types.ts`, `config.toml`, `.env`.
- لا تعديل على RLS، دوال SQL، مشغّلات، أو منطق محاسبي (المحرك المالي الموحّد، حساب الحصص، السنوات المقفلة).
- لا تعديل على مكونات UI — فقط استدعاء هوك واحد داخل page hooks.
- لا تعديل على edge functions أو ZATCA أو سلسلة الفواتير.
- لا تغيير في تواقيع الدوال أو في `createCrudFactory`.

---

## النتيجة المتوقعة
- تعديل عقار/عقد/دخل/مصروف من جلسة الناظر ⇒ يظهر فوراً (≤500ms debounce) في شاشات المستفيد ولوحة الإدارة وعروض العقارات/العقود.
- توليد التقارير يعتمد على نفس الكاش المُبطَل ⇒ بيانات محدّثة تلقائياً عند الفتح.
- صفر تغيير سلوكي للسنوات المقفلة/غير المنشورة (محجوبة بالـRLS الحالية).

## الملفات المتأثرة
- `supabase/migrations/<timestamp>_realtime_publication_extension.sql` (جديد)
- `src/hooks/page/admin/dashboard/useAdminDashboardPage.ts`
- `src/hooks/page/beneficiary/financial/useMySharePage.ts`
- `src/hooks/page/beneficiary/financial/useDisclosurePage.ts`
- `src/hooks/page/beneficiary/financial/useFinancialReportsPage.ts`
- `src/hooks/page/admin/reports/useAnnualReportPage.ts`
- `src/hooks/page/admin/reports/useReportsData.ts`
- `src/hooks/page/beneficiary/views/usePropertiesViewPage.ts`
- `src/hooks/page/beneficiary/views/useContractsViewPage.ts`
- `src/hooks/page/beneficiary/views/useAnnualReportViewPage.ts`
