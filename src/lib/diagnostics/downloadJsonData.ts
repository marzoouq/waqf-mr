/**
 * تصدير أي بيانات كملف JSON — دالة خالصة عامة (تُستخدم في لوحات التشخيص).
 */
export function downloadJsonData(data: unknown, fileNamePrefix: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileNamePrefix}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
