// ═══════════════════════════════════════════════════════════════════════════════
// process-email-queue — معالج طابور البريد (cron worker)
// ───────────────────────────────────────────────────────────────────────────────
// الهيكل:
//   - index.ts         ← HTTP handler + auth + orchestration
//   - utils.ts         ← أنواع، error helpers، moveToDlq
//   - processBatch.ts  ← معالجة دفعة لطابور واحد
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";
import { isServiceRole } from "../_shared/auth.ts";
import { processBatch } from "./processBatch.ts";
import {
  type AnyClient,
  DEFAULT_AUTH_TTL_MINUTES,
  DEFAULT_BATCH_SIZE,
  DEFAULT_SEND_DELAY_MS,
  DEFAULT_TRANSACTIONAL_TTL_MINUTES,
  type QueueMessage,
} from "./utils.ts";

Deno.serve(async (req): Promise<Response> => {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Defense in depth: only service-role callers can trigger queue processing.
  const token = authHeader.slice("Bearer ".length).trim();
  if (!isServiceRole(token)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey) as AnyClient;

  // 1. Check rate-limit cooldown and read queue config
  const { data: state } = await supabase
    .from("email_send_state")
    .select("retry_after_until, batch_size, send_delay_ms, auth_email_ttl_minutes, transactional_email_ttl_minutes")
    .single();

  if (state?.retry_after_until && new Date(state.retry_after_until) > new Date()) {
    return new Response(JSON.stringify({ skipped: true, reason: "rate_limited" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const batchSize = state?.batch_size ?? DEFAULT_BATCH_SIZE;
  const sendDelayMs = state?.send_delay_ms ?? DEFAULT_SEND_DELAY_MS;
  const ttlMinutes: Record<string, number> = {
    auth_emails: state?.auth_email_ttl_minutes ?? DEFAULT_AUTH_TTL_MINUTES,
    transactional_emails: state?.transactional_email_ttl_minutes ?? DEFAULT_TRANSACTIONAL_TTL_MINUTES,
  };

  let totalProcessed = 0;

  // 2. Process auth_emails first (priority), then transactional_emails
  for (const queue of ["auth_emails", "transactional_emails"]) {
    const { data: messages, error: readError } = await supabase.rpc("read_email_batch", {
      queue_name: queue,
      batch_size: batchSize,
      vt: 30,
    });

    if (readError) {
      console.error("Failed to read email batch", { queue, error: readError });
      continue;
    }
    if (!messages?.length) continue;

    const result = await processBatch({
      supabase,
      queue,
      messages: messages as QueueMessage[],
      apiKey,
      ttlMinutes: ttlMinutes[queue],
      sendDelayMs,
    });
    totalProcessed += result.processed;

    if (result.stopped) {
      return new Response(JSON.stringify({ processed: totalProcessed, stopped: result.stopped }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ processed: totalProcessed }), {
    headers: { "Content-Type": "application/json" },
  });
});
