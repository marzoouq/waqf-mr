# تقرير الفحص الأمني الشامل — 2026-08-23

المصادر: فاحص تبعيات Lovable (قاعدة بيانات GitHub Advisory / OSV — مكافئ Dependabot)، فاحص الكود وقاعدة البيانات (Supabase linter + supabase_lov)، ومراجعة سياسات التخزين مباشرة من `pg_policies`.

ملاحظة: `npm audit` المحلي غير متاح داخل البيئة (مرآة الحزم لا تدعم نقطة نهاية التدقيق)، لذا اعتُمد فاحص التبعيات المُدار الذي يقرأ من نفس قواعد بيانات الثغرات.

## 1) التبعيات

| النتيجة | القيمة |
|---|---|
| ثغرات حرجة (critical) | 0 |
| ثغرات عالية (high) | 0 |
| ثغرات متوسطة/منخفضة مفتوحة | 0 مُبلَّغة من الفاحص |

### الثغرات التي أُغلقت بعد التحديثات

| # | الثغرة | الحزمة | قبل | بعد | الخطورة | الحالة |
|---|---|---|---|---|---|---|
| 1 | React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response | `react-router-dom` / `react-router` | 7.18.1 | 7.18.2 | عالية (high) | مُغلقة |
| 2 | DOMPurify: IN_PLACE hook removal leaves a detached subtree executable (XSS) | `dompurify` (تابعة لـ `jspdf`) | 3.4.11 | 3.4.14 (override/resolution) | متوسطة (moderate) | مُغلقة |

الأثر: انخفض عدد الثغرات المعروفة من **2 (1 عالية + 1 متوسطة)** إلى **0**. لا ثغرات عالية أو حرجة متبقية.

تحقق الإصدارات في `package.json`:
- `react-router-dom: ^7.18.2`
- `dompurify: 3.4.14` (في `overrides` و`resolutions`)
- كلا ملفي القفل (`bun.lock` النصي و`package-lock.json`) محدَّثان، والبناء والأنواع نظيفة.

ملاحظة حول React Router: الثغرة تخص وضع RSC؛ التطبيق يستخدم `react-router-dom` في وضع SPA فقط، فالتعرض كان نظرياً — ومع ذلك تم التحديث.

## 2) الكود وقاعدة البيانات

| العنصر | النتيجة |
|---|---|
| جداول بدون RLS | 0 |
| فحص الموصلات (connectors) | 0 ملاحظات |
| App MCP | 0 ملاحظات |
| ملاحظات Supabase linter | 3 (SECURITY DEFINER views/functions) — مراجعة سابقاً ومقصودة (`contracts_safe`, دوال `has_role`/التقارير) |

### ملاحظات تخزين الفواتير (تم إصلاحها فعلياً)

بلّغ الفاحص عن سياستَي قراءة واسعة على حاوية `invoices`:
- `Authenticated users can view invoices` (خطأ)
- `Role-based users can view invoices` (تحذير)

التحقق المباشر من `pg_policies` يُظهر أن **أي سياسة SELECT على حاوية `invoices` لم تعد موجودة**؛ حُذفت في الترحيل السابق. لم يتبقَّ إلا سياسات الرفع/التعديل/الحذف للناظر والمحاسب. بذلك النتيجتان أعلاه مخلَّفات من لقطة سابقة للفاحص (false positives).

المسار الحالي للتنزيل: Edge Function `invoice-file-url` تتحقق خادمياً من الجلسة والدور والسنة المالية المنشورة وحجب IP وحد المعدل (30/دقيقة)، ثم تُصدر رابطاً موقّعاً 120 ثانية وتُسجّل كل محاولة في `access_log` (`invoice_download` / `invoice_download_denied`).

## 3) الحكم

- التبعيات: نظيفة (0 عالية/حرجة) بعد إغلاق ثغرتَي `react-router` و`dompurify`.
- التخزين: القراءة المباشرة من المتصفح مُغلقة كلياً؛ التنزيل خادمي مُدقَّق.
- المتبقي: ملاحظات SECURITY DEFINER المقصودة والموثقة، ولا إجراء مطلوب.
