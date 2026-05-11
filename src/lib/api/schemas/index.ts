/**
 * Barrel للـ API response schemas (Zod).
 * استخدم safeParse + ApiError({category:'validation'}) عند الفشل.
 */
export { dashboardSummarySchema, type DashboardSummaryResponse } from './dashboardSummary';
export { supportAnalyticsSchema, type SupportAnalytics } from './supportAnalytics';

/** Helper موحّد: يُلقي ApiError(validation) عند فشل safeParse */
import { z } from 'zod';
import { ApiError } from '../rpc';
import { logger } from '@/lib/logger';

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const res = schema.safeParse(data);
  if (!res.success) {
    logger.error(`[schema] ${label} validation failed`, res.error.format());
    throw new ApiError(
      { category: 'validation', message: `استجابة غير متوقعة من ${label}` },
      res.error,
    );
  }
  return res.data;
}
