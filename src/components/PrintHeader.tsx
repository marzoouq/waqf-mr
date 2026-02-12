import { useWaqfInfo } from '@/hooks/useWaqfInfo';
import waqfLogo from '@/assets/waqf-logo.png';

const PrintHeader = () => {
  const { data: waqfInfo } = useWaqfInfo();
  const waqfName = waqfInfo?.waqf_name || 'وقف مرزوق بن علي الثبيتي';
  const waqfAdmin = waqfInfo?.waqf_admin || '';
  const deedNumber = waqfInfo?.waqf_deed_number || '';
  const logoUrl = waqfInfo?.waqf_logo_url;

  return (
    <div className="hidden print:block mb-6 px-6 pt-4">
      <div className="flex items-center justify-between border-b-2 border-primary pb-4">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="شعار الوقف" className="w-16 h-16 rounded-xl object-contain" />
          ) : (
            <img src={waqfLogo} alt="شعار الوقف" className="w-16 h-16 rounded-xl object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold font-display">{waqfName}</h1>
            <p className="text-sm text-muted-foreground">ناظر الوقف: {waqfAdmin}</p>
            {deedNumber && <p className="text-xs text-muted-foreground">رقم الصك: {deedNumber}</p>}
          </div>
        </div>
        <div className="text-left text-sm text-muted-foreground">
          <p>تاريخ الطباعة</p>
          <p className="font-bold">{new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintHeader;
