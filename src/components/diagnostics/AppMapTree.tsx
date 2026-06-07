/**
 * شجرة خريطة التطبيق — تعرض كل الـ routes مجمَّعة حسب الدور.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAllPagesForMap } from '@/lib/diagnostics/checks/appMap';

const ROLE_LABEL: Record<string, string> = {
  admin: 'لوحة الناظر/المحاسب',
  beneficiary: 'لوحة المستفيد',
  waqif: 'لوحة الواقف',
  public: 'صفحات عامة',
};

export default function AppMapTree() {
  const grouped = useMemo(() => {
    const pages = getAllPagesForMap();
    const out: Record<string, { path: string; title: string }[]> = {};
    for (const p of pages) {
      (out[p.role] ??= []).push({ path: p.path, title: p.title });
    }
    return out;
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(grouped).map(([role, pages]) => (
        <Card key={role}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{ROLE_LABEL[role] ?? role}</span>
              <Badge variant="outline">{pages.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 max-h-80 overflow-auto">
            <ul className="space-y-1 text-sm">
              {pages.map(p => (
                <li key={p.path} className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0">
                  <span className="font-medium truncate">{p.title}</span>
                  <code className="text-xs text-muted-foreground truncate">{p.path}</code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
