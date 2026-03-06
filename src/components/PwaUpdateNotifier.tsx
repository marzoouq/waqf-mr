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

/** Compare semver strings, returns >0 if a > b */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

const LAST_SEEN_KEY = 'pwa_last_seen_version';
const UPDATE_FLAG_KEY = 'pwa_just_updated';
const UPDATE_TTL = 10 * 60 * 1000; // 10 minutes

const PwaUpdateNotifier = () => {
  const [showChangelog, setShowChangelog] = useState(false);
  const [newEntries, setNewEntries] = useState<ChangelogEntry[]>(changelog);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UPDATE_FLAG_KEY);
      if (raw) {
        localStorage.removeItem(UPDATE_FLAG_KEY);
        const { ts } = JSON.parse(raw);
        // Only show if the update happened within the last 10 minutes
        if (Date.now() - ts < UPDATE_TTL) {
          // Filter changelog to show only new entries since last seen version
          const lastSeen = localStorage.getItem(LAST_SEEN_KEY) || '0.0.0';
          const filtered = changelog.filter(e => compareSemver(e.version, lastSeen) > 0);
          setNewEntries(filtered.length > 0 ? filtered : [changelog[0]]);

          toast.success("تم تحديث التطبيق بنجاح ✨", {
            description: "اضغط لعرض سجل التحديثات",
            duration: 6000,
            action: {
              label: "عرض التحديثات",
              onClick: () => setShowChangelog(true),
            },
          });

          // Mark current version as seen
          if (changelog[0]) {
            localStorage.setItem(LAST_SEEN_KEY, changelog[0].version);
          }
        }
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
            {newEntries.map((entry) => (
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
