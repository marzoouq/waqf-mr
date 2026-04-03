

## تشخيص المشكلة

### السبب الجذري
في `LoginForm.tsx` سطر 202، زر تسجيل الدخول معطّل بشرط:
```
disabled={isLoading || loading}
```

المتغير `loading` يأتي من `AuthContext` ويبدأ بقيمة `true` (سطر 49 في AuthContext.tsx):
```typescript
const [loading, setLoading] = useState(true);
```

هذا يعني أن الزر **معطّل تماماً** منذ تحميل الصفحة حتى يكتمل فحص حالة المصادقة (`onAuthStateChange` → `INITIAL_SESSION`). إذا كان هناك أي تأخير في الاتصال بقاعدة البيانات، يبقى الزر معطّلاً لثوانٍ — المستخدم يملأ البيانات لكن الزر لا يستجيب.

### مشكلة ثانوية (بصرية)
الزر المعطّل يستخدم `gradient-primary` لكن `disabled:opacity-50` من buttonVariants قد لا يكون واضحاً كفاية — المستخدم لا يدرك أن الزر معطّل.

---

## خطة الإصلاح

### 1. فصل حالة التحميل في LoginForm
**الملف:** `src/components/auth/LoginForm.tsx`

تغيير الزر من:
```
disabled={isLoading || loading}
```
إلى:
```
disabled={isLoading}
```

هذا يجعل الزر قابلاً للنقر فوراً بعد تحميل الصفحة. دالة `signIn` في AuthContext ستتولى إدارة `loading` داخلياً بعد الضغط.

### 2. إضافة مؤشر بصري واضح للزر المعطّل
**الملف:** `src/index.css`

إضافة قاعدة CSS لحالة `disabled` على `.gradient-primary`:
```css
.gradient-primary:disabled {
  background: hsl(var(--muted));
  cursor: not-allowed;
  opacity: 0.6;
}
```

### 3. ضمان أن النص يعكس الحالة الصحيحة
الزر يعرض حالياً "جاري تسجيل الدخول..." فقط عند `isLoading` — وهذا صحيح. لا تغيير مطلوب هنا.

---

## ملخص التأثير
- **قبل:** الزر معطّل لعدة ثوانٍ عند فتح صفحة تسجيل الدخول بسبب انتظار فحص الجلسة
- **بعد:** الزر جاهز فوراً — المستخدم يملأ البيانات ويضغط دون انتظار
- **الأمان:** لا تأثير — `signIn` يتعامل مع المصادقة بشكل مستقل عن حالة `loading`

