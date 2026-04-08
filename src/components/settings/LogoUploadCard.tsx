/**
 * بطاقة رفع شعار مشتركة — تُستخدم في إعدادات الوقف والواجهة الرئيسية
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Upload, X, Loader2 } from 'lucide-react';
import { useLogoUpload } from '@/hooks/data/settings/useLogoUpload';

interface LogoUploadCardProps {
  title: string;
  description: string;
  settingKey: string;
  storagePath: string;
  currentUrl: string;
}

const LogoUploadCard: React.FC<LogoUploadCardProps> = ({
  title, description, settingKey, storagePath, currentUrl,
}) => {
  const { fileInputRef, preview, saving, handleSelect, handleRemove } = useLogoUpload({
    settingKey, storagePath, currentUrl,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt={title} className="w-16 h-16 rounded-lg object-contain border" />
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="absolute -top-2 -left-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 ml-2" />
            )}
            {saving ? 'جارٍ الرفع...' : preview ? 'تغيير' : 'رفع شعار'}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSelect} />
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoUploadCard;
