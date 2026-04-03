/**
 * مكوّن حالة الفراغ — يُستخدم عند عدم وجود بيانات في الجداول والقوائم
 */
import type { LucideIcon } from 'lucide-react';
import { FileX2 } from 'lucide-react';

interface EmptyStateProps {
  /** أيقونة مخصصة (الافتراضي: FileX2) */
  icon?: LucideIcon;
  /** العنوان الرئيسي */
  title: string;
  /** وصف إضافي اختياري */
  description?: string;
  /** عناصر إضافية (مثل زر إضافة) */
  children?: React.ReactNode;
  /** حجم مصغّر للاستخدام داخل جدول */
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon = FileX2,
  title,
  description,
  children,
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Icon className="w-8 h-8 text-muted-foreground/50" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground/70">{description}</p>}
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
