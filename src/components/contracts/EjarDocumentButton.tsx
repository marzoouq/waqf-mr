/**
 * EjarDocumentButton — شارة وحوار عقد إيجار الموثق لكل عقد.
 */
import { FileCheck2, FileX2, Download, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEjarDocument } from '@/hooks/page/admin/contracts/useEjarDocument';

interface Props { contract: { id: string; contract_number: string; start_date: string; end_date: string } }

export const EjarDocumentButton = ({ contract }: Props) => {
  const h = useEjarDocument(contract);
  const hasEjar = h.hasEjar;
  return (
    <>
      <Button
        variant="ghost" size="sm"
        className={hasEjar ? 'h-7 px-2 text-success text-[11px]' : 'h-7 px-2 text-muted-foreground text-[11px]'}
        onClick={() => h.setOpen(true)} aria-label="عقد إيجار الموثق"
      >
        {hasEjar ? <FileCheck2 className="w-3.5 h-3.5" /> : <FileX2 className="w-3.5 h-3.5" />}
        <span className="hidden md:inline">{hasEjar ? 'موثق في إيجار' : 'غير مرفق'}</span>
      </Button>
      <Dialog open={h.open} onOpenChange={h.setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>عقد إيجار الموثق — {contract.contract_number}</DialogTitle></DialogHeader>
          {h.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p> : (
            <div className="space-y-4">
              {h.current ? (
                <div className="rounded-md border p-3 space-y-1 text-sm">
                  <div className="font-semibold">{h.current.file_name}</div>
                  <div className="text-muted-foreground text-xs">
                    {h.current.ejar_number && <>رقم إيجار: {h.current.ejar_number} — </>}
                    رُفع: {new Date(h.current.created_at).toLocaleDateString('ar-SA')}
                  </div>
                  {h.mismatch && (
                    <div className="flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="w-3.5 h-3.5" /> تواريخ إيجار تختلف عن تواريخ العقد في النظام
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => h.download(h.current!)}><Download className="w-4 h-4" /> عرض/تنزيل</Button>
                    {h.canDelete && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => h.remove(h.current!)}><Trash2 className="w-4 h-4" /> حذف</Button>}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">لم يُرفع عقد إيجار موثق لهذا العقد بعد.</p>}

              <div className="space-y-3 border-t pt-3">
                <div className="text-sm font-semibold">{h.current ? 'استبدال بنسخة أحدث' : 'رفع العقد الموثق'}</div>
                <Input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => h.setFile(e.target.files?.[0] ?? null)} aria-label="ملف العقد الموثق" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label htmlFor={`ejar-no-${contract.id}`}>رقم عقد إيجار</Label>
                    <Input id={`ejar-no-${contract.id}`} value={h.meta.ejarNumber ?? ''} onChange={e => h.setMeta({ ...h.meta, ejarNumber: e.target.value })} /></div>
                  <div className="space-y-1"><Label>تاريخ التوثيق</Label>
                    <Input type="date" value={h.meta.documentedAt ?? ''} onChange={e => h.setMeta({ ...h.meta, documentedAt: e.target.value })} /></div>
                  <div className="space-y-1"><Label>بداية العقد في إيجار</Label>
                    <Input type="date" value={h.meta.startDate ?? ''} onChange={e => h.setMeta({ ...h.meta, startDate: e.target.value })} /></div>
                  <div className="space-y-1"><Label>نهاية العقد في إيجار</Label>
                    <Input type="date" value={h.meta.endDate ?? ''} onChange={e => h.setMeta({ ...h.meta, endDate: e.target.value })} /></div>
                </div>
                <Button onClick={h.submit} disabled={!h.file || h.uploading}>{h.uploading ? 'جارٍ الرفع…' : 'رفع'}</Button>
              </div>

              {h.history.length > 0 && (
                <div className="border-t pt-3 space-y-1">
                  <div className="text-sm font-semibold">النسخ المؤرشفة</div>
                  {h.history.map(d => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span>{d.file_name} — {d.archived_at ? new Date(d.archived_at).toLocaleDateString('ar-SA') : ''}</span>
                      <Button size="sm" variant="ghost" onClick={() => h.download(d)}><Download className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
