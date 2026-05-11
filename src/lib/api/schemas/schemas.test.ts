import { describe, it, expect } from 'vitest';
import { dashboardSummarySchema, supportAnalyticsSchema, parseOrThrow } from './index';
import { ApiError } from '../rpc';

describe('dashboardSummarySchema', () => {
  it('يقبل الشكل الصحيح', () => {
    const ok = dashboardSummarySchema.safeParse({
      aggregated: { totals: {} },
      pending_advances: [],
      fetched_at: '2025-01-01T00:00:00Z',
    });
    expect(ok.success).toBe(true);
  });

  it('يرفض غياب fetched_at', () => {
    const bad = dashboardSummarySchema.safeParse({ aggregated: {}, pending_advances: [] });
    expect(bad.success).toBe(false);
  });

  it('parseOrThrow يُلقي ApiError(validation)', () => {
    expect(() => parseOrThrow(dashboardSummarySchema, { aggregated: {} }, 'dashboard-summary'))
      .toThrowError(ApiError);
  });
});

describe('supportAnalyticsSchema', () => {
  it('يقبل defaults الفارغة', () => {
    const ok = supportAnalyticsSchema.safeParse({});
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.category_stats).toEqual([]);
      expect(ok.data.total_count).toBe(0);
    }
  });

  it('يقبل بيانات كاملة', () => {
    const ok = supportAnalyticsSchema.safeParse({
      category_stats: [{ key: 'tech', count: 5 }],
      priority_stats: [{ key: 'high', count: 2 }],
      avg_resolution_hours: 12.5,
      avg_rating: 4.2,
      rated_count: 8,
      total_count: 20,
    });
    expect(ok.success).toBe(true);
  });

  it('يرفض count غير رقمي', () => {
    const bad = supportAnalyticsSchema.safeParse({
      category_stats: [{ key: 'x', count: 'nope' }],
    });
    expect(bad.success).toBe(false);
  });
});
