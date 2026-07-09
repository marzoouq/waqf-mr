/**
 * Playwright DOM readers for expenses documentation stats.
 */
import type { Page } from '@playwright/test';

export interface SummaryStats {
  rate: number;
  documented: number;
  total: number;
}

export async function readSummaryStats(page: Page): Promise<SummaryStats> {
  await page.locator('[data-testid="documentation-rate"]').first().waitFor();
  const rateText = (await page.locator('[data-testid="documentation-rate"]').first().innerText()).trim();
  const countText = (await page.locator('[data-testid="documented-count"]').first().innerText()).trim();

  const rate = Number(rateText.replace(/[^\d.-]/g, ''));
  const [documented, total] = countText.split('/').map((s) => Number(s.trim()));

  return { rate, documented: documented ?? 0, total: total ?? 0 };
}

export async function readAttachmentCounts(page: Page): Promise<Record<string, number>> {
  const rows = page.locator('[data-testid^="expense-row-"]');
  const count = await rows.count();
  const result: Record<string, number> = {};

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const testId = (await row.getAttribute('data-testid')) ?? '';
    const id = testId.replace(/^expense-row-/, '');
    const cell = row.locator('[data-testid="attachments-count"]');
    const attr = await cell.getAttribute('data-count');
    result[id] = Number(attr ?? 0);
  }
  return result;
}
