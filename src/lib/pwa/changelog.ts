/**
 * Changelog helpers for the "What's new" dialog — pure functions.
 * يُسقط البنود العامة المكررة («تحسينات وإصلاحات متنوعة») حتى يرى المستخدم ما تغيّر فعلًا.
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: 'feature' | 'fix' | 'improvement'; text: string }[];
}

/** نصوص عامة لا تخبر المستخدم بشيء — لا تُعرض في «ما الجديد» */
const GENERIC_TEXTS = new Set(['تحسينات وإصلاحات متنوعة', 'تحسينات داخلية واستقرار النظام']);

/** يُبقي الإصدارات التي فيها تغيير واحد على الأقل ذو معنى، بحد أقصى `limit` */
export function meaningfulChangelog(entries: unknown, limit = 5): ChangelogEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: ChangelogEntry[] = [];
  for (const e of entries as ChangelogEntry[]) {
    if (!e || typeof e.version !== 'string' || !Array.isArray(e.changes)) continue;
    const changes = e.changes.filter((c) => c && typeof c.text === 'string' && !GENERIC_TEXTS.has(c.text.trim()));
    if (changes.length === 0) continue;
    out.push({ ...e, changes });
    if (out.length >= limit) break;
  }
  return out;
}
