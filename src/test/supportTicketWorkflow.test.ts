/**
 * حارس انحدار: توجيه التذاكر حسب القسم، قفل المرسل، تعليم المقروء، ومراقبة البريد.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORY_ROUTING, getTicketRecipientRoles } from '@/constants/support';

const migDir = join(process.cwd(), 'drizzle/migrations');
const allSql = readdirSync(migDir).filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(migDir, f), 'utf8')).join('\n');
const read = (p: string) => (existsSync(join(process.cwd(), p)) ? readFileSync(join(process.cwd(), p), 'utf8') : '');

describe('ticket routing by category', () => {
  it('financial goes to admin + accountant', () => {
    expect(getTicketRecipientRoles('financial')).toEqual(['admin', 'accountant']);
  });
  it('technical and account go to admin + support, never accountant', () => {
    expect(getTicketRecipientRoles('technical')).toEqual(['admin', 'support']);
    expect(getTicketRecipientRoles('account')).toEqual(['admin', 'support']);
  });
  it('general and suggestion go to admin only', () => {
    expect(getTicketRecipientRoles('general')).toEqual(['admin']);
    expect(getTicketRecipientRoles('suggestion')).toEqual(['admin']);
    expect(getTicketRecipientRoles('unknown')).toEqual(['admin']);
  });
  it('server routing matches client routing', () => {
    expect(allSql).toMatch(/WHEN 'financial' THEN ARRAY\['admin','accountant'\]/);
    expect(allSql).toMatch(/WHEN 'technical' THEN ARRAY\['admin','support'\]/);
    expect(Object.keys(CATEGORY_ROUTING).sort()).toEqual(['account', 'financial', 'general', 'suggestion', 'technical']);
  });
});

describe('ticket governance', () => {
  it('accountant may reply only on financial tickets', () => {
    expect(allSql).toMatch(/Accountants reply on financial tickets[\s\S]*?t\.category = 'financial'/);
  });
  it('owner close/reopen is server-side and checks owner + resolved', () => {
    const fn = allSql.match(/FUNCTION public\.close_or_reopen_own_ticket[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(fn).toMatch(/created_by <> auth\.uid\(\)/);
    expect(fn).toMatch(/status <> 'resolved'/);
    expect(fn).toMatch(/check_rate_limit/);
  });
  it('ticket events log is append-only with RLS', () => {
    expect(allSql).toMatch(/CREATE TABLE public\.support_ticket_events/);
    expect(allSql).toMatch(/ALTER TABLE public\.support_ticket_events ENABLE ROW LEVEL SECURITY/);
    expect(allSql).not.toMatch(/GRANT[^;]*(UPDATE|DELETE)[^;]*support_ticket_events TO authenticated/);
  });
  it('status change notifies owner and auto-close runs after 7 days', () => {
    expect(allSql).toMatch(/CREATE TRIGGER trg_ticket_status_events/);
    expect(allSql).toMatch(/interval '7 days'/);
  });
});

describe('read state', () => {
  it('opening a conversation marks it read server-side for participants only', () => {
    const fn = allSql.match(/FUNCTION public\.mark_conversation_read[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(fn).toMatch(/sender_id <> auth\.uid\(\)/);
    expect(fn).toMatch(/participant_id = auth\.uid\(\)/);
    expect(read('src/hooks/data/messaging/useMessaging.ts')).toMatch(/mark_conversation_read/);
  });
  it('unread counter refreshes live', () => {
    expect(read('src/hooks/data/messaging/useUnreadMessages.ts')).toMatch(/useBfcacheSafeChannel/);
  });
});

describe('support thread UI', () => {
  it('both dialogs use the shared thread with sender sides and live replies', () => {
    expect(read('src/components/support/TicketViewDialog.tsx')).toMatch(/TicketThread/);
    expect(read('src/components/support/TicketDetailDialog.tsx')).toMatch(/TicketThread/);
    expect(read('src/hooks/data/support/useSupportTickets.ts')).toMatch(/support_ticket_replies[\s\S]*ticket_id=eq\./);
  });
});

describe('email monitor', () => {
  it('last run falls back to real send log and flags a stalled queue', () => {
    const src = read('src/pages/dashboard/EmailMonitorPage.tsx') + read('src/hooks/page/admin/management/useEmailMonitorPage.ts');
    expect(src).toMatch(/lastSentAt/);
    expect(src).toMatch(/الطابور متوقف/);
  });
});
