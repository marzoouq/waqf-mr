
# تدقيق معماري شامل — تقرير محدّث

## ملخص التقييم

المشروع **ناضج معمارياً** — 743 ملف مصدري، فصل طبقات واضح، صفر `console.*` وصفر `as any` في كود الإنتاج، لا استيراد Supabase في المكونات. المشاكل المتبقية **تحسينية** وليست هيكلية.

---

## المشاكل مرتّبة حسب الأهمية

### 🔴 مستوى 1 — مشاكل هيكلية (5 نقاط)

#### 1.1 `useDashboardRealtime` في `hooks/ui/` — مؤكّد
هوك بيانات يستخدم `useQueryClient` و `useBfcacheSafeChannel` لإبطال الكاش. لا علاقة له بالـ UI.
- **مستخدم في**: `AdminDashboard.tsx` + `useWaqifDashboardPage.ts`
- **التوصية**: نقل إلى `src/hooks/data/core/`

#### 1.2 `useRealtimeAlerts` في `hooks/ui/` — مؤكّد
يستمع لتغييرات `postgres_changes` ويُرسل إشعارات. هوك بيانات/إشعارات.
- **مستخدم في**: لا أحد (dead code) — لكنه مفيد ومُختبر
- **التوصية**: نقل إلى `src/hooks/data/notifications/`

#### 1.3 `useRetryQueries` في `hooks/ui/` — **جديد** ⚡
هوك يستخدم `useQueryClient.invalidateQueries` — هذا منطق بيانات بحت. مستخدم في **10 ملفات** (كلها في `hooks/page/`).
- **التوصية**: نقل إلى `src/hooks/data/core/`

#### 1.4 `useBfcacheSafeChannel` يُعاد تصديره من barrel الـ UI — مؤكّد
`hooks/ui/index.ts` سطر 2 يُصدّر من `@/lib/realtime/`. لا أحد يستورده من هذا الـ barrel.
- **مشكلة مرتبطة**: `BeneficiaryDashboard.test.tsx` يعمل mock لمسار `@/hooks/ui/useBfcacheSafeChannel` — ملف غير موجود أصلاً (المسار الصحيح `@/lib/realtime/bfcacheSafeChannel`)
- **التوصية**: حذف التصدير + تصحيح mock الاختبار

#### 1.5 `AuthContext.tsx` يستورد من طبقة hooks — مؤكّد
يستورد `checkNewDeviceLogin` من `@/hooks/data/audit/useSecurityAlerts`. Context (بنية تحتية) يعتمد على Hook (طبقة أعلى) — اعتماد معكوس.
- **التوصية**: استخراج الدالة إلى `src/lib/services/securityService.ts`

---

### 🟡 مستوى 2 — تنظيف (3 نقاط)

#### 2.1 `lib/index.ts` ميت — مؤكّد
لا يستورده أي ملف. **التوصية**: حذف.

#### 2.2 `BeneficiarySettingsPage` — `useQueryClient` مباشرة
منطق بسيط (سطر واحد `invalidateQueries`) لكنه يكسر النمط. **التوصية**: تحسين اختياري.

#### 2.3 مكونات تقترب من 250 سطر
`ZatcaInvoicesTab` (229), `MonthlyPerformanceReport` (224), `AccountsDistributionTable` (219), `comprehensiveBeneficiary.ts` (281, تجاوز). لا تحتاج تدخل فوري.

---

### 🟢 مستوى 3 — ما يعمل بامتياز ✅

| الجانب | التقييم |
|--------|---------|
| لا Supabase في المكونات | 0 استيراد — ممتاز |
| لا `console.*` | صفر (فقط test setup) |
| لا `as any` في الإنتاج | صفر (فقط `viewHelper` مبرر + `pdfHelpers` تعليق) |
| فصل الطبقات | واضح: `utils/` ← `lib/` ← `hooks/` ← `components/` ← `pages/` |
| Logger موحّد | مُطبّق بالكامل |
| Lazy loading | كل الصفحات |
| أنماط CRUD | `useCrudFactory` موحّد |
| سياسة الاستيراد المباشر | مُطبّقة في المسارات الحرجة |

---

## خطة التنفيذ المقترحة

### الخطوة 1 — نقل 3 هوكات من `hooks/ui/` (الأهم)
| الملف | من | إلى |
|-------|-----|------|
| `useDashboardRealtime.ts` | `hooks/ui/` | `hooks/data/core/` |
| `useRealtimeAlerts.ts` + اختبار | `hooks/ui/` | `hooks/data/notifications/` |
| `useRetryQueries.ts` | `hooks/ui/` | `hooks/data/core/` |

تحديث الاستيرادات: ملفين لـ Dashboard + 10 ملفات لـ RetryQueries + barrel files

### الخطوة 2 — فك اعتماد AuthContext المعكوس
- إنشاء `src/lib/services/securityService.ts` بدوال `checkNewDeviceLogin` + `extractFingerprint` + `getDeviceFingerprint`
- `useSecurityAlerts.ts` يعيد تصدير من الموقع الجديد
- `AuthContext.tsx` يستورد من `@/lib/services/securityService`

### الخطوة 3 — تنظيف barrel وملفات ميتة
- حذف 4 تصديرات من `hooks/ui/index.ts` (الثلاثة المنقولة + `useBfcacheSafeChannel`)
- حذف `src/lib/index.ts`
- تصحيح mock في `BeneficiaryDashboard.test.tsx`

### الخطوة 4 — (اختياري)
- نقل `handleRetry` من `BeneficiarySettingsPage` إلى هوك
- تقسيم `comprehensiveBeneficiary.ts` (281 سطر)
- إضافة اختبارات للهوكات المالية الحرجة

---

## الملفات المتأثرة: ~18 ملف

| الملف | التغيير |
|-------|---------|
| `src/hooks/data/core/useDashboardRealtime.ts` | إنشاء (نقل) |
| `src/hooks/data/core/useRetryQueries.ts` | إنشاء (نقل) |
| `src/hooks/data/core/index.ts` | إضافة تصديرين |
| `src/hooks/data/notifications/useRealtimeAlerts.ts` | إنشاء (نقل) |
| `src/hooks/data/notifications/useRealtimeAlerts.test.ts` | إنشاء (نقل) |
| `src/hooks/data/notifications/index.ts` | إضافة تصدير |
| `src/lib/services/securityService.ts` | إنشاء |
| `src/hooks/data/audit/useSecurityAlerts.ts` | تبسيط → إعادة تصدير |
| `src/contexts/AuthContext.tsx` | تغيير مسار استيراد واحد |
| `src/hooks/ui/index.ts` | حذف 4 تصديرات |
| `src/pages/dashboard/AdminDashboard.tsx` | تغيير مسار استيراد |
| `src/hooks/page/beneficiary/useWaqifDashboardPage.ts` | تغيير مسار استيراد |
| 10 ملفات `hooks/page/` | تغيير مسار `useRetryQueries` |
| `src/pages/beneficiary/BeneficiaryDashboard.test.tsx` | تصحيح mock path |
| `src/lib/index.ts` | حذف |

**المخاطر**: منخفضة — نقل ملفات + تحديث مسارات. لا تغيير في المنطق.
