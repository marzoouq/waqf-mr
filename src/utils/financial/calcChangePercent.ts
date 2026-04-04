/** حساب نسبة التغيير بين قيمتين */
export const calcChangePercent = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};
