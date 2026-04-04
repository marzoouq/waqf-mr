import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface ZatcaPhasePlatformProps {
  selectedPhase: string;
  selectedPlatform: string;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const ZatcaPhasePlatform = ({ selectedPhase, selectedPlatform, setFormData }: ZatcaPhasePlatformProps) => {
  return (
    <>
      {/* ─── اختيار المرحلة ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">مرحلة التطبيق</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-4">
            {(['phase1', 'phase2'] as const).map((phase) => (
              <label
                key={phase}
                className={cn(
                  'flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors',
                  selectedPhase === phase ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <input type="radio" name="zatca_phase" value={phase} checked={selectedPhase === phase} onChange={() => setFormData(p => ({ ...p, zatca_phase: phase }))} className="accent-primary" />
                <div>
                  <p className="font-medium text-sm">{phase === 'phase1' ? 'المرحلة الأولى' : 'المرحلة الثانية'}</p>
                  <p className="text-xs text-muted-foreground">{phase === 'phase1' ? 'مرحلة الإصدار والحفظ' : 'مرحلة الربط والتكامل'}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── اختيار المنصة ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">المنصة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { value: 'production', title: 'منصة فاتورة', desc: 'التهيئة لإصدار الفواتير الإلكترونية وإرسالها بشكل فعلي إلى الهيئة.' },
              { value: 'sandbox', title: 'منصة محاكاة فاتورة', desc: 'التهيئة لتجربة الفواتير الإلكترونية وإرسالها بشكل تجريبي إلى منصة محاكاة فاتورة.' },
            ] as const).map(({ value, title, desc }) => (
              <div
                key={value}
                onClick={() => setFormData(p => ({ ...p, zatca_platform: value }))}
                className={cn(
                  'cursor-pointer rounded-xl border-2 p-5 text-center transition-[border-color,box-shadow] hover:shadow-sm',
                  selectedPlatform === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                )}
              >
                {selectedPlatform === value && <CheckCircle className="w-5 h-5 text-primary mx-auto mb-2" />}
                <p className="font-bold text-primary">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default ZatcaPhasePlatform;
