

## إصلاح تحذير "session history item added without user interaction"

### التغييرات

**ملفان:**

**1. `src/pages/Index.tsx` (سطر 35, 37, 39)**
```
navigate('/dashboard')       → navigate('/dashboard', { replace: true })
navigate('/waqif')           → navigate('/waqif', { replace: true })
navigate('/beneficiary')     → navigate('/beneficiary', { replace: true })
```

**2. `src/pages/Auth.tsx` (سطر 58, 60, 62)**
نفس النمط — إعادة التوجيه بعد تسجيل الدخول يجب أن تكون `replace` أيضاً:
```
navigate('/beneficiary')     → navigate('/beneficiary', { replace: true })
navigate('/dashboard')       → navigate('/dashboard', { replace: true })
navigate('/waqif')           → navigate('/waqif', { replace: true })
```

### النتيجة
- اختفاء تحذير المتصفح
- زر الرجوع يعمل بشكل طبيعي بدون حلقة مفرغة
- شجرة سجل تصفح أنظف تدعم bfcache

