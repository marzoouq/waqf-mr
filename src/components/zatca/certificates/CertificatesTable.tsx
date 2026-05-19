/**
 * جدول شهادات ZATCA المسجَّلة
 */
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtDate } from '@/utils/format/format';

export interface Certificate {
  id: string;
  certificate_type: string;
  is_active: boolean | null;
  request_id: string | null;
  created_at: string | null;
}

export default function CertificatesTable({ certificates }: { certificates: Certificate[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>النوع</TableHead>
          <TableHead>حالة</TableHead>
          <TableHead>معرّف الطلب</TableHead>
          <TableHead>تاريخ الإنشاء</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {certificates.map(cert => (
          <TableRow key={cert.id}>
            <TableCell>
              <Badge variant={cert.certificate_type === 'production' ? 'default' : 'secondary'}>
                {cert.certificate_type === 'production' ? 'إنتاج' : 'امتثال'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={cert.is_active ? 'default' : 'outline'}>
                {cert.is_active ? 'نشطة' : 'غير نشطة'}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">{cert.request_id || '—'}</TableCell>
            <TableCell>{cert.created_at ? fmtDate(cert.created_at) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
