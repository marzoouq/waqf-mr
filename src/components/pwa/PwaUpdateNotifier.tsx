import { useEffect, useState } from 'react';
import { uiNotify } from '@/lib/notify';
import { safeGet, safeRemove, safeSet } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { compareSemver } from '@/lib/pwa/semver';
import ChangelogDialog, { type ChangelogEntry } from './ChangelogDialog';

const LAST_SEEN_KEY = 'pwa_last_seen_version';
const UPDATE_FLAG_KEY = 'pwa_just_updated';
const UPDATE_TTL = 10 * 60 * 1000; // 10 minutes

const PwaUpdateNotifier = () => {
  const [showChangelog, setShowChangelog] = useState(false);
  const [newEntries, setNewEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    try {
      const raw = safeGet(UPDATE_FLAG_KEY, '');
      if (!raw) return;

      safeRemove(UPDATE_FLAG_KEY);
      const { ts } = JSON.parse(raw);
      if (Date.now() - ts >= UPDATE_TTL) return;

      fetch(`/changelog.json?v=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(res => res.json())
        .then((changelog: ChangelogEntry[]) => {
          if (controller.signal.aborted) return;
          if (!Array.isArray(changelog) || changelog.length === 0) return;

          const latest = changelog[0]!;
          const latestVersion = latest.version;
          const lastSeen = safeGet(LAST_SEEN_KEY, '');

          let entries: ChangelogEntry[];
          if (!lastSeen) {
            entries = [latest];
          } else {
            const filtered = changelog.filter(e => compareSemver(e.version, lastSeen) > 0);
            entries = filtered.slice(0, 3);
          }

          if (entries.length === 0) {
            safeSet(LAST_SEEN_KEY, latestVersion);
            return;
          }

          safeSet(LAST_SEEN_KEY, latestVersion);
          setNewEntries(entries);

          const hasUserFacing = entries.some(e =>
            e.changes.some(c => c.type === 'feature' || c.type === 'fix'),
          );
          if (hasUserFacing) {
            uiNotify.success('تم تحديث التطبيق بنجاح ✨', {
              description: 'اضغط لعرض سجل التحديثات',
              duration: 6000,
              action: {
                label: 'عرض التحديثات',
                onClick: () => setShowChangelog(true),
              },
            });
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          logger.warn('[PWA] تعذر جلب سجل التحديثات', error);
        });
    } catch (error) {
      logger.warn('[PWA] تعذر تهيئة إشعار التحديث', error);
    }

    return () => controller.abort();
  }, []);

  if (newEntries.length === 0) return null;

  return <ChangelogDialog open={showChangelog} onOpenChange={setShowChangelog} entries={newEntries} />;
};

export default PwaUpdateNotifier;
