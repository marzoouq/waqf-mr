/**
 * مكونات مشتركة لقوالب الفواتير
 */
import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { generateQrDataUrl } from '@/utils/zatca/zatcaQr';

/** مكوّن QR موحّد */
export function QrImage({ data, size, className }: { data: string; size: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    // تجنّب setState بعد تفكيك المكوّن
    generateQrDataUrl(data)
      .then((url) => { if (active) setSrc(url); })
      .catch(() => { if (active) setSrc(null); });
    return () => { active = false; };
  }, [data]);
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse bg-muted rounded" />;
  return <img src={src} width={size} height={size} alt="QR Code" className={className} />;
}

export const InfoRow = ({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-muted-foreground min-w-[80px]">{label}:</span>
    <span className={cn("font-medium", mono && "font-mono text-[11px]", warn ? "text-destructive font-semibold" : "text-foreground")} dir={mono ? "ltr" : undefined}>{value}</span>
  </div>
);
