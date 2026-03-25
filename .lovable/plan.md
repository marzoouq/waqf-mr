

# استبدال qrcode.react بـ img + generateQrDataUrl

## الهدف
حذف مكتبة `qrcode.react` واستخدام `generateQrDataUrl` من `src/utils/zatcaQr.ts` (مكتبة `qrcode`) لتوليد صورة QR كـ `<img>` بدلاً من `<QRCodeSVG>`. هذا يوحّد المكتبتين في واحدة.

## الملفات المتأثرة

| الملف | التغيير |
|---|---|
| `src/components/invoices/InvoiceTemplates.tsx` | استبدال `QRCodeSVG` بـ `<img>` مع `useEffect`/`useState` لتوليد data URL |
| `package.json` | حذف `qrcode.react` و `@types/qrcode.react` |

## التفاصيل التقنية

### 1. تعديل `InvoiceTemplates.tsx`

- حذف `import { QRCodeSVG } from 'qrcode.react'`
- إضافة `import { generateQrDataUrl } from '@/utils/zatcaQr'`
- إنشاء مكوّن داخلي `QrImage` يستخدم `useState` + `useEffect` لتوليد صورة QR:

```tsx
function QrImage({ data, size, className }: { data: string; size: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    generateQrDataUrl(data).then(setSrc);
  }, [data]);
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse bg-muted rounded" />;
  return <img src={src} width={size} height={size} alt="QR Code" className={className} />;
}
```

- استبدال 3 استخدامات لـ `<QRCodeSVG value={qrData} size={X} level="H" className="..." />` بـ `<QrImage data={qrData} size={X} className="..." />`

### 2. حذف الحزمة
- إزالة `qrcode.react` من `dependencies` في `package.json`

## التأثير
- توفير ~15-20KB gzipped من حجم الحزمة
- توحيد على مكتبة `qrcode` واحدة فقط
- الفرق البصري: PNG بدلاً من SVG (بدقة 300px كافية للعرض)

