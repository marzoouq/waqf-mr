
# اصلاح 10 بنود من الفحص الجنائي (النسخة النهائية المُدققة)

## ملخص
اصلاح 10 مشاكل حقيقية تم التحقق منها بالكامل مقابل الكود الفعلي، مع تطبيق التعديلات الثلاثة الواجبة من تقرير التحقق.

---

## البند 1: حذف تسريب معلومات داخلية من WebAuthn (امني)
**الملف:** `supabase/functions/webauthn/index.ts` سطر 263
- تغيير الاستجابة من `{ error: "حدث خطأ داخلي", details: String(err) }` الى `{ error: "حدث خطأ داخلي" }` فقط

---

## البنود 2+3+4: اصلاح printShareReport (3 اصلاحات مترابطة)
**الملف:** `src/utils/printShareReport.ts`

### 4a. استبدال Google Fonts بخط Amiri محلي
- حذف سطر `@import url('https://fonts.googleapis.com/css2?family=Amiri&display=swap');`
- اضافة `@font-face` declarations مع مسار **مطلق**: `${window.location.origin}/fonts/Amiri-Regular.woff2` (وليس نسبي، لان النافذة الجديدة `about:blank`)

### 2a. استبدال setTimeout بـ onload (بالترتيب الصحيح)
- تسجيل `printWindow.onload` **قبل** استدعاء `printWindow.document.close()` لضمان عدم فوات الحدث

### 3a. حذف `as any` من سطر 81
- تغيير `(d as any).account?.fiscal_year` الى `d.account?.fiscal_year` (الـ type يحتوي فعلا على `account`)

---

## البند 5: اضافة حد للاستعلام
**الملف:** `src/hooks/useAdvanceRequests.ts` سطر 157
- اضافة `.limit(500)` قبل تنفيذ استعلام `advance_carryforward`

---

## البند 6: تحسين انواع TypeScript في useUpdateAdvanceStatus
**الملف:** `src/hooks/useAdvanceRequests.ts`

### 6a. سطر 203: استبدال `Record<string, any>` بنوع صريح
```text
const updates: { status: string; approved_at?: string; paid_at?: string; rejection_reason?: string } = { status };
```

### 6b. سطر 199: اضافة `beneficiary_user_id` و `amount` للـ destructuring
```text
mutationFn: async ({ id, status, rejection_reason, beneficiary_user_id, amount }: { ... })
```
ثم حذف `as any` من السطرين 229-230 واستخدام المتغيرات مباشرة

---

## البند 7: توحيد التسجيل (logging)
**الملف:** `src/hooks/useBeneficiaries.ts`
- اضافة `import { logger } from '@/lib/logger';`
- سطر 49: تغيير `console.warn(...)` الى `logger.warn(...)`

---

## البند 8: تحسين type safety في useWebAuthn
**الملف:** `src/hooks/useWebAuthn.ts`

### 8a. سطر 12: اضافة interface واستبدال `any[]`
```text
interface WebAuthnCredential { id: string; device_name: string; created_at: string; }
useState<WebAuthnCredential[]>([])
```

### 8b. سطر 77: تغيير `catch (err: any)` مع narrowing يشمل DOMException
```text
} catch (err: unknown) {
  const name = err instanceof DOMException || err instanceof Error ? err.name : '';
  const message = err instanceof Error ? err.message : 'خطأ غير معروف';
  console.error('WebAuthn registration error:', err);
  if (name === 'NotAllowedError') { ... }
  else if (name === 'SecurityError') { ... }
  else if (name === 'InvalidStateError') { ... }
  else { toast.error(`... ${message}`); }
}
```

### 8c. سطر 136: نفس التحسين للـ catch الثاني

---

## البند 9: تحديث plan.md
**الملف:** `.lovable/plan.md`
- تحديث المحتوى ليعكس الحالة الفعلية للنظام بعد كل الاصلاحات

---

## البند 10: توثيق `as any` الضروري
**الملف:** `src/hooks/useDistribute.ts` سطر 44
- اضافة تعليق: `// as any required: Supabase RPC accepts jsonb, TypeScript cannot type this`

---

## ترتيب التنفيذ
1. WebAuthn edge function (امني - ملف واحد)
2. printShareReport (3 اصلاحات مترابطة)
3. useAdvanceRequests (limit + typing)
4. useBeneficiaries (logger)
5. useWebAuthn (type safety)
6. useDistribute (تعليق)
7. plan.md (تنظيف)
