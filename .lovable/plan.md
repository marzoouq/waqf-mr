

# خطة الإصلاح النهائية

## التغييرات (4 ملفات)

### 1. `.gitignore` — إضافة حماية `.env`
إضافة:
```
.env
.env.*
!.env.example
bun.lockb
```

### 2. حذف `bun.lockb`
حذف الملف الثنائي القديم.

### 3. `.github/workflows/test.yml` — تحديث أمر التثبيت
```yaml
# من:
npm install --legacy-peer-deps
# إلى:
npm ci --legacy-peer-deps
```
`npm ci` أسرع وأدق في CI لأنه يستخدم `package-lock.json` مباشرة، مع الإبقاء على `--legacy-peer-deps` كما اقترحت لتجنب كسر البناء.

### 4. إنشاء `supabase/functions/README.md`
توثيق أمني قصير يوضح أن جميع Edge Functions تعمل بـ `verify_jwt = false` وأن كل function جديدة **يجب** أن تتضمن تحقق يدوي من JWT عبر `supabase.auth.getUser()`.

