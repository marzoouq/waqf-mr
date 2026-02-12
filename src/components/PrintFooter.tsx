import { useWaqfInfo } from '@/hooks/useWaqfInfo';

const PrintFooter = () => {
  const { data: waqfInfo } = useWaqfInfo();
  const waqfName = waqfInfo?.waqf_name || 'وقف مرزوق بن علي الثبيتي';

  return (
    <div className="hidden print:block print-footer">
      <div
        className="border-t pt-3 px-6 flex items-center justify-between text-xs"
        style={{
          borderColor: 'hsl(40, 20%, 80%)',
          color: 'hsl(150, 15%, 50%)',
        }}
      >
        <span>{waqfName}</span>
        <span style={{ color: 'hsl(43, 74%, 49%)', fontWeight: 600 }}>
          مستند رسمي — لا يُعتد به إلا بختم الناظر
        </span>
        <span className="print-page-number" />
      </div>
    </div>
  );
};

export default PrintFooter;
