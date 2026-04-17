

# خطة المهام الأربع — موثقة بالأدلة

## 1. حذف المجلدات الفارغة ✅
تأكدت بـ `code--list_dir`: المجلدان `src/pages/beneficiary/carryforward/` و `notifications/` فارغان تماماً. حذف مباشر.

## 2. تقارير الطباعة — قرار جنائي: إبقاء كما هي
- `usePrint` يستدعي `window.print()` على DOM الحالي
- `printShareReport`/`printDistributionReport` تفتحان نوافذ منبثقة معزولة بقوالب HTML خاصة (Amiri، RTL، print colors)
- توحيدهما يكسر الوظيفة. **لا تغيير.**

## 3. توسعة storage.ts + تحويل 3 ملفات

### أ. توسعة `src/lib/storage.ts`
إضافة `safeSessionGet/Set/Remove` بنفس النمط الحالي:
```ts
export function safeSessionGet<T = string>(key: string, fallback: T): T { ... }
export function safeSessionSet(key: string, value: unknown): void { ... }
export function safeSessionRemove(key: string): void { ... }
```

### ب. الملفات المحوّلة (3 فقط)

| ملف | السطور | التحويل |
|-----|--------|---------|
| `BetaBanner.tsx` | 26, 51 | `sessionStorage.getItem/setItem('beta_banner_dismissed')` → `safeSessionGet/Set` |
| `nationalIdLogin.ts` | 65 | `sessionStorage.setItem(NID_LOCKED_UNTIL, ...)` → `safeSessionSet` (سطر واحد) |
| `pageMonitor.ts` | 56, 76, 84 | 3 استدعاءات لـ sessionStorage → `safeSession*` |

### ج. الملفات المستثناة (مبررة)
- `diagnostics/checks/storage.ts` — وظيفته **هي** فحص localStorage مباشرة (يعد المفاتيح والبايتات)
- `lazyWithRetry.ts` — حارس chunk-retry حرج قبل reload (بنية تحتية)
- `pwaBootstrap.ts` — حارس إقلاع PWA
- `AuthContext.tsx`, `useLoginForm.ts` — محمية بقاعدة المشروع (ملفات مصادقة)
- `FiscalYearContext.tsx` — Context حساس محمي

## 4. إصلاح اختبار `shows recent notifications`
**السبب الجنائي:** `BeneficiaryNotificationsCard` ملفوف بـ `<DeferredRender delay={500}>` في `BeneficiaryDashboard.tsx`. الاختبار الحالي (سطر 153-156) متزامن ويفشل قبل انقضاء التأخير.

**الإصلاح:**
- إضافة `waitFor` إلى استيرادات `@testing-library/react` (سطر 2)
- جعل الاختبار `async` ولفّ التأكيد بـ `waitFor` مع `timeout: 1000`

## ترتيب التنفيذ
```text
1. حذف مجلدي carryforward/ و notifications/
2. توسعة storage.ts
3. تحويل BetaBanner.tsx + nationalIdLogin.ts + pageMonitor.ts
4. إصلاح اختبار shows recent notifications
5. npx tsc --noEmit نهائي
```

## الملفات المتأثرة

| ملف | إجراء |
|-----|------|
| `src/pages/beneficiary/carryforward/` | حذف |
| `src/pages/beneficiary/notifications/` | حذف |
| `src/lib/storage.ts` | توسعة (3 دوال) |
| `src/components/common/BetaBanner.tsx` | استبدال سطرين |
| `src/lib/auth/nationalIdLogin.ts` | استبدال سطر واحد |
| `src/lib/monitoring/pageMonitor.ts` | استبدال 3 أسطر |
| `src/pages/beneficiary/BeneficiaryDashboard.test.tsx` | إصلاح اختبار واحد |

**صفر تغيير سلوكي. حماية كاملة لـ AuthContext/FiscalYearContext/useLoginForm/lazyWithRetry/pwaBootstrap/diagnostics.**

