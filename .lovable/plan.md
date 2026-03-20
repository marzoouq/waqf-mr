

# خطة تنفيذ إصلاح المشاكل الأربع المكتشفة

---

## المشكلة 1: سياسة SELECT على حزمة `invoices` فضفاضة

**السيناريو:** مستفيد مصادق يستطيع قراءة فواتير عقود لا تخصه عبر `storage.objects` — السياسة الحالية `Authenticated users can view invoices` تسمح لأي مستخدم مصادق.

**الحل:** حذف السياسة الفضفاضة. يبقى `Accountants can read invoices` + `Admins can upload invoices` (admin لديه INSERT/UPDATE/DELETE = ضمنياً SELECT عبر الرفع). نضيف سياسة SELECT للأدمن صريحة.

**Migration SQL:**
```sql
DROP POLICY "Authenticated users can view invoices" ON storage.objects;
CREATE POLICY "Admins can read invoices" ON storage.objects
  FOR SELECT USING (bucket_id = 'invoices' AND has_role(auth.uid(), 'admin'));
```

---

## المشكلة 2: حزمة `invoices` بدون تقييد MIME types

**السيناريو:** رغم التحقق من magic bytes في الواجهة، يمكن لمحاسب/أدمن تجاوز الواجهة ورفع ملف تنفيذي عبر API مباشر.

**الحل:** تقييد `allowed_mime_types` على الحزمة.

**Migration SQL:**
```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp']
WHERE id = 'invoices';
```

---

## المشكلة 3: إضافة Caching للمساعد الذكي (EF-02)

**السيناريو:** محادثة من 5 رسائل في دقيقة = 45 استعلام DB بلا داعٍ (9 × 5).

**الحل:** إضافة `SimpleCache` (Map + TTL 5 دقائق + حد 50 مدخل) في أعلى `supabase/functions/ai-assistant/index.ts`:

```typescript
// ─── Cache بسيط في الذاكرة ───
class SimpleCache {
  private cache = new Map<string, { data: string; ts: number }>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(ttlMs = 300_000, maxSize = 50) {
    this.ttl = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: string): void {
    if (this.cache.size >= this.maxSize) {
      // حذف الأقدم (أول مدخل)
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, ts: Date.now() });
  }
}

const dataCache = new SimpleCache();
```

ثم في `fetchWaqfData` (سطر 88):
```typescript
const cacheKey = `${userData.user.id}:${userRole}`;
let dataContext = dataCache.get(cacheKey);
if (!dataContext) {
  dataContext = await fetchWaqfData(userClient, userRole, userData.user.id);
  dataCache.set(cacheKey, dataContext);
}
```

---

## المشكلة 4: نطاق CORS قديم

**السيناريو:** `waqf-mr.lovable.app` نطاق قديم — إذا تم اختطافه نظرياً يمكنه إرسال طلبات CORS.

**الحل:** في `supabase/functions/_shared/cors.ts`:
- حذف `"https://waqf-mr.lovable.app"` من `ALLOWED_ORIGINS`
- تحديث fallback default إلى `"https://waqf-wise-net.lovable.app"`

---

## ملخص الملفات المتأثرة

| # | الملف | التغيير |
|---|-------|---------|
| 1-2 | Migration SQL | حذف سياسة Storage + تقييد MIME + إضافة سياسة admin SELECT |
| 3 | `supabase/functions/ai-assistant/index.ts` | إضافة SimpleCache class + استخدامه قبل fetchWaqfData |
| 4 | `supabase/functions/_shared/cors.ts` | حذف النطاق القديم + تحديث fallback |

