/**
 * قسم قابل للطي — يعرض عنواناً وزر توسيع/طي.
 * عند الطي لا يُرندر المحتوى (يُزال من DOM).
 */
import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  /** إخفاء عند الطباعة */
  printHidden?: boolean;
}

const CollapsibleSection = ({
  title, icon: Icon, children, defaultOpen = false, badge, printHidden = false,
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className={`shadow-sm ${printHidden ? 'print:hidden' : ''}`}>
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="w-5 h-5" />
            {title}
            {badge}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
};

export default CollapsibleSection;
