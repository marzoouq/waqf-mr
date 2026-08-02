/**
 * جدول المتواجدين الآن — يُستخدم داخل لوحة تتبع المستخدمين.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Users } from 'lucide-react';
import { fmtDateTime } from '@/utils/format/format';
import type { ActiveSession } from '@/hooks/data/audit/useUserTracking';

interface Props {
  sessions: ActiveSession[];
  isFetching: boolean;
  onRefresh: () => void;
}

export default function ActiveSessionsTable({ sessions, isFetching, onRefresh }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          متواجدون خلال آخر 15 دقيقة: {sessions.length}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ml-1 ${isFetching ? 'animate-spin' : ''}`} /> تحديث
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>المسار الحالي</TableHead>
              <TableHead>آخر نشاط</TableHead>
              <TableHead>الأحداث</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={`${s.user_id}-${s.session_id ?? '-'}`}>
                <TableCell className="font-medium">{s.display_name || s.email || s.user_id.slice(0, 8)}</TableCell>
                <TableCell><Badge variant="secondary">{s.roles ?? '—'}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{s.current_path ?? '—'}</TableCell>
                <TableCell className="text-xs">{fmtDateTime(s.last_activity)}</TableCell>
                <TableCell>{s.events}</TableCell>
                <TableCell className="font-mono text-xs">{s.ip_address ?? '—'}</TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">لا يوجد متواجدون حالياً</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
