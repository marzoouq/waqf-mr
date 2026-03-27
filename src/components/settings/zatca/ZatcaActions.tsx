import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Save, ShieldCheck, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

interface ActiveCert {
  certificate_type: string;
  request_id: string | null;
  created_at: string | null;
}

interface ZatcaActionsProps {
  saving: boolean;
  onboardLoading: boolean;
  renewLoading: boolean;
  activeCert: ActiveCert | null;
  handleSave: () => void;
  handleSetupAndOnboard: () => void;
  handleRenewCertificate: () => void;
}

const ZatcaActions = ({
  saving, onboardLoading, renewLoading, activeCert,
  handleSave, handleSetupAndOnboard, handleRenewCertificate,
}: ZatcaActionsProps) => {
  return (
    <>
      {/* ─── حالة الشهادة الحالية ─── */}
      {activeCert && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">شهادة {activeCert.certificate_type === 'production' ? 'إنتاج' : 'امتثال'} نشطة</p>
                <p className="text-sm text-muted-foreground">
                  معرّف الطلب: <span className="font-mono">{activeCert.request_id || '—'}</span>
                  {' • '}
                  {activeCert.created_at ? new Date(activeCert.created_at).toLocaleDateString('ar-SA') : ''}
                </p>
              </div>
              <Badge variant={activeCert.certificate_type === 'production' ? 'default' : 'secondary'} className="mr-auto">
                {activeCert.certificate_type === 'production' ? 'إنتاج' : 'امتثال'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── أزرار الإجراءات ─── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="default" disabled={onboardLoading} className="gap-2 bg-primary">
              {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              تهيئة
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ بدء عملية التهيئة والربط مع فاتورة</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>سيتم حفظ جميع الإعدادات وتوليد شهادة ZATCA جديدة وإرسال طلب التسجيل.</p>
                <p>تأكد من إدخال رمز OTP صحيح من بوابة فاتورة.</p>
                {activeCert && (
                  <p className="text-destructive font-medium">⚠️ سيتم إلغاء الشهادة النشطة الحالية واستبدالها.</p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleSetupAndOnboard}>تأكيد التهيئة</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {activeCert && activeCert.certificate_type === 'production' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={renewLoading} className="gap-2">
                {renewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                تجديد الشهادة
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>🔄 تجديد شهادة الإنتاج</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>سيتم توليد شهادة إنتاج جديدة واستبدال الشهادة الحالية.</p>
                  <p>تأكد من إدخال رمز OTP جديد (الحقل الثاني) من بوابة فاتورة قبل المتابعة.</p>
                  <p className="text-destructive font-medium">⚠️ الشهادة الحالية ستتوقف عن العمل فور نجاح التجديد.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleRenewCertificate}>تأكيد التجديد</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </>
  );
};

export default ZatcaActions;
