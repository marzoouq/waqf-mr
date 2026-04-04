/**
 * تصغير صورة تلقائياً باستخدام Canvas API
 * تُرجع Blob مع بيانات عن التصغير
 */

interface ResizeResult {
  blob: Blob;
  wasResized: boolean;
  originalWidth: number;
  originalHeight: number;
  newWidth: number;
  newHeight: number;
}

export const resizeImage = (
  file: File,
  maxDimension = 256,
  quality = 0.85,
): Promise<ResizeResult> => {
  return new Promise((resolve, reject) => {
    // ملفات SVG لا تحتاج تصغير
    if (file.type === 'image/svg+xml') {
      resolve({
        blob: file,
        wasResized: false,
        originalWidth: 0,
        originalHeight: 0,
        newWidth: 0,
        newHeight: 0,
      });
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;

      // إذا الأبعاد أصغر من الحد → لا حاجة للتصغير
      if (w <= maxDimension && h <= maxDimension) {
        resolve({
          blob: file,
          wasResized: false,
          originalWidth: w,
          originalHeight: h,
          newWidth: w,
          newHeight: h,
        });
        return;
      }

      // حساب الأبعاد الجديدة مع الحفاظ على النسبة
      const ratio = Math.min(maxDimension / w, maxDimension / h);
      const newW = Math.round(w * ratio);
      const newH = Math.round(h * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('فشل إنشاء Canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, newW, newH);

      // تحويل إلى blob بصيغة أصلية أو JPEG
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('فشل تحويل الصورة'));
            return;
          }
          resolve({
            blob,
            wasResized: true,
            originalWidth: w,
            originalHeight: h,
            newWidth: newW,
            newHeight: newH,
          });
        },
        outputType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('فشل تحميل الصورة'));
    };

    img.src = url;
  });
};
