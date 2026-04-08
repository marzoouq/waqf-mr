

# تقرير التدقيق الشامل — مشروع waqf-mr (نسخة مُحدَّثة)

## التقييم العام: 8.7/10

المشروع في حالة معمارية ممتازة. النتائج أدناه مرتبة من الأكثر أهمية إلى التجميلي.

---

## الأرقام

| المقياس | القيمة |
|---------|--------|
| ملفات مصدر (بدون اختبارات) | ~727 |
| إجمالي الأسطر | ~63,000 (بدون types.ts المولّد) |
| `any` غير مبرّر في كود الإنتاج | **0** (الوحيد في `chart.tsx` مع eslint-disable) |
| `console.*` مباشر | **0** (فقط في `logger.ts`) |
| Supabase مباشر في مكونات UI | **1 ملف** |

---

## نقاط القوة المؤكّدة

1. نمط `Page → usePageHook → useDataHook → Supabase` مُطبّق بإتقان في كل الصفحات
2. صفر `any` وصفر `console.*` في كود الإنتاج
3. Barrel files منظمة ومحدّثة في كل المجلدات
4. كل ملف إنتاجي تحت 250 سطراً (أكبرها 249)
5. `useCrudFactory` مركزي لكل عمليات CRUD
6. `DeferredRender` + `ViewportRender` + lazy loading مُطبّقة
7. لا مكونات يتيمة، لا كود معلّق، لا استيرادات ميتة

---

## المشكلات المكتشفة

### P1 — حرج: `LogoUploadCard.tsx` يستدعي Supabase مباشرة

الملف الوحيد في 36 مجلد مكونات الذي يخرق قاعدة فصل المسؤوليات:
- `supabase.storage.from('waqf-assets').upload(...)` — سطر 56
- `supabase.storage.from('waqf-assets').getPublicUrl(...)` — سطر 61
- `supabase.from('app_settings').upsert(...)` — سطر 64

**الحل**: استخراج منطق الرفع والحفظ إلى هوك `useLogoUpload` في `src/hooks/data/settings/`، والإبقاء على المكون كـ UI فقط.

---

### P2 — متوسط: `imageCompression.ts` في `lib/` وهي دالة نقية

`src/lib/imageCompression.ts` دالة نقية (pure function) بدون حالة أو اعتماد على Supabase — مكانها الصحيح حسب قواعد المشروع هو `src/utils/image/` بجانب `resizeImage.ts`. ملف `lib/README.md` ينص صراحةً على أن الدوال النقية تذهب إلى `utils/`.

**الحل**: نقل `imageCompression.ts` إلى `src/utils/image/imageCompression.ts` وتحديث الاستيراد في `useInvoiceFileUtils.ts` و `lib/index.ts`.

---

### P3 — متوسط: 3 ملفات في `utils/` الجذر بدون مجلد فرعي

| الملف | الأسطر | المكان المقترح |
|-------|--------|----------------|
| `contracts.ts` | 20 | `utils/contracts/` |
| `permissions.ts` | 10 | `utils/auth/` أو `lib/auth/` (لأنها مرتبطة بالأدوار) |
| `validation.ts` | 20 | `utils/validation/` |

كل مجلد آخر في `utils/` منظّم في مجلدات فرعية — هذه الثلاثة تكسر النمط.

---

### P4 — متوسط: صفحات قريبة من حد 250 سطراً

| الصفحة | الأسطر | الملاحظة |
|--------|--------|---------|
| `AnnualReportPage.tsx` | 211 | `renderSection` دالة بـ 30+ سطر JSX — قابلة للاستخراج كمكون |
| `AuditLogPage.tsx` | 206 | جدول + فلاتر + تبويبات في ملف واحد |
| `AccountantDashboardView.tsx` | 210 | |

أي إضافة ميزة لهذه الصفحات ستتجاوز الحد. استخراج أقسام JSX الكبيرة الآن يمنع المشكلة لاحقاً.

---

### P5 — منخفض: `useDashboardSummary.ts` — 249 سطراً (على الحافة)

يحتوي على ~50 سطر تعريفات أنواع (interfaces) يمكن فصلها إلى `types.ts` منفصل.

---

### P6 — تجميلي: `use-mobile.tsx` — اسم وامتداد غير متسقين

- امتداد `.tsx` بدون JSX — يجب أن يكون `.ts`
- اسم kebab-case (`use-mobile`) بينما بقية الهوكات camelCase (`useChartReady`, `useIdleTimeout`)
- الاسم المقترح: `useIsMobile.ts`

---

### P7 — اختياري: `useEffect` في 8 مكونات إعدادات

مكونات الإعدادات (`AdvanceSettingsTab`, `AppearanceTab`, `BannerSettingsTab`, `MenuCustomizationTab`, `WaqfSettingsTab`, `LandingPageTab`, `RolePermissionsTab`, `PermissionsControlPanel`) تستخدم `useEffect` لمزامنة form state مع البيانات المحمّلة. نقل هذا المنطق إلى هوكات مخصصة سيُحسّن الاتساق مع بقية المشروع لكنه ليس ضرورياً وظيفياً.

---

## خطة التنفيذ المرتبة

| # | البند | الأولوية | الجهد |
|---|-------|---------|-------|
| 1 | استخراج منطق Supabase من `LogoUploadCard` إلى `useLogoUpload` | حرج | 30 دقيقة |
| 2 | نقل `imageCompression.ts` من `lib/` إلى `utils/image/` | متوسط | 10 دقائق |
| 3 | نقل 3 ملفات `utils/` الجذرية إلى مجلدات فرعية | متوسط | 15 دقيقة |
| 4 | استخراج `renderSection` من `AnnualReportPage` كمكون | متوسط | 20 دقيقة |
| 5 | فصل أنواع `useDashboardSummary` إلى ملف منفصل | منخفض | 10 دقائق |
| 6 | إعادة تسمية `use-mobile.tsx` → `useIsMobile.ts` | تجميلي | 5 دقائق |
| 7 | نقل `useEffect` من مكونات الإعدادات إلى هوكات | اختياري | 2-3 ساعات |

---

## الخلاصة

نسبة الالتزام بمعايير المشروع تتجاوز 99%. المشكلة الحقيقية الوحيدة هي P1 (`LogoUploadCard`). P2 جديدة مقارنة بالتدقيق السابق (`imageCompression.ts` في المكان الخطأ). البقية تحسينات وقائية.

