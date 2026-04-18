/**
 * شارة شدة التأخر — مُستخرَجة من OverdueRow كمكوّن مستقل
 */
import { Badge } from '@/components/ui/badge';

interface Props { severity: string }

export default function SeverityBadge({ severity }: Props) {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">حرج (&gt;90 يوم)</Badge>;
    case 'high':
      return <Badge className="bg-destructive/60 text-destructive-foreground">عالي (&gt;60 يوم)</Badge>;
    case 'medium':
      return <Badge className="bg-warning/20 text-warning">متوسط (&gt;30 يوم)</Badge>;
    default:
      return <Badge variant="outline">منخفض</Badge>;
  }
}
