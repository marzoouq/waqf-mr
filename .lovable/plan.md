

# تقرير الفحص الجنائي الشامل — مستودع waqf-mr

## المنهجية
فحص يدوي معمّق لكل بند: المصادقة، التفويض، حماية البيانات، CORS، Rate Limiting، معالجة الأخطاء، الواجهة الأمامية، وسلامة المنطق.

---

## 1. المصادقة (Authentication)

### ✅ نتائج إيجابية
- **جميع Edge Functions** تستخدم `getUser()` للتحقق من الخادم — لا يوجد استخدام `getSession()` في أي مكان
- **لا يوجد** استخدام لـ `getSession()` في الكود الأمامي (تم التأكد بالبحث regex)
- **AuthContext** مصمم بشكل سليم: فصل `onAuthStateChange` عن `fetchRole`، safety timeout 3 ثوانٍ، حماية ضد duplicate events
- **ProtectedRoute** يتعامل مع حالة `role=null` بـ auto-logout بعد 10 ثوانٍ
- **guard-signup** يستخدم `email_confirm: false` + rollback عند فشل تعيين الدور

### ⚠️ ملاحظة واحدة
- **`ai-assistant` السطر 95**: يطبع `userData.user.id` في `console.error` — هذا UUID وليس PII مباشر، لكن يُفضّل حذفه في الإنتاج. **خطورة: منخفضة**.

---

## 2. التفويض (Authorization)

### ✅ نتائج إيجابية
- **كل Edge Function** تتحقق من الدور بعد التحقق من الهوية عبر `user_roles`
- **admin-manage-users**: يتحقق `admin` فقط عبر service role client
- **zatca-api/signer/xml-generator**: يتحقق `admin` أو `accountant`
- **generate-invoice-pdf**: يتحقق `admin` أو `accountant`
- **check-contract-expiry**: يقبل service_role (cron) أو admin مع timing-safe comparison
- **lookup-national-id**: لا يتطلب مصادقة (مقصود — للبحث قبل تسجيل الدخول) لكنه محمي بـ rate limiting صارم + timing attack mitigation + anti-enumeration
- **RLS على user_roles**: سياسات RESTRICTIVE تمنع privilege escalation ✅

### ✅ لا ثغرات مكتشفة
- لا يوجد تخزين أدوار في localStorage/sessionStorage
- لا يوجد hardcoded credentials

---

## 3. حماية البيانات (Data Protection)

### ✅ نتائج إيجابية
- **beneficiaries_safe** view مع security_barrier + PII masking
- **ai-assistant** يفرّق بين admin وbeneficiary — المستفيد يرى بياناته فقط، لا يرى تفاصيل العقود أو أسماء المستأجرين
- **lookup-national-id** يُرجع `masked_email` فقط + anti-enumeration (يُرجع `found: true` حتى للهويات غير الموجودة)
- **safeErrorMessage** يحوّل أخطاء DB التقنية لرسائل عامة
- **logger** يُسكت كل شيء ما عدا الأخطاء في production + يُسجل client_error في access_log
- **ErrorBoundary** يحذف stack traces في production

### ⚠️ ملاحظة
- **ai-assistant** يمرر بيانات الوقف المالية كاملة إلى نموذج AI خارجي (Lovable AI Gateway). هذا مقبول لأن البيانات تمر عبر RLS وتُفلتر حسب الدور، لكن يجب الوعي بأن البيانات المالية تُرسل لطرف ثالث. **خطورة: مقبولة (تصميم مقصود)**.

---

## 4. CORS

### ✅ ممتاز
- **cors.ts** يستخدم whitelist صارمة: النطاقات المحددة + regex مقيّد بـ project UUID فقط
- كل response يتضمن CORS headers
- OPTIONS مُعالج في كل function

---

## 5. Rate Limiting

### ✅ شامل
| Function | الحد | النافذة |
|---|---|---|
| guard-signup | 5 | 60s (by IP) |
| admin-manage-users | 60 | 60s (by user) |
| ai-assistant | 30 | 60s (by user) |
| zatca-api | 30 | 60s (by user) |
| zatca-xml-generator | 30 | 60s (by user) |
| zatca-signer | 20 | 60s (by user) |
| generate-invoice-pdf | 10 | 60s (by user) |
| webauthn | 10 | 60s (by user) |
| lookup-national-id | 5 | 180s (by IP) + progressive delay |

- **Fail-closed**: عند فشل `check_rate_limit` يُرفض الطلب (503)
- **rate_limits table**: محمي بـ RLS `false` — لا وصول مباشر

---

## 6. معالجة الأخطاء

### ✅ نتائج إيجابية
- **كل Edge Function** تلتف بـ try/catch شامل ويُرجع رسالة عامة
- **ErrorBoundary** يتعامل مع chunk errors (تحديث PWA) بشكل خاص
- **lazyWithRetry** يحاول مرة واحدة مع مسح الكاش قبل الفشل النهائي
- **logAccessEvent** يفشل بصمت — لا يعيق تدفق المستخدم

### ⚠️ ملاحظة صغيرة
- **zatca-signer السطر 768**: يكشف `signErr.message` في الاستجابة (`فشل التوقيع: ${signErr.message}`). هذا مقبول لأنه admin-only endpoint، لكن رسائل خطأ المكتبات الداخلية قد تكشف تفاصيل تقنية. **خطورة: منخفضة جداً** (admin فقط).

---

## 7. الواجهة الأمامية (Frontend Security)

### ✅ نتائج إيجابية
- **لا يوجد `eval()`** في أي مكان
- **`dangerouslySetInnerHTML`** يُستخدم فقط في:
  - `chart.tsx` — CSS themes ثابتة (آمن)
  - `Index.tsx` — JSON-LD structured data عبر `JSON.stringify()` (آمن — لا يقبل مدخلات مستخدم)
- **SecurityGuard** يمنع copy/drag/select/contextmenu على عناصر `[data-sensitive]`
- **IdleTimeoutWarning** مع تسجيل خروج تلقائي
- **signOut** ينظف localStorage/sessionStorage/queryClient بالكامل

---

## 8. سلامة ZATCA (Invoice Chain Integrity)

### ✅ ممتاز
- **Atomic ICV allocation** عبر RPC `allocate_icv_and_chain`
- **Rollback** عند فشل التوقيع — يحذف سجل PENDING من invoice_chain
- **Double-sign prevention** (GAP-12): يرفض إذا `invoice_hash` موجود
- **PENDING filtering**: `zatca-xml-generator` يتجاهل سجلات PENDING عند حساب PIH
- **Pre-sign validation**: يتحقق من اتساق المبالغ قبل التوقيع
- **CHECK CONSTRAINT** يمنع تفعيل شهادات PLACEHOLDER في الإنتاج

---

## 9. PWA و Cache Management

### ✅ سليم
- **main.tsx** يكتشف تغيير الإصدار ويمسح الكاش + يعيد تحميل الصفحة
- **Preview hosts** تتجاوز الكاش دائماً
- **PwaUpdateNotifier + SwUpdateBanner** لإشعار المستخدم بالتحديثات

---

## 10. Audit Trail (سجل التدقيق)

### ✅ ممتاز
- **access_log**: محمي ضد INSERT/UPDATE/DELETE من المستخدمين (RLS `false`)
- **access_log_archive**: نفس الحماية
- **أحداث مُسجّلة**: login_failed, login_success, logout, unauthorized_access, idle_logout, role_fetch, client_error, diagnostics_run
- **Security alerts**: كشف جهاز جديد عند تسجيل الدخول + إشعار المستخدم والناظر

---

## الخلاصة التنفيذية

```text
╔══════════════════════════════╦════════╗
║ البند                        ║ الحالة  ║
╠══════════════════════════════╬════════╣
║ المصادقة (getUser everywhere) ║  ✅    ║
║ التفويض (RBAC + RLS)         ║  ✅    ║
║ CORS (strict whitelist)       ║  ✅    ║
║ Rate Limiting (fail-closed)   ║  ✅    ║
║ حماية البيانات (PII masking)  ║  ✅    ║
║ معالجة الأخطاء                ║  ✅    ║
║ سلامة ZATCA                   ║  ✅    ║
║ PWA/Cache                     ║  ✅    ║
║ Audit Trail                   ║  ✅    ║
║ Frontend (no XSS/eval)        ║  ✅    ║
╠══════════════════════════════╬════════╣
║ ثغرات حرجة                   ║  0     ║
║ ثغرات متوسطة                  ║  0     ║
║ ملاحظات منخفضة الخطورة        ║  2     ║
╚══════════════════════════════╩════════╝
```

### الملاحظات المنخفضة (اختيارية):
1. **ai-assistant السطر 95**: حذف `userData.user.id` من `console.error`
2. **zatca-signer السطر 768**: تعميم رسالة خطأ التوقيع بدلاً من كشف `signErr.message`

### الحكم النهائي:
**المشروع آمن ومحصّن بشكل ممتاز.** لا توجد ثغرات حرجة أو متوسطة. البنية الأمنية متعددة الطبقات (RLS + getUser + Rate Limiting + CORS + Audit) تعمل بتناسق عالٍ.

---

## حالة التنفيذ — مارس 2026

| # | الإصلاح | الحالة |
|---|---------|--------|
| 1 | حذف UUID من console.error في ai-assistant | ✅ تم |
| 2 | تعميم رسالة خطأ التوقيع في zatca-signer | ✅ تم |
| 3 | إضافة bun.lock إلى .gitignore | ✅ تم |
| 4 | حذف bun.lock من Git tracking (يدوي) | ✅ تم |
| 5 | تقييد سياسة advance_carryforward لـ authenticated | ✅ تم |
| 6 | تعزيز GRANT/REVOKE على العروض الآمنة | ✅ تم |
| 7 | تحليل Security Definer Views — التصميم الحالي مقصود وآمن | ✅ موثّق |

**ملاحظة بند 7**: تحويل العروض لـ `security_invoker=true` يتطلب `GRANT SELECT` على الجداول الأصلية، مما يُتيح للمستفيد/الواقف تجاوز العرض والوصول لبيانات PII الخام. التصميم الحالي (`security_definer` + `security_barrier` + `CASE WHEN` masking + `GRANT SELECT TO authenticated` فقط على العرض) هو النمط الأصح لحماية الخصوصية.



**الحالة النهائية: جميع البنود مكتملة — لا توجد إجراءات معلّقة.**

