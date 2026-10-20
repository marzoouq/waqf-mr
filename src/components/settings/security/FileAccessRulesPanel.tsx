import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ROLE_LABELS } from '@/constants/roles';
import {
  useFileAccessRulesPanel,
  BUCKET_LABELS,
  FLAG_LABELS,
  type FileAccessFlag,
} from '@/hooks/page/admin/settings/useFileAccessRulesPanel';

const FLAGS = Object.keys(FLAG_LABELS) as FileAccessFlag[];

const FileAccessRulesPanel = () => {
  const { rules, isLoading, toggle, saving } = useFileAccessRulesPanel();

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">صلاحيات الملفات</CardTitle>
        <CardDescription>
          أنت وحدك من يقرر من يعاين أو ينزّل أو يرفع أو يحذف كل نوع من الملفات. أي دور غير مذكور هنا محجوب تماماً.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-start py-2">الملفات</th>
              <th className="text-start py-2">الدور</th>
              {FLAGS.map((f) => <th key={f} className="py-2">{FLAG_LABELS[f]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="py-2">{BUCKET_LABELS[r.bucket_id] ?? r.bucket_id}</td>
                <td className="py-2">{ROLE_LABELS[r.role] ?? r.role}</td>
                {FLAGS.map((f) => (
                  <td key={f} className="py-2 text-center">
                    <Switch
                      checked={r[f]}
                      disabled={saving}
                      onCheckedChange={(v) => toggle(r, f, v)}
                      aria-label={`${FLAG_LABELS[f]} — ${BUCKET_LABELS[r.bucket_id] ?? r.bucket_id} — ${ROLE_LABELS[r.role] ?? r.role}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-3">
          حتى مع السماح، لا يرى المستفيد إلا ما نشرته: سندات معتمدة، وثائق منشورة، وفواتير سنوات منشورة.
        </p>
      </CardContent>
    </Card>
  );
};

export default FileAccessRulesPanel;
