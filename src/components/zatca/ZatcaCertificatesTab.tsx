/**
 * تبويب شهادات ZATCA — دورة العمل + الجدول + التسجيل/الترقية
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ShieldCheck, CheckCircle, AlertTriangle, Loader2, ArrowUpCircle, ClipboardCheck } from 'lucide-react';

interface Certificate {
  id: string;
  certificate_type: string;
  is_active: boolean | null;
  request_id: string | null;
  created_at: string | null;
}

interface ZatcaCertificatesTabProps {
  certificates: Certificate[];
  certsLoading: boolean;
  isComplianceCert: boolean;
  isProductionCert: boolean;
  activeCert: Certificate | undefined;
  canOnboard: boolean;
  missingSettings: string[];
  onboardLoading: boolean;
  productionLoading: boolean;
  onOnboard: () => void;
  onProductionUpgrade: () => void;
}

export default function ZatcaCertificatesTab({
  certificates, certsLoading, isComplianceCert, isProductionCert, activeCert,
  canOnboard, missingSettings, onboardLoading, productionLoading,
  onOnboard, onProductionUpgrade,
}: ZatcaCertificatesTabProps) {
  return (
    <div className="space-y-4">
      {/* دورة العمل */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">دورة العمل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${activeCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">١. التسجيل</span>
              {activeCert && <CheckCircle className="w-3 h-3" />}
            </div>
            <span className="text-muted-foreground">←</span>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${isComplianceCert ? 'bg-secondary border-primary text-secondary-foreground' : isProductionCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
              <ClipboardCheck className="w-4 h-4" />
              <span className="text-sm font-medium">٢. فحص الامتثال</span>
              {isProductionCert && <CheckCircle className="w-3 h-3" />}
            </div>
            <span className="text-muted-foreground">←</span>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${isProductionCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
              <ArrowUpCircle className="w-4 h-4" />
              <span className="text-sm font-medium">٣. الإنتاج</span>
              {isProductionCert && <CheckCircle className="w-3 h-3" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* جدول الشهادات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            شهادات ZATCA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certsLoading ? (
            <p className="text-muted-foreground text-center py-8">جارٍ التحميل...</p>
          ) : certificates.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <AlertTriangle className="w-12 h-12 mx-auto text-accent-foreground" />
              <p className="text-muted-foreground">لا توجد شهادات مسجّلة</p>
              <p className="text-sm text-muted-foreground">يجب التسجيل في بوابة فاتورة أولاً للحصول على CSID</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={onboardLoading || !canOnboard}>
                    {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    بدء التسجيل (Onboarding)
                  </Button>
                </AlertDialogTrigger>
                {!canOnboard && (
                  <p className="text-sm text-destructive mt-2">
                    <AlertTriangle className="w-4 h-4 inline ml-1" />
                    يجب تعيين الإعدادات التالية أولاً: {missingSettings.join('، ')}
                  </p>
                )}
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ تسجيل شهادة ZATCA جديدة</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>سيتم إنشاء شهادة ZATCA جديدة. إذا كانت هناك شهادة نشطة سابقة، سيتم إلغاؤها تلقائياً.</p>
                      <p className="text-destructive font-medium">هذه العملية لا يمكن التراجع عنها وقد تتطلب إعادة تسجيل كامل في بوابة فاتورة.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={onOnboard}>تأكيد التسجيل</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>حالة</TableHead>
                    <TableHead>معرّف الطلب</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map(cert => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <Badge variant={cert.certificate_type === 'production' ? 'default' : 'secondary'}>
                          {cert.certificate_type === 'production' ? 'إنتاج' : 'امتثال'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cert.is_active ? 'default' : 'outline'}>
                          {cert.is_active ? 'نشطة' : 'غير نشطة'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{cert.request_id || '—'}</TableCell>
                      <TableCell>{cert.created_at ? new Date(cert.created_at).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-wrap gap-2 pt-2">
                {!canOnboard && (
                  <p className="text-sm text-destructive w-full">
                    <AlertTriangle className="w-4 h-4 inline ml-1" />
                    يجب تعيين الإعدادات التالية قبل التسجيل: {missingSettings.join('، ')}
                  </p>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={onboardLoading || !canOnboard}>
                      {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      إعادة التسجيل
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>⚠️ إعادة تسجيل شهادة ZATCA</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>سيتم إلغاء الشهادة النشطة الحالية وإنشاء شهادة جديدة.</p>
                        <p className="text-destructive font-medium">هل أنت متأكد؟ هذا قد يؤثر على الفواتير المعلقة.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={onOnboard}>تأكيد إعادة التسجيل</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {isComplianceCert && (
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
