// ═══════════════════════════════════════════════════════════════════════════════
// processBatch.ts — معالجة دفعة رسائل من طابور واحد
// ═══════════════════════════════════════════════════════════════════════════════

import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import {
  type AnyClient,
  getRetryAfterSeconds,
  isForbidden,
  isRateLimited,
  MAX_RETRIES,
  moveToDlq,
  type QueueMessage,
} from "./utils.ts";

export type BatchResult =
  | { processed: number; stopped?: undefined }
  | { processed: number; stopped: "rate_limited" | "emails_disabled" };

interface ProcessBatchOpts {
  supabase: AnyClient;
  queue: string;
  messages: QueueMessage[];
  apiKey: string;
  ttlMinutes: number;
  sendDelayMs: number;
}

export async function processBatch(opts: ProcessBatchOpts): Promise<BatchResult> {
  const { supabase, queue, messages, apiKey, ttlMinutes, sendDelayMs } = opts;
  let processed = 0;

  // Retry budget is based on real send failures, not pgmq read_ct.
  const messageIds = Array.from(
    new Set(
      messages
        .map((msg: QueueMessage) =>
          msg?.message?.message_id && typeof msg.message.message_id === "string"
            ? msg.message.message_id
            : null,
        )
        .filter((id: string | null): id is string => Boolean(id)),
    ),
  );
  const failedAttemptsByMessageId = new Map<string, number>();
  if (messageIds.length > 0) {
    const { data: failedRows, error: failedRowsError } = await supabase
      .from("email_send_log")
      .select("message_id")
      .in("message_id", messageIds)
      .eq("status", "failed");

    if (failedRowsError) {
      console.error("Failed to load failed-attempt counters", { queue, error: failedRowsError });
    } else {
      for (const row of failedRows ?? []) {
        const messageId = row?.message_id;
        if (typeof messageId !== "string" || !messageId) continue;
        failedAttemptsByMessageId.set(messageId, (failedAttemptsByMessageId.get(messageId) ?? 0) + 1);
      }
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const payload = msg.message;
    const failedAttempts =
      payload?.message_id && typeof payload.message_id === "string"
        ? (failedAttemptsByMessageId.get(payload.message_id) ?? 0)
        : msg.read_ct ?? 0;

    // Drop expired messages (TTL exceeded).
    const queuedAt = payload.queued_at ?? msg.enqueued_at;
    if (queuedAt) {
      const ageMs = Date.now() - new Date(queuedAt).getTime();
      const maxAgeMs = ttlMinutes * 60 * 1000;
      if (ageMs > maxAgeMs) {
        console.warn("Email expired (TTL exceeded)", { queue, msg_id: msg.msg_id, queued_at: queuedAt, ttl_minutes: ttlMinutes });
        await moveToDlq(supabase, queue, msg, `TTL exceeded (${ttlMinutes} minutes)`);
        continue;
      }
    }

    // Move to DLQ if max failed send attempts reached.
    if (failedAttempts >= MAX_RETRIES) {
      await moveToDlq(supabase, queue, msg, `Max retries (${MAX_RETRIES}) exceeded (attempted ${failedAttempts} times)`);
      continue;
    }

    // Guard: skip if another worker already sent this message (VT expired race)
    if (payload.message_id) {
      const { data: alreadySent } = await supabase
        .from("email_send_log")
        .select("id")
        .eq("message_id", payload.message_id)
        .eq("status", "sent")
        .maybeSingle();

      if (alreadySent) {
        console.warn("Skipping duplicate send (already sent)", { queue, msg_id: msg.msg_id, message_id: payload.message_id });
        const { error: dupDelError } = await supabase.rpc("delete_email", {
          queue_name: queue,
          message_id: msg.msg_id,
        });
        if (dupDelError) {
          console.error("Failed to delete duplicate message from queue", { queue, msg_id: msg.msg_id, error: dupDelError });
        }
        continue;
      }
    }

    try {
      await sendLovableEmail(
        {
          run_id: payload.run_id,
          to: payload.to,
          from: payload.from,
          sender_domain: payload.sender_domain,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          purpose: payload.purpose,
          label: payload.label,
          idempotency_key: payload.idempotency_key,
          unsubscribe_token: payload.unsubscribe_token,
          message_id: payload.message_id,
        },
        { apiKey, sendUrl: Deno.env.get("LOVABLE_SEND_URL") },
      );

      // Log success
      await supabase.from("email_send_log").insert({
        message_id: payload.message_id,
        template_name: payload.label || queue,
        recipient_email: payload.to,
        status: "sent",
      });

      // Delete from queue
      const { error: delError } = await supabase.rpc("delete_email", { queue_name: queue, message_id: msg.msg_id });
      if (delError) {
        console.error("Failed to delete sent message from queue", { queue, msg_id: msg.msg_id, error: delError });
      }
      processed++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Email send failed", { queue, msg_id: msg.msg_id, read_ct: msg.read_ct, failed_attempts: failedAttempts, error: errorMsg });

      if (isRateLimited(error)) {
        await supabase.from("email_send_log").insert({
          message_id: payload.message_id,
          template_name: payload.label || queue,
          recipient_email: payload.to,
          status: "rate_limited",
          error_message: errorMsg.slice(0, 1000),
        });

        const retryAfterSecs = getRetryAfterSeconds(error);
        await supabase
          .from("email_send_state")
          .update({
            retry_after_until: new Date(Date.now() + retryAfterSecs * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        return { processed, stopped: "rate_limited" };
      }

      if (isForbidden(error)) {
        await moveToDlq(supabase, queue, msg, "Emails disabled for this project");
        return { processed, stopped: "emails_disabled" };
      }

      // Log non-429 failures to track real retry attempts.
      await supabase.from("email_send_log").insert({
        message_id: payload.message_id,
        template_name: payload.label || queue,
        recipient_email: payload.to,
        status: "failed",
        error_message: errorMsg.slice(0, 1000),
      });
      if (payload?.message_id && typeof payload.message_id === "string") {
        failedAttemptsByMessageId.set(payload.message_id, failedAttempts + 1);
      }
    }

    // Small delay between sends to smooth bursts
    if (i < messages.length - 1) {
      await new Promise((r) => setTimeout(r, sendDelayMs));
    }
  }

  return { processed };
}
