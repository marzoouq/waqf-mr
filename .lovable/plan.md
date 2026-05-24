# تقرير تدقيق الكود الشامل — وقف مرزوق

**النطاق:** قراءة فقط، لا تعديلات. 1,108 ملف TS/TSX، ~89K سطر، 65 صفحة، 293 hook، 434 مكوّن.

---

## 1. الخلاصة التنفيذية

الكود **ناضج جداً ومنضبط معمارياً**. الأنماط الصارمة (Page Hook، lib vs utils، barrel rule، فصل hooks/data/domain/page) مطبَّقة بدقة. الانحرافات قليلة جداً ومعزولة.

| المقياس | النتيجة | الحكم |
|---|---|---|
| استدعاءات `supabase` خام في `pages/`+`components/` | **0** | ممتاز |
| استخدام `console.*` خارج logger (إنتاج) | **0** | ممتاز |
| استخدام `: any` (إنتاج) | **1** فقط (مبرَّر في `inferMutationArg.ts`) | ممتاز |
| `TODO/FIXME/HACK` | **0** | ممتاز |
| ملفات تتجاوز حدّ 200 سطر | **4** (كلها في `utils/pdf` و`utils/export`) | منخفض |
| `eslint-disable` | 54 (مبرَّرة بتعليقات؛ 13 منها مركّزة في ملف واحد) | متوسط |
| barrel-to-barrel imports | **0** | ممتاز |
| App entry مفصول (providers/router/layout) | نعم | ممتاز |

---

## 2. ملاحظات إيجابية تستحق التثبيت

- `src/App.tsx` نظيف (12 سطراً)، يفوّض إلى `app/providers` + `app/router` + `app/root-layout`.
- مسارات الأدوار مفصولة (`adminRoutes`, `beneficiaryRoutes`, `waqifRoutes`, `publicRoutes`).
- `hooks/` مقسّمة طبقياً: `data/` (Supabase خام) ← `domain/` (حسابات) ← `page/` (تنسيق صفحة) ← `application/` (controllers عابرة للأدوار)، مطابق للذاكرة `hooks-layering`.
- لا توجد كائنات Supabase Client أو `sonner` داخل `utils/` (حد lib vs utils محترم).
- لا توجد barrel imports متسلسلة (قاعدة tree-shaking سليمة).

---

## 3. النتائج المرتّبة من الأحرج إلى الاختياري

### 🟠 P1 — متوسط (يستحق المعالجة قريباً)

**1) `src/hooks/domain/financial/useAccountsSettings.ts` يحتوي 13 `eslint-disable react-hooks/set-state-in-effect`**
- التشخيص: الـ hook يزامن state محلي قابل للتحرير من مصدرين (`appSettings.data` و`accounts`/`selectedFY`) عبر `useEffect` متعدد بـ `setState`، وهو بالضبط النمط الذي حذّرت منه قواعد React Compiler.
- التوصية: إعادة هيكلة إلى **default + override pattern** المعتمد في `useLandingStatsSettings` (وذكرته الذاكرة `mem://features/admin/...`): قيم مشتقّة بـ `useMemo` من المصدر، مع `overrides` state يُمسح عند تغيّر مفتاح المصدر (`selectedFY.id`) أو بعد `save` ناجح.
- الأثر: إزالة 13 من أصل 54 `eslint-disable` دفعة واحدة + توافق صحيح مع React 19 Compiler.

**2) أربعة ملفات تتجاوز حدّ 200 سطر المنصوص عليه في الاتفاقيات**
| الملف | الأسطر | المقترح |
|---|---|---|
| `utils/pdf/reports/forensicAudit.ts` | 238 | تقسيم إلى `sections/` (header, balances, distributions, footer) |
| `utils/pdf/reports/comprehensiveBeneficiaryTables.ts` | 213 | فصل بنّاءات الجداول عن منطق الـ pagination |
| `utils/export/printDistributionReport.ts` | 213 | فصل الـ HTML template عن orchestration |
| `utils/export/xlsx.ts` | 205 | فصل sheet builders حسب النوع |

### 🟡 P2 — منخفض (تحسينات نظافة)

**3) ملفات قريبة من الحد (190–198 سطر)** — مراقبة فقط، لا تدخّل:
- `useZatcaSettings.ts` (198)، `useAiChat.ts` (197)، `useInvoicesPage.ts` (191)، `useAccountsPage.ts` (188).
- توصية: عند إضافة ميزة جديدة، تقسيم احترازي قبل تجاوز 200.

**4) تعليقات `eslint-disable` ذات الصياغة المختصرة `-- reset`**
- في `useAccountsSettings.ts:59-65` التعليقات مقتضبة (`-- reset` فقط)، بينما المعيار يُفضّل وصفاً كاملاً (`-- reset form when no account exists for selected year` كما في السطر 57).
- توصية: توحيد الصياغة عند الإصلاح في P1.

**5) `setup.ts` للاختبارات يلتقط `console.warn/error`**
- ملاحظة فقط، لا مشكلة. هذا نمط مقبول لتنقية إخراج الاختبارات.

### 🟢 P3 — اختياري

**6) `src/integrations/supabase/types.ts` بحجم 2,425 سطراً** — مولَّد تلقائياً، لا يُمسّ (موثَّق في القواعد).

**7) إعادة فحص دورية لـ `useStableRef`** في `hooks/domain/financial/` للتأكد من عدم تضخيم refs مع تطوّر React Compiler.

---

## 4. مجالات فحصها ولم تُظهر مشاكل

- ❌ لا منطق Supabase في طبقة العرض.
- ❌ لا state إدارة مكرَّرة (لا Redux/Zustand مع TanStack).
- ❌ لا ألوان hex خام في components (تم احترام CSS variables).
- ❌ لا `getSession()` في Edge Functions ولا تخزين أدوار في profile/localStorage.
- ❌ لا barrel imports متسلسلة.
- ❌ لا `console.*` خارج logger في الإنتاج.

---

## 5. ترتيب التنفيذ المقترح (إذا قرّرت لاحقاً الانتقال لوضع البناء)

1. **P1-1**: إعادة هيكلة `useAccountsSettings.ts` بنمط default+override (أعلى عائد).
2. **P1-2**: تقسيم `forensicAudit.ts` و3 ملفات `utils` الأخرى لتطبيق حدّ 200 سطر.
3. **P2-4**: توحيد صياغة تعليقات `eslint-disable` المتبقّية.
4. **P2-3**: مراجعة دورية للملفات القريبة من الحد.

---

## 6. الحكم النهائي

البنية المعمارية **صحية ومنضبطة بمعايير عالية**. لا توجد مشاكل حرجة (P0). البند الوحيد المستحق للمعالجة قريباً هو إعادة هيكلة `useAccountsSettings.ts`؛ الباقي تحسينات نظافة منخفضة المخاطر يمكن تأجيلها كـ tech debt بدون تأثير على الإنتاج.

**جاهزية النشر من منظور المعمارية: ✅ عالية.**
