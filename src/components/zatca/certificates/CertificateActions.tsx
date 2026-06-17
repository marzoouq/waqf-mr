/**
 * أزرار التسجيل / إعادة التسجيل / الترقية للإنتاج مع حوارات التأكيد
 */
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, ArrowUpCircle, AlertTriangle } from 'lucide-react';

interface Props {
  variant: 'initial' | 'manage';
  canOnboard: boolean;
  missingSettings: string[];
  onboardLoading: boolean;
  productionLoading: boolean;
  isComplianceCert: boolean;
  onOnboard: () => void;
  onProductionUpgrade: () => void;
}

export default function CertificateActions({
  variant, canOnboard, missingSettings, onboardLoading, productionLoading,
  isComplianceCert, onOnboard, onProductionUpgrade,
}: Props) {
  const isInitial = variant === 'initial';

  return (
    <div className={isInitial ? 'space-y-3' : 'flex flex-wrap gap-2 pt-2'}>
      {!canOnboard && (
        <p className={`text-sm text-destructive ${isInitial ? 'mt-2' : 'w-full'}`}>
          <AlertTriangle className="w-4 h-4 inline me-1" />
          يجب تعيين الإعدادات التالية {isInitial ? 'أولاً' : 'قبل التسجيل'}: {missingSettings.join('، ')}
        </p>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant={isInitial ? 'default' : 'outline'}
            size={isInitial ? 'default' : 'sm'}
            disabled={onboardLoading || !canOnboard}
          >
            {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
            {isInitial ? 'بدء التسجيل (Onboarding)' : 'إعادة التسجيل'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isInitial ? '⚠️ تسجيل شهادة ZATCA جديدة' : '⚠️ إعادة تسجيل شهادة ZATCA'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {isInitial ? (
                <>
                  <p>سيتم إنشاء شهادة ZATCA جديدة. إذا كانت هناك شهادة نشطة سابقة، سيتم إلغاؤها تلقائياً.</p>
                  <p className="text-destructive font-medium">هذه العملية لا يمكن التراجع عنها وقد تتطلب إعادة تسجيل كامل في بوابة فاتورة.</p>
                </>
              ) : (
                <>
                  <p>سيتم إلغاء الشهادة النشطة الحالية وإنشاء شهادة جديدة.</p>
                  <p className="text-destructive font-medium">هل أنت متأكد؟ هذا قد يؤثر على الفواتير المعلقة.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={onOnboard}>
              {isInitial ? 'تأكيد التسجيل' : 'تأكيد إعادة التسجيل'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isInitial && isComplianceCert && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={productionLoading} className="gap-1">
              {productionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
              ترقية للإنتاج
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ترقية إلى شهادة الإنتاج</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>سيتم ترقية شهادة الامتثال الحالية إلى شهادة إنتاج.</p>
                <p className="font-medium">تأكد من أنك أجريت فحص الامتثال بنجاح على 6 فواتير اختبار قبل الترقية.</p>
                <p className="text-destructive font-medium">بعد الترقية، ستُرسل الفواتير فعلياً إلى هيئة الزكاة والضريبة.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={onProductionUpgrade}>تأكيد الترقية</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
