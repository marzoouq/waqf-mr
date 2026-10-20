import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ROLE_LABELS } from '@/constants/roles';
import { ARCHIVE_CATEGORY_LABELS, type ArchiveCategory } from '@/types/archive';
import { FLAG_LABELS, type FileAccessFlag } from '@/hooks/page/admin/settings/useFileAccessRulesPanel';
import { useFileCategoryRulesPanel } from '@/hooks/page/admin/settings/useFileCategoryRulesPanel';

const FLAGS = Object.keys(FLAG_LABELS) as FileAccessFlag[];

const FileCategoryRulesPanel = () => {
  const { rules, isLoading, toggle, saving } = useFileCategoryRulesPanel();
  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">صلاحيات فئات الأرشيف</CardTitle>
        <CardDescription>لكل فئة وثائق صلاحياتها الخاصة، وتُقدَّم على صلاحية الأرشيف العامة. كل فئة محجوبة حتى تفتحها.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-start py-2">الفئة</th>
              <th className="text-start py-2">الدور</th>
              {FLAGS.map((f) => <th key={f} className="py-2">{FLAG_LABELS[f]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const cat = ARCHIVE_CATEGORY_LABELS[r.category as ArchiveCategory] ?? r.category;
              const role = ROLE_LABELS[r.role] ?? r.role;
              return (
                <tr key={r.id} className="border-b border-border">
                  <td className="py-2">{cat}</td>
                  <td className="py-2">{role}</td>
                  {FLAGS.map((f) => (
                    <td key={f} className="py-2 text-center">
                      <Switch checked={r[f]} disabled={saving} onCheckedChange={(v) => toggle(r, f, v)}
                        aria-label={`${FLAG_LABELS[f]} — ${cat} — ${role}`} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default FileCategoryRulesPanel;
