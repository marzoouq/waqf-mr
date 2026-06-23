/**
 * Utilities خارج ملف المكونات للحفاظ على fast-refresh.
 */
import { fmtDateTime } from '@/utils/format/format';

export function formatEmailDateTime(iso: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return fmtDateTime(d, { dateStyle: 'short', timeStyle: 'medium' });
  } catch { return iso; }
}
