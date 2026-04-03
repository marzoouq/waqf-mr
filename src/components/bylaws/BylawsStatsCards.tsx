/**
 * بطاقات إحصائيات اللائحة التنظيمية
 */
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Globe, Lock, FileText } from 'lucide-react';

interface BylawsStatsCardsProps {
  stats: { total: number; visible: number; hidden: number };
  isPublished: boolean;
  togglePublish: () => void;
}

const BylawsStatsCards = ({ stats, isPublished, togglePublish }: BylawsStatsCardsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">إجمالي البنود</p>
        </div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <Eye className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{stats.visible}</p>
          <p className="text-xs text-muted-foreground">بنود ظاهرة</p>
        </div>
      </div>
    </Card>
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <EyeOff className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{stats.hidden}</p>
          <p className="text-xs text-muted-foreground">بنود مخفية</p>
        </div>
      </div>
    </Card>
    <Card className={`p-4 border-2 transition-colors ${isPublished ? 'border-primary/30 bg-accent' : 'border-destructive/30 bg-destructive/5'}`}>
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPublished ? 'bg-primary/10' : 'bg-destructive/10'}`}>
            {isPublished ? <Globe className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-destructive" />}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{isPublished ? 'منشورة' : 'محجوبة'}</p>
            <p className="text-xs text-muted-foreground">{isPublished ? 'متاحة للمستفيدين' : 'مخفية عن المستفيدين'}</p>
          </div>
        </div>
        <Switch checked={isPublished} onCheckedChange={togglePublish} />
      </div>
    </Card>
  </div>
);

export default BylawsStatsCards;
