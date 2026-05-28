/**
 * FeatureVisibilityGridRow — صف واحد داخل شبكة تحكم الناظر.
 */
import { memo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import type { FeatureVisibilityEntry } from '@/constants/featureVisibilityRegistry';
import type { VisibilityValue } from '@/hooks/data/settings/permissions/useFeatureVisibility';

interface Props {
  entry: FeatureVisibilityEntry;
  value: VisibilityValue;
  onChange: (next: VisibilityValue) => void;
  disabled?: boolean;
}

const FeatureVisibilityGridRow = ({ entry, value, onChange, disabled }: Props) => {
  const locked = entry.lockable;
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{entry.label}</span>
          {locked && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Lock className="w-3 h-3" />إلزامي
            </Badge>
          )}
        </div>
        {entry.description && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
        )}
      </div>
      <Switch
        checked={value === 'visible'}
        disabled={disabled || locked}
        onCheckedChange={(checked) => onChange(checked ? 'visible' : 'hidden')}
        aria-label={`إظهار ${entry.label}`}
      />
    </div>
  );
};

export default memo(FeatureVisibilityGridRow);
