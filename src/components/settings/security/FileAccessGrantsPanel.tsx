import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BUCKET_LABELS } from '@/hooks/page/admin/settings/useFileAccessRulesPanel';
import { useFileAccessGrantsPanel, GRANT_BUCKETS, type GrantEffect } from '@/hooks/page/admin/settings/useFileAccessGrantsPanel';

const FileAccessGrantsPanel = () => {
  const g = useFileAccessGrantsPanel();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">أذونات فردية</CardTitle>
        <CardDescription>اسمح لمستفيد محدد بملف واحد أو احجبه عنه. الحجب الفردي يغلب صلاحيات الدور.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={g.bucket} onValueChange={g.changeBucket}>
            <SelectTrigger aria-label="نوع الملف"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRANT_BUCKETS.map((b) => <SelectItem key={b} value={b}>{BUCKET_LABELS[b]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={g.path} onValueChange={g.setPath}>
            <SelectTrigger aria-label="الملف"><SelectValue placeholder="اختر الملف" /></SelectTrigger>
            <SelectContent>
              {g.files.map((f) => <SelectItem key={f.path} value={f.path}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={g.userId} onValueChange={g.setUserId}>
            <SelectTrigger aria-label="المستفيد"><SelectValue placeholder="اختر المستفيد" /></SelectTrigger>
            <SelectContent>
              {g.beneficiaries.map((b) => <SelectItem key={b.userId} value={b.userId}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={g.effect} onValueChange={(v) => g.setEffect(v as GrantEffect)}>
            <SelectTrigger aria-label="نوع الإذن"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="allow">سماح بالمعاينة والتنزيل</SelectItem>
              <SelectItem value="deny">حجب</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" aria-label="ينتهي في" value={g.expiresAt} onChange={(e) => g.setExpiresAt(e.target.value)} />
          <Input placeholder="ملاحظة (اختياري)" value={g.notes} onChange={(e) => g.setNotes(e.target.value)} />
        </div>
        <Button onClick={g.submit} disabled={g.saving}>منح الإذن</Button>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-start py-2">المستفيد</th>
                <th className="text-start py-2">الملف</th>
                <th className="text-start py-2">الإذن</th>
                <th className="text-start py-2">ينتهي</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {g.grants.map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="py-2">{g.nameByUser.get(r.user_id) ?? '—'}</td>
                  <td className="py-2">{BUCKET_LABELS[r.bucket_id] ?? r.bucket_id}: {r.object_path.split('/').pop()}</td>
                  <td className="py-2">{r.effect === 'deny' ? 'حجب' : 'سماح'}</td>
                  <td className="py-2">{r.expires_at ? new Date(r.expires_at).toLocaleDateString('ar-SA') : 'دائم'}</td>
                  <td className="py-2"><Button variant="ghost" size="sm" disabled={g.saving} onClick={() => g.revoke(r)}>إلغاء</Button></td>
                </tr>
              ))}
              {!g.isLoading && g.grants.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">لا توجد أذونات فردية</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileAccessGrantsPanel;
