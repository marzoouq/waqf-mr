/**
 * تبويب سلسلة التوقيع — Invoice Chain
 * #55: عرض مختصر للـ hash مع tooltip للقيمة الكاملة
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link2 } from 'lucide-react';
import { fmtDate } from '@/utils/format/format';

interface ChainEntry {
  id: string;
  icv: number;
  invoice_hash: string;
  previous_hash: string;
  created_at: string | null;
}

interface ZatcaChainTabProps {
  chain: ChainEntry[];
  chainLoading: boolean;
}

/** عرض أول 8 أحرف من الـ hash مع tooltip للقيمة الكاملة */
const HashCell = ({ hash }: { hash: string }) => {
  if (!hash || hash === '0') return <span className="font-mono text-xs text-muted-foreground">—</span>;
  const short = hash.length > 12 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="font-mono text-xs cursor-help">{short}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[400px] break-all font-mono text-xs">
        {hash}
      </TooltipContent>
    </Tooltip>
  );
};

export default function ZatcaChainTab({ chain, chainLoading }: ZatcaChainTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          سلسلة التوقيع (Invoice Chain)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chainLoading ? (
          <p className="text-muted-foreground text-center py-8">جارٍ التحميل...</p>
        ) : chain.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">لا توجد سجلات في سلسلة التوقيع بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ICV</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Previous Hash</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chain.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono font-bold">{entry.icv}</TableCell>
                  <TableCell><HashCell hash={entry.invoice_hash} /></TableCell>
                  <TableCell><HashCell hash={entry.previous_hash} /></TableCell>
                  <TableCell>{entry.created_at ? fmtDate(entry.created_at) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
