/**
 * Filters records to the selected fiscal year by date (inclusive bounds).
 * When `range` is null (no specific year / "all years") records pass through.
 */
export interface YearRange { start_date: string; end_date: string }

export function filterByYearRange<T>(
  items: readonly T[],
  getDate: (item: T) => string | null | undefined,
  range: YearRange | null,
): T[] {
  if (!range) return [...items];
  const start = range.start_date.slice(0, 10);
  const end = range.end_date.slice(0, 10);
  return items.filter((item) => {
    const d = getDate(item)?.slice(0, 10);
    // سجل بلا تاريخ لا يُنسب لأي سنة → يظهر فقط في "كل السنوات"
    return !!d && d >= start && d <= end;
  });
}
