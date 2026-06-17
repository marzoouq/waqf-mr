/**
 * شريط أدوات صفحة التشخيص — تصدير + إعادة فحص + تنظيف + تشغيل الكل.
 * مكوّن عرضي بحت، يستقبل كل المعالجات كـ props.
 */
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RefreshCw, Download, ChevronDown, Trash2 } from 'lucide-react';
import DeepCleanConfirmDialog from './DeepCleanConfirmDialog';

type CleanDialog = null | 'light' | 'deep';

interface Props {
  hasResults: boolean;
  running: boolean;
  runningCategory: string | null;
  deepCleaning: boolean;
  summary: { fail: number; warn: number };
  cleanDialog: CleanDialog;
  setCleanDialog: (v: CleanDialog) => void;
  onRunAll: () => void;
  onExportJson: () => void;
  onExportText: () => void;
  onRerunFailures: () => void;
  onRerunFailuresAndWarnings: () => void;
  onLightClean: () => void;
  onDeepClean: () => void;
}

export default function DiagnosticsToolbar(p: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {p.hasResults && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 me-2" />تصدير<ChevronDown className="w-3 h-3 ms-1" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={p.onExportJson}>تصدير JSON (مع روابط ومصادر)</DropdownMenuItem>
            <DropdownMenuItem onClick={p.onExportText}>تصدير نص</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {p.hasResults && (p.summary.fail > 0 || p.summary.warn > 0) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={p.running}><RefreshCw className="w-4 h-4 me-2" />إعادة فحص<ChevronDown className="w-3 h-3 ms-1" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={p.onRerunFailures} disabled={p.summary.fail === 0}>إعادة الفاشلة فقط ({p.summary.fail})</DropdownMenuItem>
            <DropdownMenuItem onClick={p.onRerunFailuresAndWarnings} disabled={p.summary.fail + p.summary.warn === 0}>إعادة الفاشلة والتحذيرات ({p.summary.fail + p.summary.warn})</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={p.running || p.deepCleaning}>
            <Trash2 className="w-4 h-4 me-2" />تنظيف<ChevronDown className="w-3 h-3 ms-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => p.setCleanDialog('light')}>تنظيف خفيف (نتائج التشخيص)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => p.setCleanDialog('deep')}>تنظيف عميق (كاش + SW + IDB)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={p.cleanDialog === 'light'} onOpenChange={(o) => !o && p.setCleanDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تنظيف نتائج التشخيص</AlertDialogTitle>
            <AlertDialogDescription>
              سيُمسح أرشيف التشغيلات والنتائج الحالية وعلامات التحذيرات المرفوضة. لا يؤثر على بيانات النظام الفعلية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); p.onLightClean(); }}>
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DeepCleanConfirmDialog
        open={p.cleanDialog === 'deep'}
        busy={p.deepCleaning}
        onCancel={() => p.setCleanDialog(null)}
        onConfirm={p.onDeepClean}
      />
      <Button onClick={p.onRunAll} disabled={p.running || !!p.runningCategory} size="sm">
        <RefreshCw className={`w-4 h-4 me-2 ${p.running ? 'animate-spin' : ''}`} />
        {p.running ? 'جارٍ الفحص...' : 'تشغيل الكل'}
      </Button>
    </div>
  );
}
