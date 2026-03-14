/**
 * دليل مرئي لخطوات إصدار الفاتورة الضريبية
 * يعرض 6 خطوات كـ stepper أفقي (desktop) أو عمودي (mobile)
 */
import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileText, Receipt, PenTool, Send, ShieldCheck, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const STORAGE_KEY = 'invoice-steps-guide-open';

const STEPS = [
  {
    icon: FileText,
    title: 'إنشاء العقد',
    description: 'أنشئ عقد إيجار مع بيانات المستأجر وتفاصيل الدفعات',
  },
  {
    icon: Receipt,
    title: 'توليد الفواتير',
    description: 'تُولَّد فواتير الدفعات تلقائياً حسب جدول السداد',
  },
  {
    icon: PenTool,
    title: 'توقيع رقمي',
    description: 'يُوقَّع XML الفاتورة رقمياً بشهادة ZATCA المعتمدة',
  },
  {
    icon: Send,
    title: 'إبلاغ ZATCA',
    description: 'تُرسل الفاتورة لهيئة الزكاة عبر API (إبلاغ أو اعتماد)',
  },
  {
    icon: ShieldCheck,
    title: 'اعتماد الهيئة',
    description: 'تستقبل الحالة من الهيئة: مُعتمدة أو مرفوضة',
  },
  {
    icon: Download,
    title: 'تحميل PDF',
    description: 'حمّل الفاتورة النهائية بصيغة A4 مع رمز QR',
  },
] as const;

export default function InvoiceStepsGuide() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    } catch { /* تجاهل أخطاء التخزين */ }
  }, [isOpen]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-right hover:bg-muted/50 transition-colors rounded-t-lg">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Receipt className="h-4 w-4 text-primary" />
            كيف تُصدر فاتورة ضريبية؟
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-5 pt-2">
            {/* Stepper */}
            <div
              className={cn(
                'flex gap-3',
                isMobile ? 'flex-col' : 'flex-row items-start'
              )}
            >
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isLast = idx === STEPS.length - 1;

                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex',
                      isMobile
                        ? 'flex-row items-start gap-3'
                        : 'flex-col items-center text-center flex-1 min-w-0'
                    )}
                  >
                    {/* أيقونة + خط الربط */}
                    <div className={cn('flex', isMobile ? 'flex-col items-center' : 'flex-row items-center w-full')}>
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/30 shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      {/* خط الربط */}
                      {!isLast && (
                        isMobile ? (
                          <div className="w-0.5 h-6 bg-border mx-auto" />
                        ) : (
                          <div className="h-0.5 flex-1 bg-border mx-1" />
                        )
                      )}
                    </div>

                    {/* النص */}
                    <div className={cn(isMobile ? 'pt-0' : 'mt-2')}>
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {step.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
