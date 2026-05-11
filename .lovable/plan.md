## فحص جنائي: الخطة مقابل التنفيذ الفعلي

تحققت من كل بند بقراءة الكود مباشرة (لا أستطيع تسجيل دخول بحسابك). كل ادعاء له **دليل سطر-بسطر**.

---

### الجزء أ: نتائج الفحص الجنائي للادعاءات

| # | ادعاء الخطة | الحالة | الدليل |
|---|---|---|---|
| 1 | 3 مصادر مختلفة لبطاقات الملخص | ✅ مؤكَّد | `AdminDashboard` → `useDashboardSummary` (`useAdminDashboardData.ts:14`) ، `ReportsPage` → `useReportsData` (`ReportsPage.tsx:35`) ، `AccountsPage` → `useAccountsPage` (`AccountsPage.tsx:7`) — **ثلاثة هوكات مستقلة لنفس الأرقام** |
| 2 | `التقرير السنوي` يحوي بطاقات مالية + IncomeComparisonChart | ✅ مؤكَّد | `AnnualReportPage.tsx:67-75` (summaryCards) + `:84-86` (`IncomeComparisonChart`) → ليس محرّر محتوى فقط، بل **يخلط محتوى تحريري بأرقام مالية** → الاسم مضلِّل فعلاً |
| 3 | تبويبات `التقارير` السبع | ✅ مؤكَّد | `ReportsPage.tsx:88-96`: financial / performance / monthly / cashflow / balance / overdue / zakat |
| 4 | `Sidebar.tsx` بدون مجموعات | ✅ مؤكَّد | `rg "group\|section" src/components/layout/Sidebar.tsx` → **0 نتائج**. القائمة تُرسم بـ`links.map()` مسطّحاً |
| 5 | شارة `[1]` فقط على المراسلات | ✅ مؤكَّد | `Sidebar.tsx:95`: `link.to.includes('/messages') && unreadCount > 0` — مكتوب مباشرة لمسار واحد، الإشعارات والدعم محرومة من نفس النمط |
| 6 | `الدخل` يكتب في جدول `income` يدوياً (يخالف Unified Collection Sync) | ✅ مؤكَّد + خطر فعلي | `useIncome.ts:17` → `table: 'income'` و`useIncomePage.ts:40,84` → `createIncome.mutateAsync` يُنشئ صف دخل **خارج** سلسلة الفواتير ⇒ ازدواج محاسبي محتمل عند المستخدم. تتعارض مع memory `Unified Collection Sync` |
| 7 | 3 مكوّنات منفصلة للتوزيع | ✅ مؤكَّد | `BeneficiaryDistributionTable` (reports) + `AccountsDistributionTable` (إجمالي) + `AccountsBeneficiariesTable` (تفصيل المستفيد) — كلها موجودة فعلياً في `src/components/{reports,accounts}/` |
| 8 | `ChartOfAccountsPage`, `HistoricalComparisonPage` صفحات منفصلة | ✅ مؤكَّد | `adminRoutes.tsx:47-48` |
| 9 | تكدّس 4 أقسام تقنية في الجذر | ✅ مؤكَّد | `navigation.ts:49,51,56,57` → audit-log / zatca / diagnostics / email-monitor كلها بنفس المستوى مع التشغيلية |

**ادعاء واحد بحاجة دقّة:** الخطة قالت "21 قسماً". العدد الفعلي من `navigation.ts`: **22 رابطاً إدارياً** (شاملاً "واجهة المستفيد" كرابط تحويل) — فرق غير جوهري لكن يجب أن يُذكر بدقة.

---

### الجزء ب: خطر تشغيلي اكتُشف لم يُذكر في الخطة الأولى

🚨 **`useDashboardSummary` يستدعي Edge Function** — وهي بطيئة (3.4ث في console logs المُرفقة). توحيد المصادر سيُحسّن الأداء أيضاً، ليس فقط الاتساق.

🚨 **`AccountsBeneficiariesTable` يحسب الحصص محلياً** بينما الـmemory `Server-Side Distribution` تنص على أن `execute_distribution` السيرفري هو السلطة. أي تعديل يدوي على `manualDistributions` في الواجهة لن يطابق ما يحفظه الخادم → **تناقض أرقام محتمل عند المستفيد بعد التوزيع**.

---

### الجزء ج: الحل التفصيلي المعتمد (مع الأدلة)

#### المرحلة 1 — إعادة هيكلة القائمة (تشويش بصري فقط، آمنة 100%)

**ملفات تُعدَّل:**
- `src/constants/navigation.ts` — تحويل المصفوفة المسطّحة إلى مصفوفة مجموعات: `[{ group: 'التشغيل', items: [...] }, ...]`
- `src/components/layout/Sidebar.tsx` — رسم `<SidebarGroupLabel>` بين المجموعات (يدعم shadcn sidebar أصلاً)
- `src/components/layout/BottomNav.tsx` — يبقى مسطّحاً (موبايل) لكن يقتصر على 5 عناصر كما هو
- `src/hooks/page/shared/useNavLinks.ts` — تعديل توقيع الإرجاع ليعطي مجموعات بدل قائمة

**التجميع النهائي** (نفس مقترح الخطة، مُعتمد):
```
الرئيسية (مفرد فوق المجموعات)
─ التشغيل: العقارات، العقود، المستفيدين، الفواتير
─ المالية: الدخل، المصروفات، الحسابات الختامية، التقارير، المحتوى السنوي
─ المرجع: الشجرة المحاسبية، اللائحة التنظيمية
─ الاتصال: المراسلات، الدعم الفني
─ الإدارة: المستخدمين، الإعدادات
─ النظام: سجل المراجعة، ZATCA، مراقبة البريد، تشخيص النظام
واجهة المستفيد (مفرد أسفل، رابط تبديل)
```

**إعادة التسمية** (في `linkLabelKeys` بـ `navigation.ts` — قابل للتجاوز من `app_settings.menu_labels`):
- "التقارير" → **"التقارير والإفصاح"**
- "الحسابات" → **"الحسابات الختامية والإقفال"**
- "التقرير السنوي" → **"المحتوى السنوي للوقف"**

**شارة موحّدة:** تعميم نمط `unreadCount` ليدعم `notifications` و`support` لاحقاً (تمرير `badges: { messages, notifications, support }` بدل عدد مفرد).

#### المرحلة 2 — توحيد مصدر الأرقام (إصلاح تناقضات حقيقية)

**إنشاء:**
- `src/components/financial/UnifiedDisclosureTable.tsx` — مكوّن واحد يأخذ `summary` كـprop ويرسم جدول الإفصاح الكامل (إيرادات → مصروفات → VAT → زكاة → حصص → متاح → متبقّي).
- `src/hooks/data/financial/useUnifiedFinancialSummary.ts` — هوك واحد يلتقط نفس الحسابات لـadmin/accountant/beneficiary مع `fiscal_year_id` ، يحلّ محل التشظّي بين `useReportsData` / `useAccountsPage` / `useDashboardSummary` تدريجياً.

**استخدامه في:**
1. `ReportsPage` تبويب "financial" — يحلّ محل `AnnualDisclosureTable` المضمّن
2. `AccountsPage` — يحلّ محل `AccountsSummaryCards`+`AccountsDistributionTable` المتشعبين
3. `AnnualReportPage` — تُحذف بطاقات الملخص الأربع منها (تتعارض مع طبيعتها التحريرية)
4. `FinancialReportsPage` / `AccountsViewPage` / `DisclosurePage` (مستفيد) — توحيد العرض

**اختبار قبول إلزامي:** test يصرّح أن لنفس `fiscal_year_id`:
```ts
expect(reportsHook.totalIncome).toBe(accountsHook.totalIncome)
expect(reportsHook.availableAmount).toBe(accountsHook.availableAmount)
```

#### المرحلة 3 — دمج "المقارنة التاريخية" كتبويب

- نقل محتوى `HistoricalComparisonPage.tsx` كـ`<TabsContent value="comparison">` داخل `ReportsPage`
- إبقاء المسار `/dashboard/comparison` مع redirect إلى `/dashboard/reports?tab=comparison` (لعدم كسر الروابط القديمة)
- حذف العنصر من القائمة الجانبية فقط

#### المرحلة 4 — معالجة "الدخل اليدوي"

سيناريوهان للاختيار (سؤال للمستخدم في نهاية التنفيذ، لا الآن):
- **(أ) محافظ:** إبقاء صفحة الدخل مع شارة تحذير فوق نموذج الإضافة: "الإيرادات الإيجارية تُنشأ تلقائياً عند دفع الفاتورة. استخدم هذا للدخل غير الإيجاري فقط".
- **(ب) جذري:** إخفاء زر "إضافة دخل" خلف فلتر `source != 'rent'` ونقل القسم تحت الفواتير كتبويب "دخل غير إيجاري".

**سأبدأ بـ(أ)** لأنه آمن ولا يكسر بيانات قائمة.

#### المرحلة 5 — توحيد التوزيع مع السلطة السيرفرية

- جعل `AccountsBeneficiariesTable` يقرأ من نتيجة `execute_distribution` المخزّنة عند الإقفال (إن وُجدت) بدل الحساب المحلي للسنوات المغلقة.
- للسنة النشطة، يُستخدم نفس `largest remainder method` المُعتمد في الخادم (memory موجود) — استخراج المنطق إلى `src/utils/finance/distribution.ts` يُستدعى من الخادم والواجهة معاً.

---

### الجزء د: ضمانات السلامة

- **لا تغيير على RLS، migrations، Edge Functions، supabase config، أو منطق الإقفال.**
- جميع الاختبارات الحالية (`*.test.tsx`) تبقى خضراء — `useReportsData`/`useAccountsPage`/`useDashboardSummary` تبقى موجودة كـwrappers رقيقة فوق `useUnifiedFinancialSummary` خلال فترة الانتقال.
- مسارات الصفحات لا تتغير (إلا redirect comparison)، لذا الإشارات المرجعية والـPDF exports تعمل.
- UI تستخدم CSS variables الموجودة، لا ألوان جديدة.

---

### اقتراح التنفيذ على دفعات (PRs منفصلة)

1. **PR-1:** المرحلة 1 (قائمة + تسميات) — يحلّ التشويش البصري فوراً، مخاطر صفر.
2. **PR-2:** المرحلة 2+3 (توحيد الإفصاح + دمج المقارنة) — يحلّ التناقض الرقمي، يحتاج اختبارات قبول.
3. **PR-3:** المرحلة 4 (تحذير الدخل اليدوي) + المرحلة 5 (توحيد التوزيع).

---

**هل تريد:**
- (أ) تنفيذ كل المراحل دفعة واحدة، أو
- (ب) البدء بـPR-1 فقط (القائمة + التسميات)، نراجع الناتج، ثم نتابع؟

اضغط "Implement plan" لاعتماد كامل المراحل، أو أخبرني إن أردت اختيار (ب).
