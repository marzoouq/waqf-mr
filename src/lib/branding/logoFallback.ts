/** نسخة محلية من شعار الوقف تُستخدم عند تعذّر تحميل الشعار المحفوظ */
export const LOCAL_LOGO_URL = '/logo.png';

/** يستبدل مصدر الصورة بالنسخة المحلية مرة واحدة فقط عند الفشل */
export const handleLogoError = (e: { currentTarget: HTMLImageElement }) => {
  const img = e.currentTarget;
  if (!img.src.endsWith(LOCAL_LOGO_URL)) img.src = LOCAL_LOGO_URL;
};
