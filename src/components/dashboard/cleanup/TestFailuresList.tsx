import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { TestFailureEntry } from '@/constants/cleanupReport';

interface TestFailuresListProps {
  failures: TestFailureEntry[];
}

const TestFailuresList = ({ failures }: TestFailuresListProps) => {
  if (failures.length === 0) {
    return (
      <Card className="shadow-sm border-success/30 bg-success/5">
        <CardContent className="p-4 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <span>لا توجد اختبارات فاشلة — جميع الـ 2062 اختبار نجحت بعد التنظيف.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {failures.map((f, idx) => (
        <Card key={`${f.file}-${idx}`} className="shadow-sm border-destructive/30">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{f.name}</p>
                <code className="block mt-1 text-xs text-muted-foreground font-mono break-all">
                  {f.file}
                </code>
              </div>
            </div>
            <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {f.message}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TestFailuresList;
