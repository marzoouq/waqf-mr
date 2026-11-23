import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Bug, Wrench, Star } from 'lucide-react';

import type { ChangelogEntry } from '@/lib/pwa/changelog';

export type { ChangelogEntry };

const typeIcon = {
  feature: <Star className="h-3.5 w-3.5 text-primary" />,
  fix: <Bug className="h-3.5 w-3.5 text-destructive" />,
  improvement: <Wrench className="h-3.5 w-3.5 text-warning" />,
};

const typeLabel = {
  feature: 'جديد',
  fix: 'إصلاح',
  improvement: 'تحسين',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: ChangelogEntry[];
  /** حالة الجلب عند الفتح اليدوي من الإعدادات */
  status?: 'loading' | 'error' | 'ready';
}

const ChangelogDialog = ({ open, onOpenChange, entries, status = 'ready' }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md" dir="rtl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          ما الجديد
        </DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-6 pe-3">
          {status === 'loading' && <p className="text-sm text-muted-foreground">جاري تحميل التحديثات...</p>}
          {status === 'error' && <p className="text-sm text-destructive">تعذّر تحميل سجل التحديثات. حاول لاحقًا.</p>}
          {status === 'ready' && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد تحديثات جديدة لعرضها.</p>
          )}
          {entries.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground">الإصدار <bdi dir="ltr" className="num">{entry.version}</bdi></span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
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

export default ChangelogDialog;
