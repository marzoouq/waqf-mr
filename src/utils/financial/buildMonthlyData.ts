/**
 * تحويل بيانات شهرية من RPC إلى تنسيق الرسم البياني
 * مستخرجة من useWaqifDashboardPage — utility مشتركة
 */

export function buildMonthlyData(
  monthlyIncome: Array<{ month: number; total: number }>,
  monthlyExpenses: Array<{ month: number; total: number }>,
) {
  const map: Record<string, { income: number; expenses: number }> = {};
  (monthlyIncome ?? []).forEach(({ month, total }) => {
    const key = String(month).padStart(2, '0');
    if (!map[key]) map[key] = { income: 0, expenses: 0 };
    map[key].income += total;
  });
  (monthlyExpenses ?? []).forEach(({ month, total }) => {
    const key = String(month).padStart(2, '0');
    if (!map[key]) map[key] = { income: 0, expenses: 0 };
    map[key].expenses += total;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, income: data.income, expenses: data.expenses }));
}
