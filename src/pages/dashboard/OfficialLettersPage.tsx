/**
 * OfficialLettersPage — إصدار وثيقة معتمدة من الناظر مع رقم مرجعي وQR للتحقق.
 */
import { FileSignature, Download, Ban } from 'lucide-react';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOfficialLettersPage } from '@/hooks/page/admin/management/useOfficialLettersPage';
import YearScopeToggle from '@/components/common/YearScopeToggle';
import { LETTER_TYPE_LABELS } from '@/utils/pdf/entities/officialLetterPdf';

const OfficialLettersPage = () => {
  const h = useOfficialLettersPage();
  const set = (k: keyof typeof h.form) => (v: string) => h.setForm({ ...h.form, [k]: v });

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeaderCard
          title="الوثائق المعتمدة"
          description="إصدار وثيقة برقم مرجعي وختم الوقف ورمز QR يمكن التحقق منه علنًا"
          icon={FileSignature}
        />

        <Card>
          <CardHeader><CardTitle className="text-base">بيانات الوثيقة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>نوع الوثيقة</Label>
                <Select value={h.form.letterType} onValueChange={set('letterType')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LETTER_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ol-recipient">الجهة الموجّه إليها</Label>
                <Input id="ol-recipient" value={h.form.recipient} onChange={e => set('recipient')(e.target.value)} placeholder="مثال: إلى من يهمه الأمر" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ol-subject">الموضوع</Label>
              <Input id="ol-subject" value={h.form.subject} onChange={e => set('subject')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ol-body">نص الوثيقة</Label>
              <Textarea id="ol-body" rows={8} value={h.form.body} onChange={e => set('body')(e.target.value)} />
            </div>
            <Button onClick={h.issue} disabled={!h.canIssue || h.issuing}>
              <FileSignature className="w-4 h-4" /> {h.issuing ? 'جارٍ الإصدار…' : 'إصدار وتنزيل PDF'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">الوثائق الصادرة</CardTitle>
            <YearScopeToggle allYears={h.allYears} onChange={h.setAllYears} yearLabel={h.yearLabel} />
          </CardHeader>
          <CardContent className="space-y-2">
            {h.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
            {h.isError && <p className="text-sm text-destructive">تعذّر تحميل الوثائق الصادرة — حدّث الصفحة</p>}
            {!h.isLoading && !h.isError && h.letters.length === 0 && <p className="text-sm text-muted-foreground">لا توجد وثائق صادرة في هذا النطاق</p>}
            {h.letters.map(l => (
              <div key={l.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0 text-sm">
                <span className="font-mono">{l.doc_number}</span>
                <Badge variant="outline">{LETTER_TYPE_LABELS[l.letter_type] ?? l.letter_type}</Badge>
                <span className="truncate max-w-[40ch]">{l.subject}</span>
                {l.status === 'void' && <Badge variant="destructive">ملغاة</Badge>}
                <span className="mr-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => h.reprint(l)}><Download className="w-4 h-4" /> تنزيل</Button>
                  {l.status !== 'void' && <Button size="sm" variant="ghost" onClick={() => h.cancel(l)}><Ban className="w-4 h-4" /> إلغاء</Button>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OfficialLettersPage;
