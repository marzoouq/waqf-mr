# خطة إصلاح مركز تشخيص النظام والأخطاء الحيّة

## نتائج الفحص المباشر (تم التحقق من DB)

استعلمت `access_log` مباشرةً لـ `event_type = client_error`:

| المؤشر | القيمة |
|---|---|
| إجمالي السجلات | **1,114** |
| ضجيج اختبار (`Test explosion` + `Test route explosion`) | **904** (81%) |
| آخر 7 أيام | 10 |
| آخر 24 ساعة | **3** فقط |
| مفتاح الرسالة الفعلي في metadata | `error_message` (1,062 سجل) |
| مفتاح `message` الذي يقرأه الـ Panel حالياً | 52 سجل فقط |

### الأسباب الجذرية لظهور «(100)»
1. **`useClientErrors`** يستخدم `.limit(100)` والعنوان يعرض `data.length` → دائماً يقف عند 100.
2. **`RuntimeErrorsPanel`** يقرأ `metadata->>'message'` بينما 95% من السجلات تستخدم `error_message` → معظم الصفوف تعرض «(no msg)».
3. **لا فلتر لضجيج الاختبار** → 904 سجل قديم يطمس 210 سجلاً حقيقياً.
4. **فحص `runtime_errors_log`** في مركز التشخيص يقرأ من `sessionStorage` فقط (client-side) — لا يعكس ما هو مسجَّل في السيرفر.

## نطاق الإصلاح — واجهة وقراءات فقط

### 1) `src/hooks/data/audit/useClientErrors.ts` (34 → ~70 سطر)
- إرجاع `{ rows, totalCount, testNoiseCount, last24hCount }`.
- استعلامات متوازية عبر `Promise.all`:
  - `select('id', { count: 'exact', head: true })` للإجمالي.
  - نفس الشيء مع فلتر `Test %` لعدد الضجيج.
  - نفس الشيء لآخر 24 ساعة.
  - `select(..., limit 200)` مع فلتر يستبعد `Test %` افتراضياً (يُعطَّل بـ `includeTestNoise=true`).
- توسيع نوع `ClientError.metadata` وقراءته آمن.

### 2) `src/components/diagnostics/RuntimeErrorsPanel.tsx` (102 → ~160 سطر)
- استخراج الرسالة: `error_message` → `message` → `error_name` → «(بدون رسالة)».
- استخراج stack: `error_stack` → `stack` → `component_stack`.
- عنوان اللوحة: `الأخطاء الحيّة (Nإجمالي • آخر 24س: X • معروض: M)` مع شارة «ضجيج مُخفي: K».
- Switch «تضمين ضجيج الاختبار» (افتراضياً معطَّل).
- تحسين `classify()` باستخدام `error_name` أولاً: `TypeError`, `ReferenceError`, `ChunkLoadError`, `NetworkError`, `AbortError`.
- عمودان لكل مجموعة: أول ظهور + آخر ظهور + عدد.
- لا تغيير على التصميم/الألوان — نفس مكونات shadcn الحالية.

### 3) `src/lib/diagnostics/checks/runtimeErrors.ts` (20 → ~40 سطر)
- يقرأ من **runtimeCollector** (client) *و* يستدعي `useClientErrors` منطق العدّ (server) لآخر 24 ساعة عبر استعلام مباشر.
- عتبات جديدة (بعد تجاهل الضجيج):
  - server 0 + client 0 → `pass`
  - client ≤3 أو server ≤5/24س → `warn`
  - أكثر من ذلك → `fail`

### 4) تحقق تغطية مركز التشخيص — بدون إضافة فحوصات
- سأشغّل `runAllDiagnostics` عبر Playwright headless مع جلسة الناظر المدارة (`LOVABLE_BROWSER_AUTH_STATUS=injected`) وأحفظ:
  - `audit/diagnostics-live-run.json` — النتيجة الكاملة.
  - `audit/diagnostics-coverage-report.md` — مصفوفة (14 بطاقة × جميع الصفحات في `src/routes/*Routes.tsx`) مع تعليم أي فجوة.
- أشغّل `checkAppMapPagesReachable` و `checkAppMapRouteRoleSync` وأعرض النتائج.
- **لا إضافة فحوصات جديدة** إلا إذا كشف التحقق فجوة حقيقية — سأعرضها للموافقة قبل التنفيذ في خطة منفصلة.

### 5) تنظيف اختياري لضجيج الاختبار (يتطلب موافقتك)
Migration واحدة تحذف 904 سجل ضجيج فقط:
```sql
DELETE FROM public.access_log 
WHERE event_type = 'client_error'
  AND (metadata->>'error_message' ILIKE 'Test %' 
    OR metadata->>'message' ILIKE 'Test %');
```
**لن تُنفَّذ إلا إذا قلت «نعم للتنظيف».** بدونها، الفلتر في الواجهة كافٍ.

## أدوات ستُستخدم في التنفيذ (Build mode)
| الأداة | الغرض |
|---|---|
| `code--view`, `code--line_replace`, `code--write` | تعديل 3 ملفات فقط |
| `supabase--read_query` | التحقق من نتائج فلاتر SQL قبل تجميدها |
| `code--exec` (Playwright) | تشغيل مركز التشخيص headless بجلسة الناظر |
| `lovable-exec test` (Vitest) | التأكد من عدم كسر 2181 اختباراً + إضافة اختبار لـ `useClientErrors` |
| `supabase--migration` | فقط إذا وافقت على تنظيف الضجيج |

## ما لن يتغيّر (ضمانات)
- لا تعديل على: `AuthContext`, `ProtectedRoute`, `SecurityGuard`, `client.ts`, `types.ts`, `config.toml`, `.env`.
- لا تغيير في التصميم/الألوان/التخطيط.
- لا تعديل RLS أو سياسات التخزين (السياسات الحالية على `access_log` كافية للناظر).
- لا حذف كود موجود بلا سبب.
- لا مساس بأي صفحة أخرى غير `SystemDiagnosticsPage` وأدواته.

## معايير القبول
1. عنوان اللوحة يعرض **1,114** (الإجمالي الحقيقي) و**3** (آخر 24س) و**904** (ضجيج مُخفي).
2. كل صف يعرض رسالة الخطأ الحقيقية بدل «(no msg)».
3. Switch يُظهر/يُخفي ضجيج الاختبار.
4. فحص `runtime_errors_log` في المركز يعكس آخر 24س من السيرفر.
5. تقرير `audit/diagnostics-coverage-report.md` موجود ويوثّق تغطية الـ14 بطاقة لكل الصفحات.
6. `tsgo` نظيف + كل اختبارات Vitest تمر (2181+) + اختبار جديد لـ `useClientErrors` يمر.
