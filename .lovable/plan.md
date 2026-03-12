

# خطة إصلاح المشاكل الحقيقية من التقرير الجنائي المعمّق

## تحليل كل بند

### البنود المحلولة فعلاً (لا تحتاج عمل)

| # | البند | الحقيقة |
|---|-------|---------|
| 1 | getSession في WebAuthn | محلولة — تم التبديل لـ `getUser()` في الرسالة السابقة |
| 3 | state machine advance_requests | محلولة — trigger `trg_validate_advance_status` أُضيف في الرسالة السابقة |
| 4 | نسختان من cron | لا أثر — آخر migration هي النافذة |
| 5 | shareBase vs netAfterZakat | تصميم مقصود وموثّق |
| 6 | signOut لا ينظف volume/preferences | **محلولة فعلاً** — السطران 214-215 في `AuthContext.tsx` يحذفان المفتاحين (أُصلحت في الرسالة السابقة) |

### البنود التي تحتاج إصلاح فعلي

**البند #7 — زر "إرسال التنبيهات" مكسور (🔴 حرج وظيفياً)**
- `CollectionReport.tsx` السطر 188 يستدعي `cron_check_late_payments` كـ RPC
- لكن migration `20260306021503` سحبت صلاحية التنفيذ من `authenticated`
- **الحل**: إعادة منح الصلاحية لدور `admin` فقط عبر GRANT محدد، مع إبقاء REVOKE لباقي الأدوار. الدالة نفسها تتحقق من الدور داخلياً أيضاً.

**البند #9 — auth-options بدون rate limiting (🔴 DoS محتمل)**
- أي شخص بدون مصادقة يستطيع استدعاء `auth-options` آلاف المرات
- كل استدعاء يُدرج سجلاً في `webauthn_challenges`
- **الحل**: إضافة rate limiting باستخدام `check_rate_limit` RPC الموجود في المشروع، بحد 10 طلبات/دقيقة لكل IP

### البنود التي لا تحتاج إصلاح

**البند #2 — font cache في Edge Function**
- التقرير يدّعي أن cache لا يعمل. هذا **غير دقيق**: Deno Deploy يحتفظ بحالة module-level داخل نفس الـ isolate بين الطلبات المتتالية. الـ cache يعمل ضمن الـ warm instance ولا يُعاد تشغيله مع كل طلب. التكلفة فقط عند cold start — وهي مقبولة.

**البند #8 — limit=500 بدون pagination**
- تصميم مقصود لوقف عقاري صغير-متوسط. الحدود مرفوعة حيث يلزم (invoices=1000، accounts=100). لا حاجة لتغيير الآن.

**البند #10 — CORS يقبل أي lovable.app**
- كل Edge Function تتحقق من JWT والدور داخلياً. CORS وحده ليس طبقة أمان — هو حماية للمتصفح فقط. لا خطورة فعلية لأن بدون JWT صالح لن يحصل المهاجم على بيانات.

---

## خطة التنفيذ

### المهمة 1: إصلاح زر إرسال التنبيهات (CollectionReport)
- إضافة migration: `GRANT EXECUTE ON FUNCTION public.cron_check_late_payments() TO authenticated` ثم تعتمد الدالة نفسها على فحص الدور الداخلي (`has_role`)

### المهمة 2: إضافة rate limiting لـ auth-options في WebAuthn
- في `supabase/functions/webauthn/index.ts`: إضافة فحص rate limit قبل معالجة `auth-options`
- استخدام IP من الـ request headers كمفتاح
- الحد: 10 طلبات/دقيقة

---

## التفاصيل التقنية

### Migration SQL
```sql
-- إعادة منح الصلاحية — الدالة تتحقق من الدور داخلياً
GRANT EXECUTE ON FUNCTION public.cron_check_late_payments() TO authenticated;
```

### WebAuthn rate limiting
```text
webauthn/index.ts → قبل auth-options:
1. استخراج IP من x-forwarded-for أو x-real-ip
2. استدعاء admin.rpc('check_rate_limit', { p_key: `webauthn:auth:${ip}`, p_max: 10, p_window_seconds: 60 })
3. لو تجاوز → 429 Too Many Requests
```

