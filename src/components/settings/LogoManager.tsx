import { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, ImageIcon } from 'lucide-react';
import { useLogoManager } from '@/hooks/page/useLogoManager';
import { toast } from 'sonner';

const LogoManager = () => {
  const { isLoading, logoUrl, uploading, deleting, handleUpload, handleDelete } = useLogoManager();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          شعار الوقف
        </CardTitle>
        <CardDescription>
          الشعار يظهر في لوحة التحكم وجميع ملفات PDF والتقارير المصدّرة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="شعار الوقف"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
            )}
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground">
              {logoUrl ? 'الشعار الحالي - يمكنك تغييره أو حذفه' : 'لم يتم إضافة شعار بعد'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                {logoUrl ? 'تغيير الشعار' : 'رفع شعار'}
              </Button>
              {logoUrl && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'جارٍ الحذف...' : 'حذف الشعار'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, SVG — حد أقصى 2 ميجابايت</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) {
              toast.error('الصيغ المسموحة: PNG, JPG, WEBP, SVG');
              return;
            }
            if (file.size > 2 * 1024 * 1024) {
              toast.error('حجم الملف يجب أن يكون أقل من 2 ميجابايت');
              return;
            }

            handleUpload(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          className="hidden"
          aria-label="رفع شعار الوقف"
        />
      </CardContent>
    </Card>
  );
};

export default LogoManager;
