/**
 * مكوّن عرض الفروقات بين البيانات قبل/بعد العملية
 */
import { getFieldLabel, formatValue } from '@/utils/format/auditLabels';

interface DataDiffProps {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  operation: string;
}

export function DataDiff({ oldData, newData, operation }: DataDiffProps) {
  if (operation === 'REOPEN' && newData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {oldData && Object.entries(oldData).map(([key, val]) => (
          <div key={`old-${key}`} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)} (قبل):</span>
            <span className="text-destructive line-through">{formatValue(val)}</span>
          </div>
        ))}
        {Object.entries(newData).map(([key, val]) => (
          <div key={`new-${key}`} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)} (بعد):</span>
            <span className="text-success">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'INSERT' && newData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {Object.entries(newData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-success">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'DELETE' && oldData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {Object.entries(oldData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-destructive line-through">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'UPDATE' && oldData && newData) {
    const changedKeys = Object.keys(newData).filter(
      k => !['id', 'created_at', 'updated_at'].includes(k) && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    );
    if (changedKeys.length === 0) return <p className="text-sm text-muted-foreground">لا توجد تغييرات ظاهرة</p>;
    return (
      <div className="space-y-2 text-sm">
        {changedKeys.map(key => (
          <div key={key} className="flex flex-wrap gap-2 items-center">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-destructive line-through">{formatValue(oldData[key])}</span>
            <span>←</span>
            <span className="text-success">{formatValue(newData[key])}</span>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">لا توجد بيانات</p>;
}

export default DataDiff;
