import { useWaqfInfo } from '@/hooks/useAppSettings';
import { useEffect } from 'react';
import { loadAmiriFonts } from '@/utils/loadAmiriFonts';
const PrintHeader = () => {
  useEffect(() => { loadAmiriFonts(); }, []);
  const { data: waqfInfo } = useWaqfInfo();
  const waqfName = waqfInfo?.waqf_name || 'الوقف';
  const waqfAdmin = waqfInfo?.waqf_admin || '';
  const deedNumber = waqfInfo?.waqf_deed_number || '';
  const deedDate = waqfInfo?.waqf_deed_date || '';
  const court = waqfInfo?.waqf_court || '';
  const logoUrl = waqfInfo?.waqf_logo_url;

  const today = new Date();
  const gregorianDate = today.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div dir="rtl" className="hidden print:block mb-6 px-6 pt-6 print-header">
      {/* الإطار الذهبي العلوي */}
      <div className="border-2 rounded-xl p-5" style={{ borderColor: 'hsl(var(--secondary))' }}>
        <div className="flex items-center justify-between">
          {/* الشعار والمعلومات */}
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 p-1"
              style={{
                border: '2px solid hsl(var(--secondary))',
                background: 'linear-gradient(135deg, hsl(var(--secondary) / 0.15), hsl(var(--secondary) / 0.25))',
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="شعار الوقف" className="w-full h-full rounded-lg object-contain" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))', fontFamily: 'Amiri, serif' }}>وقف</span>
              )}
            </div>
            <div>
              <h1
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: 'Amiri, serif', color: 'hsl(var(--primary))' }}
              >
                {waqfName}
              </h1>
              {waqfAdmin && (
                <p className="text-sm text-foreground/70">
                  ناظر الوقف: <strong>{waqfAdmin}</strong>
                </p>
              )}
              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                {deedNumber && <span>صك رقم: {deedNumber}</span>}
                {deedDate && <span>تاريخ الصك: {deedDate}</span>}
                {court && <span>المحكمة: {court}</span>}
              </div>
            </div>
          </div>

          {/* تاريخ الطباعة */}
          <div className="text-start text-xs text-muted-foreground flex-shrink-0">
            <p className="font-bold mb-1 text-foreground/70">تاريخ الطباعة</p>
            <p>{gregorianDate} م</p>
          </div>
        </div>

        {/* الفاصل */}
        <div
          className="mt-4 h-0.5 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--secondary)), hsl(var(--secondary) / 0.7), hsl(var(--secondary)), transparent)',
          }}
        />
      </div>
    </div>
  );
};

export default PrintHeader;
