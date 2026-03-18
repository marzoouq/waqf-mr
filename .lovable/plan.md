

## خطة التنفيذ — إصلاح أخطاء البناء في `auth-email-hook` + تطبيق الهجرة

### البند 1: تطبيق الهجرة على قاعدة البيانات الحية

تنفيذ محتوى `20260318102000_fix_safe_views_remove_security_invoker.sql` عبر أداة الهجرة. الملف مكتمل ولا يحتاج تعديل.

### البند 2: إصلاح أخطاء TypeScript في `auth-email-hook/index.ts`

**تغيير 1** — سطر 23: تغيير نوع `EMAIL_TEMPLATES`:
```typescript
// من:
const EMAIL_TEMPLATES: Record<string, React.ComponentType<Record<string, unknown>>> = {
// إلى:
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
```

**تغيير 2** — سطر 140-149: توسيع نوع `payload` واستخدام `??` لـ `run_id`:
```typescript
// من:
let payload: { type?: string; user?: Record<string, unknown>; run_id?: string; [key: string]: unknown }
let run_id = ''
...
payload = verified.payload
run_id = payload.run_id

// إلى:
let payload: any
let run_id = ''
...
payload = verified.payload
run_id = payload.run_id ?? ''
```

هذان التغييران يحلان جميع أخطاء الـ 17 المتعلقة بـ `auth-email-hook`:
- أخطاء `ComponentType` (6 أخطاء) → تغيير 1
- خطأ `React.createElement` (1) → تغيير 1
- خطأ `EmailWebhookPayload` (1) → تغيير 2
- خطأ `run_id undefined` (1) → تغيير 2
- أخطاء `payload.data unknown` (8) → تغيير 2

> أخطاء `zatca-api` و `webauthn` موجودة مسبقاً وغير مرتبطة.

