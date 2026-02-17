

# تحديث دالة check-contract-expiry

## التغيير المطلوب
استبدال `getUser()` بـ `getClaims()` في سطر 29 لتوحيد نمط المصادقة مع بقية الدوال البرمجية (admin-manage-users, ai-assistant, auto-expire-contracts).

## التفاصيل التقنية

### ما سيتغير (سطور 25-43):

**قبل:**
```typescript
const userClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
});

const { data: { user }, error: userError } = await userClient.auth.getUser();
if (userError || !user) { ... }

const adminClient = createClient(supabaseUrl, serviceKey);
const { data: roleData } = await adminClient
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .eq("role", "admin")
  .maybeSingle();
```

**بعد:**
```typescript
const userClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
});

const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }

const userId = claimsData.claims.sub as string;

const adminClient = createClient(supabaseUrl, serviceKey);
const { data: roleData } = await adminClient
  .from("user_roles")
  .select("role")
  .eq("user_id", userId)
  .eq("role", "admin")
  .maybeSingle();
```

### الفوائد:
- **أداء اسرع**: `getClaims()` يتحقق من التوكن محلياً بدون طلب شبكي اضافي
- **توحيد النمط**: جميع الدوال الخمس ستستخدم نفس آلية المصادقة
- **لا تغيير في المنطق**: باقي الدالة (فحص العقود، ارسال الاشعارات) يبقى كما هو

### الملف المتأثر:
| الملف | التغيير |
|-------|---------|
| supabase/functions/check-contract-expiry/index.ts | استبدال getUser بـ getClaims (سطور 25-35) |

