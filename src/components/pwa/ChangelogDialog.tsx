import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Bug, Wrench, Star } from 'lucide-react';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: 'feature' | 'fix' | 'improvement'; text: string }[];
}

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
}

const ChangelogDialog = ({ open, onOpenChange, entries }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md" dir="rtl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          سجل التحديثات
        </DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-6 pe-3">
          {entries.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground">الإصدار {entry.version}</span>
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
