/**
 * بطاقة إظهار/إخفاء أقسام — مشتركة بين لوحة التحكم وواجهة المستفيد
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ROLE_SECTION_DEFS } from '@/constants/sections';

interface Props {
  title: string;
  description: string;
  sectionKeys: readonly string[];
  values: Record<string, boolean>;
  onToggle: (key: string) => void;
}

const SectionVisibilityCard = ({ title, description, sectionKeys, values, onToggle }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-display text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {sectionKeys.map(key => (
        <label key={key} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer transition-colors">
          <Checkbox checked={values[key] ?? true} onCheckedChange={() => onToggle(key)} />
          <span className="text-sm">{ROLE_SECTION_DEFS.find(s => s.key === key)?.label ?? key}</span>
        </label>
      ))}
    </CardContent>
  </Card>
);

export default SectionVisibilityCard;
