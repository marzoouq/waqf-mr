

# خطة إصلاح نتائج الفحص الشامل

## توضيحات مهمة أولاً

**بخصوص ملف `.env`**: هذا الملف يُدار تلقائياً بواسطة Lovable Cloud ولا يمكن تعديله يدوياً. المفاتيح الموجودة فيه هي **مفاتيح عامة (publishable)** مصممة للاستخدام من جانب العميل — الحماية الفعلية مطبقة عبر RLS. لا توجد مشكلة أمنية حقيقية هنا.

**بخصوص `verify_jwt = false`**: هذا مطلوب في config.toml لأن التحقق يتم يدوياً داخل كل دالة عبر `supabase.auth.getUser()` — وهو النمط المُوصى به في Lovable Cloud.

---

## التغييرات المطلوبة فعلياً

### 1. تغيير اسم المشروع في `package.json`
- السطر 2: `"name": "vite_react_shadcn_ts"` → `"name": "waqf-mr"`

### 2. استبدال `console.error` بـ `logger.error` (3 ملفات)

**`src/hooks/useContractAllocations.ts`** (سطر 60):
```typescript
logger.error('Allocation error:', error.message);
```

**`src/hooks/useAccountsPage.ts`** (أسطر 145, 338, 380):
استبدال 3 استخدامات لـ `console.error` بـ `logger.error`

### 3. إزالة دالة `statusLabel` المجوفة في `src/utils/pdf/entities.ts`
- السطر 141: `const statusLabel = (s: string) => s;` — دالة بلا فائدة، غير مُستخدَمة. حذفها.

### 4. استبدال `hookData: any` بنوع صريح في ملفات PDF (3 مواضع)

**`src/utils/pdf/accounts.ts`** و **`src/utils/pdf/comprehensiveBeneficiary.ts`**:
```typescript
didParseCell: (hookData: { section: string; row: { index: number }; cell: { styles: Record<string, unknown> } }) => {
```

### 5. تعريف نوع صريح لـ `payload` في `auth-email-hook`

**`supabase/functions/auth-email-hook/index.ts`** (سطر 140):
```typescript
let payload: { type?: string; user?: Record<string, unknown>; [key: string]: unknown }
```

### 6. تأمين WebAuthn Fallback

**`supabase/functions/webauthn/index.ts`** (أسطر 223-232):
إضافة فلتر `user_id` للـ Fallback لمنع جلب تحدٍّ لمستخدم آخر:
```typescript
// Fallback — مقيد بالمستخدم
const { data } = await admin
  .from("webauthn_challenges")
  .select("id, challenge")
  .eq("type", "authentication")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();
```

---

## ملخص

| الملف | التغيير |
|-------|---------|
| `package.json` | اسم المشروع |
| `useContractAllocations.ts` | `console.error` → `logger.error` |
| `useAccountsPage.ts` | 3× `console.error` → `logger.error` |
| `pdf/entities.ts` | حذف `statusLabel` المجوفة |
| `pdf/accounts.ts` | نوع صريح لـ `hookData` |
| `pdf/comprehensiveBeneficiary.ts` | نوع صريح لـ `hookData` (2 موضع) |
| `auth-email-hook/index.ts` | نوع صريح لـ `payload` |
| `webauthn/index.ts` | تأمين Fallback بفلتر `user_id` |

**ملاحظة**: مشاكل `.env` و `.gitignore` و `bun.lockb` لا تنطبق على بيئة Lovable Cloud — هذه ملفات مُدارة تلقائياً.

