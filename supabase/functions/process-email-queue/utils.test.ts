/**
 * اختبارات مساعدات طابور البريد — تصنيف الأخطاء ومهلة الإعادة ونقل الرسائل الميتة.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type AnyClient,
  getRetryAfterSeconds,
  isForbidden,
  isRateLimited,
  MAX_RETRIES,
  moveToDlq,
  type QueueMessage,
} from "./utils.ts";

Deno.test("isRateLimited يتعرّف على 429 من الحالة أو نص الخطأ", () => {
  assertEquals(isRateLimited({ status: 429 }), true);
  assertEquals(isRateLimited(new Error("Too many requests: 429")), true);
  assertEquals(isRateLimited({ status: 403 }), false);
  assertEquals(isRateLimited(new Error("boom")), false);
  assertEquals(isRateLimited(null), false);
  assertEquals(isRateLimited(undefined), false);
});

Deno.test("isForbidden يتعرّف على 403 فقط", () => {
  assertEquals(isForbidden({ status: 403 }), true);
  assertEquals(isForbidden(new Error("403 emails disabled")), true);
  assertEquals(isForbidden({ status: 429 }), false);
  assertEquals(isForbidden("403"), false, "النص المجرّد ليس خطأً مُصنَّفاً");
});

Deno.test("getRetryAfterSeconds يحترم القيمة المرسلة ويرجع 60 افتراضياً", () => {
  assertEquals(getRetryAfterSeconds({ retryAfterSeconds: 12 }), 12);
  assertEquals(getRetryAfterSeconds({ retryAfterSeconds: null }), 60);
  assertEquals(getRetryAfterSeconds(new Error("429")), 60);
  assertEquals(getRetryAfterSeconds({ retryAfterSeconds: 0 }), 0);
});

Deno.test("MAX_RETRIES محدود كي لا تدور الرسائل للأبد", () => {
  assert(MAX_RETRIES > 0 && MAX_RETRIES <= 10, `قيمة غير معقولة: ${MAX_RETRIES}`);
});

Deno.test("moveToDlq يسجّل السبب ثم ينقل الرسالة للطابور الميت", async () => {
  const inserts: Record<string, unknown>[] = [];
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];

  const fake = {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push(row);
        return Promise.resolve({ error: null });
      },
    }),
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ error: null });
    },
  } as unknown as AnyClient;

  const msg: QueueMessage = {
    msg_id: 77,
    message: { message_id: "m-1", to: "user@example.com", label: "recovery" },
    read_ct: 6,
  };

  await moveToDlq(fake, "auth_emails", msg, "تجاوز الحد الأقصى للمحاولات");

  assertEquals(inserts.length, 1);
  assertEquals(inserts[0].status, "dlq");
  assertEquals(inserts[0].recipient_email, "user@example.com");
  assertEquals(inserts[0].template_name, "recovery");
  assertEquals(inserts[0].error_message, "تجاوز الحد الأقصى للمحاولات");

  assertEquals(rpcCalls.length, 1);
  assertEquals(rpcCalls[0].name, "move_to_dlq");
  assertEquals(rpcCalls[0].args.source_queue, "auth_emails");
  assertEquals(rpcCalls[0].args.dlq_name, "auth_emails_dlq");
  assertEquals(rpcCalls[0].args.message_id, 77);
});

Deno.test("moveToDlq يستخدم اسم الطابور كقالب عند غياب label", async () => {
  const inserts: Record<string, unknown>[] = [];
  const fake = {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push(row);
        return Promise.resolve({ error: null });
      },
    }),
    rpc: () => Promise.resolve({ error: null }),
  } as unknown as AnyClient;

  await moveToDlq(fake, "transactional_emails", { msg_id: 1, message: { to: "a@b.c" } }, "سبب");
  assertEquals(inserts[0].template_name, "transactional_emails");
});
