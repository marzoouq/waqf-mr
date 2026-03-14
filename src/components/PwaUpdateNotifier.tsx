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
  const [newEntries, setNewEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    try {
      const raw = localStorage.getItem(UPDATE_FLAG_KEY);
      if (!raw) return;

      localStorage.removeItem(UPDATE_FLAG_KEY);
      const { ts } = JSON.parse(raw);
      if (Date.now() - ts >= UPDATE_TTL) return;

      // جلب سجل التحديثات مع تجاوز الكاش
      fetch(`/changelog.json?v=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(res => res.json())
        .then((changelog: ChangelogEntry[]) => {
          if (controller.signal.aborted) return;
          const lastSeen = localStorage.getItem(LAST_SEEN_KEY) || '0.0.0';
          const filtered = changelog.filter(e => compareSemver(e.version, lastSeen) > 0);
          const entries = filtered.length > 0 ? filtered : [changelog[0]];
          setNewEntries(entries);

          toast.success("تم تحديث التطبيق بنجاح ✨", {
            description: "اضغط لعرض سجل التحديثات",
            duration: 6000,
            action: {
              label: "عرض التحديثات",
              onClick: () => setShowChangelog(true),
            },
          });

          if (changelog[0]) {
            localStorage.setItem(LAST_SEEN_KEY, changelog[0].version);
          }
        })
        .catch(() => {});
    } catch {}

    return () => controller.abort();
  }, []);

  if (newEntries.length === 0) return null;

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
