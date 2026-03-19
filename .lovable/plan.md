

## إصلاح تحذيرات إمكانية الوصول (Accessibility) في حقل المساعد الذكي

### المشكلة
حقل الإدخال في `AiAssistant.tsx` (سطر 277) ينقصه:
1. ربط بـ `<label>` (عبر `id` + `htmlFor` أو تضمين داخل label)
2. سمة `id` أو `name` للتعبئة التلقائية

### التغيير
**ملف: `src/components/AiAssistant.tsx`** (سطر 277):
- إضافة `id="ai-assistant-input"` و `name="ai-assistant-input"` للحقل
- إضافة `<label>` مخفية بصرياً (`sr-only`) مرتبطة بالحقل عبر `htmlFor`

```tsx
<label htmlFor="ai-assistant-input" className="sr-only">اسأل المساعد الذكي</label>
<Input
  id="ai-assistant-input"
  name="ai-assistant-input"
  value={input}
  ...
/>
```

تغيير بسيط — لا تأثير بصري، يُزيل التحذيرات.

