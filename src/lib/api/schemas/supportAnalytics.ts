/**
 * Zod schema لنتيجة RPC `get_support_analytics` (ليست Edge Function).
 *
 * يحلّ التمرير غير الآمن `as unknown as SupportAnalyticsData` في
 * src/hooks/data/support/useSupportAnalytics.ts.
 */
import { z } from 'zod';

const statBucketSchema = z.object({
  key: z.string(),
  count: z.number(),
});

export const supportAnalyticsSchema = z.object({
  category_stats: z.array(statBucketSchema).default([]),
  priority_stats: z.array(statBucketSchema).default([]),
  avg_resolution_hours: z.number().default(0),
  avg_rating: z.number().default(0),
  rated_count: z.number().default(0),
  total_count: z.number().default(0),
});

export type SupportAnalytics = z.infer<typeof supportAnalyticsSchema>;
