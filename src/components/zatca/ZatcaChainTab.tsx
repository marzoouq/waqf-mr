/**
 * تبويب سلسلة التوقيع — Invoice Chain
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link2 } from 'lucide-react';

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
                  <TableCell className="font-mono text-xs max-w-[200px] truncate" title={entry.invoice_hash}>{entry.invoice_hash}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate" title={entry.previous_hash}>{entry.previous_hash}</TableCell>
                  <TableCell>{entry.created_at ? new Date(entry.created_at).toLocaleDateString('ar-SA') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
