/**
 * تبويب الإحصائيات المتقدمة — ملخصات + توزيع تصنيف + أولوية
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare, Bug, BarChart3, AlertTriangle, CheckCircle,
  Activity, Star, TrendingUp, TrendingDown,
} from 'lucide-react';

interface SupportAnalyticsTabProps {
  stats: {
    totalTickets?: number;
    openTickets?: number;
    inProgressTickets?: number;
    resolvedTickets?: number;
    highPriorityTickets?: number;
    ticketsLast7d?: number;
    totalErrors?: number;
    errorsLast24h?: number;
    errorsLast7d?: number;
  } | undefined;
  avgResolutionTime: string | null;
  avgRating: { avg: string; count: number } | null;
  categoryStats: Array<{ key: string; label: string; count: number; pct: number }>;
  priorityStats: Array<{ key: string; label: string; color: string; count: number; pct: number }>;
}

function StatRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-bold ${color || ''}`}>{value}</span>
    </div>
  );
}

export default function SupportAnalyticsTab({ stats, avgResolutionTime, avgRating, categoryStats, priorityStats }: SupportAnalyticsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ملخص التذاكر */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            ملخص التذاكر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatRow label="إجمالي التذاكر" value={stats?.totalTickets ?? 0} />
          <StatRow label="مفتوحة" value={stats?.openTickets ?? 0} color="text-status-approved-foreground" />
          <StatRow label="قيد المعالجة" value={stats?.inProgressTickets ?? 0} color="text-warning" />
          <StatRow label="تم حلها" value={stats?.resolvedTickets ?? 0} color="text-success" />
          <StatRow label="أولوية عالية/حرجة" value={stats?.highPriorityTickets ?? 0} color="text-destructive" />
          <StatRow label="تذاكر آخر 7 أيام" value={stats?.ticketsLast7d ?? 0} />
          {avgResolutionTime && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><Activity className="w-3.5 h-3.5" />متوسط وقت الحل</span>
                <span className="font-bold text-primary">{avgResolutionTime}</span>
              </div>
            </div>
          )}
          {avgRating && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><Star className="w-3.5 h-3.5 text-star-rating" />متوسط تقييم الخدمة</span>
                <span className="font-bold text-star-rating">{avgRating.avg} ★ ({avgRating.count} تقييم)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ملخص الأخطاء */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="w-4 h-4" />
            ملخص الأخطاء
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatRow label="إجمالي الأخطاء المسجلة" value={stats?.totalErrors ?? 0} />
          <StatRow label="أخطاء آخر 24 ساعة" value={stats?.errorsLast24h ?? 0} color={stats?.errorsLast24h ? 'text-destructive' : undefined} />
          <StatRow label="أخطاء آخر 7 أيام" value={stats?.errorsLast7d ?? 0} color={stats?.errorsLast7d ? 'text-warning' : undefined} />
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              {(stats?.errorsLast24h ?? 0) === 0 ? (
                <><CheckCircle className="w-5 h-5 text-success" /><span className="text-sm text-success">حالة النظام: سليم</span></>
              ) : (stats?.errorsLast24h ?? 0) <= 3 ? (
                <><AlertTriangle className="w-5 h-5 text-warning" /><span className="text-sm text-warning">يوجد أخطاء قليلة تحتاج مراجعة</span></>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-destructive" /><span className="text-sm text-destructive">يوجد أخطاء متكررة — تحتاج تدخل فوري</span></>
              )}
            </div>
            {(stats?.errorsLast24h ?? 0) > 0 && (stats?.errorsLast7d ?? 0) > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                {(stats?.errorsLast24h ?? 0) > ((stats?.errorsLast7d ?? 0) / 7) ? (
                  <><TrendingUp className="w-3 h-3 text-destructive" /><span>معدل الأخطاء في ارتفاع</span></>
                ) : (
                  <><TrendingDown className="w-3 h-3 text-success" /><span>معدل الأخطاء في انخفاض</span></>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* توزيع التصنيفات */}
      {categoryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />توزيع التذاكر حسب التصنيف</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryStats.map(cat => (
              <div key={cat.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{cat.label}</span>
                  <span className="font-medium">{cat.count} ({cat.pct}%)</span>
                </div>
                <Progress value={cat.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* توزيع الأولويات */}
      {priorityStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" />توزيع التذاكر حسب الأولوية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityStats.map(p => (
              <div key={p.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <Badge className={p.color}>{p.label}</Badge>
                  <span className="font-medium">{p.count} ({p.pct}%)</span>
                </div>
                <Progress value={p.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
