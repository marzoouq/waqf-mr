/**
 * مصفوفة صلاحيات الأدوار — جدول سطح المكتب + بطاقات الموبايل
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, CheckSquare, XSquare } from 'lucide-react';
import { ROLE_SECTION_DEFS } from '@/constants/sections';
import type { RolePerms } from '@/constants/rolePermissions';

interface RoleDef {
  key: string;
  label: string;
  color: string;
}

interface Props {
  roles: RoleDef[];
  perms: RolePerms;
  onToggle: (role: string, section: string) => void;
  onSelectAll: (roleKey: string, value: boolean) => void;
}

const RolePermissionsMatrix = ({ roles, perms, onToggle, onSelectAll }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-display text-lg flex items-center gap-2">
        <Shield className="w-5 h-5" />
        مصفوفة الصلاحيات
      </CardTitle>
      <CardDescription>
        تحكم بالأقسام الظاهرة لكل دور — الناظر يرى كل شيء دائماً
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* أزرار تحديد/إلغاء الكل */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
        {roles.map(role => (
          <div key={role.key} className="flex items-center gap-1">
            <span className={`text-xs font-medium ${role.color}`}>{role.label}:</span>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => onSelectAll(role.key, true)}>
              <CheckSquare className="w-3 h-3" /> الكل
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => onSelectAll(role.key, false)}>
              <XSquare className="w-3 h-3" /> لا شيء
            </Button>
          </div>
        ))}
      </div>

      {/* بطاقات الموبايل */}
      <div className="space-y-3 md:hidden">
        {ROLE_SECTION_DEFS.map(section => (
          <div key={section.key} className="p-3 rounded-lg border bg-card space-y-2">
            <p className="font-medium text-sm text-foreground">{section.label}</p>
            <div className="flex flex-wrap gap-3">
              {roles.map(role => {
                if (!section.roles.includes(role.key)) return null;
                return (
                  <label key={role.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={perms[role.key]?.[section.key] ?? false}
                      onCheckedChange={() => onToggle(role.key, section.key)}
                    />
                    <span className="text-muted-foreground">{role.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* جدول سطح المكتب */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right py-3 px-2 font-medium text-foreground">القسم</th>
              {roles.map(r => (
                <th key={r.key} className={`text-center py-3 px-2 font-medium min-w-[80px] ${r.color}`}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLE_SECTION_DEFS.map(section => (
              <tr key={section.key} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-2 font-medium text-foreground">{section.label}</td>
                {roles.map(role => (
                  <td key={role.key} className="text-center py-3 px-2">
                    {section.roles.includes(role.key) ? (
                      <Checkbox
                        checked={perms[role.key]?.[section.key] ?? false}
                        onCheckedChange={() => onToggle(role.key, section.key)}
                      />
                    ) : (
                      <span className="text-muted-foreground">─</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

export default RolePermissionsMatrix;
