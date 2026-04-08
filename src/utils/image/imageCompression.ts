/**
 * ضغط الصور قبل رفعها للتخزين — يقلل الحجم بنسبة 40-70%
 * يدعم JPEG و PNG و WebP — يتجاوز ملفات PDF
 */

/** الحد الأقصى لأبعاد الصورة بعد الضغط */
const MAX_DIMENSION = 2048;
/** جودة الضغط (0-1) */
const QUALITY = 0.82;
/** الحد الأدنى للحجم الذي يستحق الضغط (100KB) */
const MIN_SIZE_TO_COMPRESS = 100 * 1024;

const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * يضغط صورة إذا كانت تستحق الضغط، وإلا يُرجعها كما هي
 */
export async function compressImageFile(file: File): Promise<File> {
  // تجاوز الملفات غير القابلة للضغط
  if (!COMPRESSIBLE_TYPES.includes(file.type)) return file;
  // تجاوز الملفات الصغيرة
  if (file.size < MIN_SIZE_TO_COMPRESS) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    // حساب الأبعاد الجديدة مع الحفاظ على النسبة
    let newWidth = width;
    let newHeight = height;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      newWidth = Math.round(width * ratio);
      newHeight = Math.round(height * ratio);
    }

    // رسم الصورة على canvas
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    bitmap.close();

    // تحويل إلى blob بجودة مضغوطة
    const outputType = file.type === 'image/png' ? 'image/webp' : file.type;
    const blob = await canvas.convertToBlob({
      type: outputType,
      quality: QUALITY,
    });

    // إذا كان الحجم المضغوط أكبر أو مساوي — أرجع الأصلي
    if (blob.size >= file.size) return file;

    // تعديل الامتداد إذا تغيّر النوع
    let newName = file.name;
    if (outputType !== file.type) {
      const ext = outputType === 'image/webp' ? 'webp' : file.type.split('/')[1];
      newName = file.name.replace(/\.[^.]+$/, `.${ext}`);
    }

    return new File([blob], newName, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    // في حال فشل الضغط — أرجع الملف الأصلي
    return file;
  }
}
