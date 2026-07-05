## خطة التحقق من نجاح النشر

### الخطوات

1. **فحص استجابة الموقع**  
   - `curl -I https://waqf-wise.net` للتأكد من status 200 وheaders صحيحة (CDN, cache)
   - التأكد من تحميل `index.html` والأصول الرئيسية

2. **فحص بصري عبر Playwright**  
   - فتح https://waqf-wise.net بـ headless Chromium (viewport 1280×1800)
   - انتظار `networkidle` والتقاط screenshot لصفحة الهبوط
   - الانتقال إلى `/auth` والتقاط screenshot
   - قراءة console errors وnetwork failures

3. **التحقق من الـ Backend**  
   - مراقبة نداء `app_settings` و`get_public_stats` من الصفحة الحية (200 OK)
   - التأكد من أن سياسات storage للفواتير طُبّقت فعلياً على production عبر `supabase--read_query` على `pg_policies`

4. **إعادة تشغيل الفاحص الأمني**  
   - `security--run_security_scan` للتأكد من عدم عودة أي critical finding بعد النشر

### النتيجة المتوقعة
تقرير موجز يؤكد:
- الموقع live ويستجيب
- لا console/network errors حرجة
- سياسات storage نُظّفت على production
- لا findings حرجة نشطة
