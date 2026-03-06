import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Bug, Wrench, Star } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: "feature" | "fix" | "improvement"; text: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.6.0",
    date: "٦ مارس ٢٠٢٦",
    changes: [
      { type: "feature", text: "إضافة اسم المستفيد في إشعار طلب السلفة" },
      { type: "improvement", text: "تخزين مؤقت ذكي لبيانات API عند انقطاع الإنترنت (NetworkFirst)" },
      { type: "improvement", text: "زيادة مدة الاحتفاظ بالكاش للبيانات المالية (30 دقيقة)" },
      { type: "improvement", text: "تسجيل أخطاء العميل تلقائياً في سجل المراقبة" },
      { type: "fix", text: "توحيد النطاق للنشر (waqf-wise.net) في جميع الملفات" },
      { type: "fix", text: "حماية ErrorBoundary منفصلة للمكونات الثانوية" },
    ],
  },
  {
    version: "2.5.0",
    date: "٢ مارس ٢٠٢٦",
    changes: [
      { type: "fix", text: "إصلاح عرض البيانات الشخصية للمحاسب (الهوية/البنك) بدون تقنيع" },
      { type: "fix", text: "إصلاح حساب السلف بمجموع النسب التناسبي بدل القسمة على 100" },
      { type: "fix", text: "إصلاح تنبيهات التأخر للعقود المنتهية" },
      { type: "feature", text: "نظام الفواتير: فلاتر النوع والحالة وعرض بطاقات للجوال" },
      { type: "improvement", text: "تحديث شامل للتوثيق وإضافة النطاق المخصص waqf-wise.net" },
    ],
  },
  {
    version: "2.4.0",
    date: "٢١ فبراير ٢٠٢٦",
    changes: [
      { type: "improvement", text: "استبدال الألوان الثابتة بتوكنات التصميم لدعم الوضع الداكن" },
      { type: "feature", text: "إضافة سجل التحديثات عند تحديث التطبيق" },
      { type: "fix", text: "إصلاح ألوان شارة 'مقفلة' في الوضع الداكن" },
      { type: "improvement", text: "إضافة اختبارات وحدة جديدة للحسابات المالية" },
    ],
  },
  {
    version: "2.3.0",
    date: "٢٠ فبراير ٢٠٢٦",
    changes: [
      { type: "feature", text: "إشعار تحديث تلقائي للتطبيق (PWA)" },
      { type: "improvement", text: "تحسين أداء التطبيق وسرعة التحميل" },
      { type: "fix", text: "إصلاح مشاكل التوافق مع الأجهزة المحمولة" },
    ],
  },
  {
    version: "2.2.0",
    date: "١٨ فبراير ٢٠٢٦",
    changes: [
      { type: "feature", text: "نظام الرسائل والمحادثات بين الناظر والمستفيدين" },
      { type: "improvement", text: "تحسين واجهة لوحة التحكم الرئيسية" },
      { type: "fix", text: "إصلاح حساب نسب التوزيع" },
    ],
  },
];

const typeIcon = {
  feature: <Star className="h-3.5 w-3.5 text-primary" />,
  fix: <Bug className="h-3.5 w-3.5 text-destructive" />,
  improvement: <Wrench className="h-3.5 w-3.5 text-warning" />,
};

const typeLabel = {
  feature: "جديد",
  fix: "إصلاح",
  improvement: "تحسين",
};

const PwaUpdateNotifier = () => {
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    // Only show toast if main.tsx flagged a real version change
    try {
      const updated = sessionStorage.getItem('pwa_just_updated');
      if (updated) {
        sessionStorage.removeItem('pwa_just_updated');
        toast.success("تم تحديث التطبيق بنجاح ✨", {
          description: "اضغط لعرض سجل التحديثات",
          duration: 6000,
          action: {
            label: "عرض التحديثات",
            onClick: () => setShowChangelog(true),
          },
        });
      }
    } catch {}
  }, []);

  return (
    <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            سجل التحديثات
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pe-3">
            {changelog.map((entry) => (
              <div key={entry.version}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-foreground">
                    الإصدار {entry.version}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.date}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      {typeIcon[change.type]}
                      <span>
                        <span className="inline-block text-xs font-medium text-foreground bg-muted rounded px-1.5 py-0.5 me-1">
                          {typeLabel[change.type]}
                        </span>
                        {change.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PwaUpdateNotifier;
