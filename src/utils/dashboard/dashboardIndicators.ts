/**
 * مؤشرات لوحة الناظر/المحاسب — دوال نقية.
 */

interface SharePercentSettings {
  admin_share_percentage?: number | null;
  waqif_share_percentage?: number | null;
}

/**
 * Returns true only when admin or waqif share percentage is missing.
 * رقبة الوقف تُدخل يدوياً فلا يُعتبر غيابها استخداماً لنسب افتراضية.
 */
export function isUsingFallbackSharePct(settings: SharePercentSettings | null | undefined): boolean {
  if (!settings) return false;
  const missing = (v: number | null | undefined) => v === null || v === undefined;
  return missing(settings.admin_share_percentage) || missing(settings.waqif_share_percentage);
}

/**
 * Active contracts count for the dashboard card.
 * عند اختيار سنة محددة يُعدّ من عقود تلك السنة ليطابق صفحة العقود؛ وإلا يُستخدم عدد الخادم.
 */
export function resolveActiveContractsCount(
  yearContracts: ReadonlyArray<{ status: string }> | undefined,
  isSpecificYear: boolean,
  serverCount: number,
): number {
  if (!isSpecificYear || !yearContracts) return serverCount;
  return yearContracts.filter((c) => c.status === 'active').length;
}
