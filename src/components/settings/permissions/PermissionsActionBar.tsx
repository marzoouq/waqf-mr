/**
 * شريط أزرار حفظ/استعادة الصلاحيات
 */
import { Button } from '@/components/ui/button';
import { Save, RotateCcw } from 'lucide-react';

interface Props {
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

const PermissionsActionBar = ({ saving, onSave, onReset }: Props) => (
  <div className="flex flex-wrap gap-3 sticky bottom-4 bg-background/95 p-3 rounded-lg border shadow-sm">
    <Button onClick={onSave} disabled={saving} className="gap-2">
      <Save className="w-4 h-4" />
      {saving ? 'جارٍ الحفظ...' : 'حفظ جميع الصلاحيات'}
    </Button>
    <Button variant="outline" onClick={onReset} className="gap-2">
      <RotateCcw className="w-4 h-4" />
      استعادة الافتراضي
    </Button>
  </div>
);

export default PermissionsActionBar;
