/**
 * email-admin — Edge function لإدارة لوحة مراقبة البريد (Admin only)
 * أوامر:
 *  - get_stats: إحصاءات مجمّعة (sent/failed/dlq/suppressed) + last_run + DLQ counts
 *  - retry_dlq: نقل رسائل DLQ المختارة (أو الكل) إلى الطابور الأصلي لإعادة المحاولة
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const ALLOWED_ACTIONS = ["get_stats", "retry_dlq"] as const;
type Action = typeof ALLOWED_ACTIONS[number];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // التحقق من المستخدم
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const [authRes, body] = await Promise.all([
      userClient.auth.getUser(),
      req.json().catch(() => ({})),
    ]);
    const { data: userData, error: userErr } = authRes;
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // التحقق من دور admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const action = body?.action as Action;
    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ───── get_stats ─────
    if (action === "get_stats") {
      // عدد رسائل DLQ في كلا الطابورين
      // pgmq DLQ tables follow naming: pgmq.q_<queue>_dlq — query via RPC if available, otherwise approximate
      let authDlqCount = 0;
      let transDlqCount = 0;
      try {
        const { data: a } = await adminClient.rpc("pgmq_metrics" as never, { queue_name: "auth_emails_dlq" } as never).then(
          (r: { data: unknown }) => r,
          () => ({ data: null }),
        );
        if (a && typeof a === "object" && "queue_length" in a) {
          authDlqCount = Number((a as { queue_length: number }).queue_length) || 0;
        }
      } catch { /* ignore */ }
      try {
        const { data: t } = await adminClient.rpc("pgmq_metrics" as never, { queue_name: "transactional_emails_dlq" } as never).then(
          (r: { data: unknown }) => r,
          () => ({ data: null }),
        );
        if (t && typeof t === "object" && "queue_length" in t) {
          transDlqCount = Number((t as { queue_length: number }).queue_length) || 0;
        }
      } catch { /* ignore */ }

      // last run = أحدث رسالة في email_send_log
      const { data: lastLog } = await adminClient
        .from("email_send_log")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // حالة الطابور (rate limit)
      const { data: state } = await adminClient
        .from("email_send_state")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          ok: true,
          last_log_at: lastLog?.created_at ?? null,
          auth_dlq_count: authDlqCount,
          transactional_dlq_count: transDlqCount,
          rate_limited_until: state?.retry_after_until ?? null,
          state,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ───── retry_dlq ─────
    if (action === "retry_dlq") {
      const queueName = body?.queue as string;
      if (!queueName || !["auth_emails", "transactional_emails"].includes(queueName)) {
        return new Response(JSON.stringify({ error: "Invalid queue" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // قراءة رسائل DLQ ثم إعادة إرسالها للطابور الأصلي
      // pgmq exposes pgmq.read / pgmq.send / pgmq.delete via RPC wrappers
      const dlqName = `${queueName}_dlq`;
      let movedCount = 0;
      let lastError: string | null = null;

      try {
        // قراءة دفعة من DLQ (50 كحد أقصى)
        const { data: msgs, error: readErr } = await adminClient.rpc(
          "read_email_batch" as never,
          { queue_name: dlqName, batch_size: 50, vt: 30 } as never,
        );

        if (readErr) {
          lastError = readErr.message;
        } else if (Array.isArray(msgs) && msgs.length > 0) {
          for (const msg of msgs as Array<{ msg_id: number; message: Record<string, unknown> }>) {
            try {
              // أعد إرسالها للطابور الأصلي
              const { error: enqErr } = await adminClient.rpc(
                "enqueue_email" as never,
                { queue_name: queueName, payload: msg.message } as never,
              );
              if (!enqErr) {
                // احذف الرسالة من DLQ
                await adminClient.rpc(
                  "delete_email" as never,
                  { queue_name: dlqName, message_id: msg.msg_id } as never,
                );
                movedCount++;
              } else {
                lastError = enqErr.message;
              }
            } catch (e) {
              lastError = e instanceof Error ? e.message : String(e);
            }
          }
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }

      return new Response(
        JSON.stringify({ ok: true, moved: movedCount, error: lastError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unhandled action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
