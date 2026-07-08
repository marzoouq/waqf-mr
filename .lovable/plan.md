## تقرير الفحص الفعلي — الواجهات الداخلية + الشريط الجانبي

### النطاق المفحوص
- `DashboardLayout.tsx`, `Sidebar.tsx` + `sidebar/*` (Brand/NavList/UserFooter), `BottomNav.tsx`, `MobileHeader.tsx`, `DesktopTopBar.tsx`
- `useLayoutShell`, `useNavLinks`, `useSectionsVisibility`, ثوابت `navigation.ts`, `bottomNavLinks.ts`, `routeRegistry`
- `src/routes/*` (adminRoutes, beneficiaryRoutes, waqifRoutes, publicRoutes)
- Supabase DB linter (75 نتيجة)
- سجل الفحص الأمني (Lovable): 0 نتائج مفتوحة

---

### النتائج — مصنّفة حسب الشدة

#### 🔴 حرج
1. **DB linter — Security Definer View (ERROR)** على `contracts_safe`. الذاكرة توثّق أن `security_invoker=false` مقصود لإخفاء PII، لذا يُوصى بتوثيق التجاهل رسميًا عبر `security--manage_security_finding` بدل تركه ERROR دائم يُشوش الفحوص المستقبلية.
2. **74 تحذير `SECURITY DEFINER function executable by anon/authenticated`**. الدوال ذات النية العامة (مثل `has_role`, `jwt_role`, `get_current_role`) لا يجب أن تكون قابلة للاستدعاء من `anon`. المطلوب `REVOKE EXECUTE ... FROM anon` على غير المخصّصة صراحةً لغير الموثّق (webhooks/edge signup helpers فقط).
3. **`<aside role="dialog" aria-modal="true" aria-hidden={!mobileSidebarOpen}>`** في `DashboardLayout.tsx:78-97`. عند إغلاق الدرج المحمول تبقى الروابط داخلها قابلة للتركيز بالـTab بينما `aria-hidden=true` — انتهاك WAI‑ARIA (focusable descendant of aria-hidden). الحل: إخفاء العنصر فعليًا بـ`translate` + `pointer-events-none` بدون `aria-hidden`، أو `visibility:hidden`/`display:none`.

#### 🟠 وظيفي
4. **ازدواج `WaqfInfoBar`**: يُستخدم في `DashboardLayout` (كتلة `lg:hidden`) وفي `DesktopTopBar` — كلاهما مركّب دائمًا، والفصل بـTailwind فقط بصريًا؛ نفس المكوّن يُشتق نفس البيانات مرتين (استعلام مضاعف/subscription مضاعف).
5. **ازدواج `GlobalSearch`**: نفس المشكلة (مرة في المحتوى المحمول ومرة في `DesktopTopBar`).
6. **ازدواج `FiscalYearSelector`**: مرتان (mobile block + DesktopTopBar).
7. **ازدواج `BookOpen → /bylaws`**: زر مستقل في MobileHeader + في DesktopTopBar، والرابط نفسه موجود في القائمة الجانبية → 3 مداخل لنفس الصفحة.
8. **`/beneficiary` كمعاينة للناظر** يُضاف يدويًا في `allAdminLinks` لكنه غير موجود في `ADMIN_ROUTES` → `ADMIN_ROUTE_TO_SECTION[/beneficiary]` = undefined → قد يمرّ عبر `filterLinksBySectionVisibility` بشكل غير مقصود (يحتاج تحقق سلوك الدالة على `undefined`).
9. **BottomNav للواقف** يشير إلى `/beneficiary/properties|contracts|accounts` بينما الروابط في `waqifRoutes.tsx` لا تحمي إلا `/waqif` — الروابط الفعلية موجودة في `beneficiaryRoutes.tsx` بحماية `ALL_NON_ACCOUNTANT` (تشمل الواقف)، لكن التسمية للواقف تبقى تحت مسار `/beneficiary/*` (تلوث معنوي في العنوان "بوابة المستفيد").

#### 🟡 UX / تصميم / RTL
10. **حجم لمسة روابط `SidebarNavList`**: `py-2.5` + أيقونة `w-5` = ~36px ارتفاع. أقل من 44×44 على الجوال.
11. **`SidebarUserFooter`** يكرّر زر تسجيل الخروج 3 مرات (mobile / desktop-collapsed / desktop-expanded). تكرار DOM وصيانة مزدوجة.
12. **`SidebarBrand` collapsed toggle** يستخدم `Menu` — نفس أيقونة فتح الدرج في `MobileHeader` → غموض بصري بين الوظيفتين.
13. **`willChange:'transform'`** دائم على `MobileHeader` و`BottomNav` — يُجبر GPU layer باستمرار (استهلاك ذاكرة على الأجهزة الضعيفة). استخدمها حال الحاجة فقط (أثناء انتقال).
14. **`aside` سطح المكتب** يستخدم `transition-[width] duration-300` لكن `main` يستخدم `transition-[margin]` — قد يظهر تخلّف بسيط بين الحركتين. توحيد `duration-300 ease-in-out`.

#### 🟢 إمكانية الوصول (a11y)
15. **لا يوجد `focus-visible:` ring** على روابط `SidebarNavList` ولا على أزرار `BottomNav` — مستخدم لوحة المفاتيح لا يرى مؤشر التركيز.
16. **`<nav role="navigation">`** في `SidebarNavList` — الدور مضاعف (nav دور ضمني بالفعل).
17. **`aside role="dialog"`** بدون `aria-labelledby` مربوط بعنوان مرئي داخل الدرج (الحالي يستعمل `aria-label` نصي — مقبول لكن ربط بعنوان `SidebarBrand` أفضل).
18. **BottomNav** الأيقونات تحمل `aria-hidden` صحيحًا والروابط تحمل `aria-label`، لكن نص العنصر النشط لا يُعلن (`aria-current="page"` مفقود).
19. **Skip link** موجود ومُنسّق (👏)، لكن `main[tabIndex=-1]` بدون `outline` عند التركيز البرمجي — أضف `focus-visible:outline`.

---

### القرارات الرئيسية قبل التنفيذ
- **إصلاح ازدواج المكوّنات (4/5/6/7)** يمس التخطيط لكنه لا يغيّر السلوك — يُنفَّذ كإعادة هيكلة صغيرة داخل `DashboardLayout` + `DesktopTopBar`.
- **إصلاح `aria-hidden` (3)** يمس آلية الدرج الحالية (swipe/focus trap) — يحتاج اختبار يدوي بعد التغيير.
- **REVOKE على دوال SECURITY DEFINER (2)** يحتاج قائمة دقيقة بالدوال (سيتم استخراجها من `pg_proc`) لأن بعضها يجب أن يبقى قابلاً من `anon` (مثل `guard_signup`, `unsubscribe_by_token`).

---

### خطة الإصلاح — على 4 موجات

#### الموجة 1 — إصلاحات وظيفية بدون مخاطر
- إزالة `WaqfInfoBar`, `GlobalSearch`, `FiscalYearSelector`, زر `BookOpen` من `DashboardLayout` (الكتلة `lg:hidden`) واعتماد نسخة واحدة داخل `MobileHeader` (للجوال) و`DesktopTopBar` (لسطح المكتب) فقط.
- نقل الشارة "مقفلة" إلى مكوّن مشترك `ClosedYearBadge` يُستخدم في الاثنين.
- التحقق أن `/beneficiary` (معاينة الناظر) يحمل `section` احتياطيًا أو استثناؤه من `filterLinksBySectionVisibility` صراحةً.

#### الموجة 2 — a11y (خفيف)
- إضافة `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2` لجميع روابط `SidebarNavList` و`BottomNav`.
- إضافة `aria-current="page"` في `BottomNav` عند `active`.
- إزالة `role="navigation"` المضاعف من `SidebarNavList`.
- إضافة `focus-visible:outline` على `#main-content`.
- استبدال `aria-hidden` على الدرج المحمول بإخفاء عبر `translate-x-full + pointer-events-none` (يعتمد على قراءة `useSwipe` لتأكيد أن التحوّل ليس متعارضًا).

#### الموجة 3 — تنظيف UX
- توحيد أزرار "تسجيل الخروج" في `SidebarUserFooter` إلى مكوّن واحد يعتمد `sidebarOpen` + media query بدل 3 نسخ.
- تغيير أيقونة الطي في `SidebarBrand` من `Menu` إلى `PanelRightClose/PanelRightOpen` لتفادي التطابق مع درج الجوال.
- رفع لمسة الروابط الجانبية إلى `min-h-11` على الجوال.
- إزالة `willChange:'transform'` الدائم من الهيدر والبوتوم-ناف.

#### الموجة 4 — أمني (Supabase)
- استخراج قائمة الدوال SECURITY DEFINER عبر:
  ```sql
  SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef=true;
  ```
- تصنيفها إلى: (أ) داخلي فقط (بولسي RLS) → `REVOKE EXECUTE FROM anon, authenticated; GRANT EXECUTE TO service_role`؛ (ب) موثّق-فقط → `REVOKE FROM anon`؛ (ج) عام (guard_signup, unsubscribe_by_token) → إبقاء `anon`.
- توثيق تجاهل `contracts_safe` (Security Definer View) عبر `security--manage_security_finding` مع الاستناد للذاكرة.
- إعادة تشغيل linter والتحقق من انخفاض العدد من 75 إلى ≤ 5.

---

### التسليمات
- كود: تعديلات في `DashboardLayout.tsx`, `MobileHeader.tsx`, `DesktopTopBar.tsx`, `SidebarBrand.tsx`, `SidebarNavList.tsx`, `SidebarUserFooter.tsx`, `BottomNav.tsx`.
- ترحيل SQL: `supabase/migrations/<ts>_tighten_security_definer_grants.sql`.
- تحديث ذاكرة: إضافة قاعدة "REVOKE EXECUTE default on SECURITY DEFINER" ضمن `mem://conventions/libraries-and-architecture`.
- بدون تعديل: `client.ts`, `types.ts`, `config.toml`, `.env`, AuthContext, ProtectedRoute.

بعد الاعتماد سأنفّذ الموجات بالترتيب مع تحقق بصري (screenshot Playwright) بعد الموجة 1 و2.
