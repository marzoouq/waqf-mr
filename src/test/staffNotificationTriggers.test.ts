/**
 * حارس انحدار: رسائل وتذاكر المستفيدين يجب أن تُشعر الناظر من الخادم،
 * لا عبر استدعاء من الواجهة يرفضه الخادم بصمت.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migDir = join(process.cwd(), 'drizzle/migrations');
const allSql = readdirSync(migDir).filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(migDir, f), 'utf8')).join('\n');

describe('staff notification triggers', () => {
  it('ticket, reply and message inserts fire server-side notification triggers', () => {
    expect(allSql).toMatch(/CREATE TRIGGER trg_notify_staff_ticket\s+AFTER INSERT ON public\.support_tickets/);
    expect(allSql).toMatch(/CREATE TRIGGER trg_notify_staff_reply\s+AFTER INSERT ON public\.support_ticket_replies/);
    expect(allSql).toMatch(/CREATE TRIGGER trg_notify_message\s+AFTER INSERT ON public\.messages/);
  });

  it('support ticket creation no longer calls notify_admins from the client', () => {
    const src = readFileSync(join(process.cwd(), 'src/hooks/data/support/useSupportTicketMutations.ts'), 'utf8');
    expect(src).not.toMatch(/notify_admins/);
  });

  it('conversation participant may bump activity time', () => {
    expect(allSql).toMatch(/Participants can touch conversations/);
  });
});
