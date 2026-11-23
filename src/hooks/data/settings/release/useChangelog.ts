/**
 * Release notes for "What's new" — reads the published /changelog.json.
 * يُجلب عند فتح النافذة فقط، ويُعاد البنود ذات المعنى دون العامة.
 */
import { useQuery } from '@tanstack/react-query';
import { meaningfulChangelog, type ChangelogEntry } from '@/lib/pwa/changelog';

export const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '';

export function useChangelog(enabled: boolean) {
  return useQuery<ChangelogEntry[]>({
    queryKey: ['app-changelog'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/changelog.json?v=${APP_VERSION || Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`changelog ${res.status}`);
      // آخر إصدار فقط: ما تغيّر في النسخة التي تستخدمها الآن
      return meaningfulChangelog(await res.json(), 1);
    },
  });
}
