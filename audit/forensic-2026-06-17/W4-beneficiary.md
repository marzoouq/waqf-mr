# W4 — Beneficiary/Waqif (الفحص الجنائي الثاني — 2026-06-17)

10 findings. الأبرز:

**🔴 HIGH (4) — تسرّب PII فعلي:**
- F-01: `tenant_name` يظهر بالنص الصريح للمستفيد في 3 مكونات عقود (`ContractsViewDesktopTable/MobileCards/GridCards`)
- F-02: PDF تصدير العقود يحوي `tenant_name` (`useContractsViewPage.ts:74`)
- F-03: PDF حسابات المستفيد يحوي `tenant_name` (`useAccountsViewPage.ts:55`)
- F-04: PDF "حصتي" يحوي `tenant_name` (`useMySharePdfHandlers.ts:141`)

**🟠 MEDIUM (3):**
- F-05: `useBeneficiariesSafe` يجلب `national_id` و`bank_account` لكل الصفوف؛ `bank_account` يُمرَّر صراحةً لـ Input في Settings
- F-06/F-07: `DisclosurePage`/`MySharePage`/`FinancialReportsPage` لا تتحقق من annual_report `published` — تكشف ماليات قبل نشر التقرير

**🟡 LOW (3):**
- F-08: route الواقف بـ `withPermission=false`
- F-09: `is_fiscal_year_accessible` غير مُستدعى من أي مكان في طبقة العميل
- F-10: `DisclosureContractsSection` يعرض `tenant_name`

**✅ نظيف:** لا قراءة `contracts`/`beneficiaries` خام، `Math.max(0)` مطبّق، لا cross-user leak في advances/distributions
