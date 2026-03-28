/**
 * المساعد الذكي — نقطة الدخول الرئيسية
 * المنطق مقسّم إلى:
 *   _shared/ai-prompts.ts    → قوالب System Prompt
 *   _shared/ai-data-fetcher.ts → جلب بيانات الوقف + Cache
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { buildSystemPrompt, ALLOWED_MODES, type AllowedMode } from "../_shared/ai-prompts.ts";
import { fetchWaqfData, dataCache } from "../_shared/ai-data-fetcher.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ─── المصادقة ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "يجب تسجيل الدخول لاستخدام المساعد الذكي" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // جلب المستخدم + تحليل الجسم بالتوازي
    const [authRes, bodyData] = await Promise.all([
      userClient.auth.getUser(),
      req.json().catch(() => ({})),
    ]);
    const { data: userData, error: userError } = authRes;
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مجدداً" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // التحقق من الدور + Rate limiting بالتوازي
    const [roleRes, rlRes] = await Promise.all([
      serviceClient.from("user_roles").select("role").eq("user_id", userData.user.id).single(),
      serviceClient.rpc('check_rate_limit', { p_key: `ai:${userData.user.id}`, p_limit: 30, p_window_seconds: 60 }),
    ]);

    if (rlRes.error) {
      console.error("ai rate_limit check failed");
      return new Response(
        JSON.stringify({ error: "خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (rlRes.data) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى الانتظار دقيقة" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleRes.data?.role) {
      console.error("ai-assistant: failed to fetch role for authenticated user");
      return new Response(
        JSON.stringify({ error: "لم يتم التعرف على صلاحياتك. يرجى التواصل مع الناظر." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userRole = roleRes.data.role;

    // ─── تحليل المدخلات ───
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const { messages, mode: rawMode } = bodyData;

    const mode: AllowedMode = ALLOWED_MODES.includes(rawMode) ? rawMode as AllowedMode : "chat";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "الرسائل مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeMessages = messages.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: typeof m.content === "string" ? m.content.slice(0, 2000) : "",
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ─── جلب البيانات مع cache ───
    const isAdmin = userRole === "admin" || userRole === "accountant";
    const cacheKey = `${userData.user.id}:${userRole}`;
    let dataContext = forceRefresh ? null : dataCache.get(cacheKey);
    if (!dataContext) {
      dataContext = await fetchWaqfData(userClient, userRole, userData.user.id);
      dataCache.set(cacheKey, dataContext);
    }

    // ─── بناء system prompt ───
    let systemPrompt = buildSystemPrompt(mode, isAdmin);
    systemPrompt += `\n\n## بيانات الوقف (من قاعدة البيانات):\n${dataContext}`;
    systemPrompt += `\n\n**تعليمات مهمة:** استخدم هذه البيانات للإجابة على أسئلة المستخدم. عند ذكر أرقام أو إحصائيات، اعتمد على هذه البيانات وليس على تخمينات. إذا لم تجد بيانات كافية للإجابة، أخبر المستخدم بذلك.`;

    // ─── استدعاء AI Gateway ───
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: mode === "analysis" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...safeMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد لاستخدام المساعد الذكي." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e instanceof Error ? e.message : "Unknown error");
    return new Response(JSON.stringify({ error: "حدث خطأ داخلي" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
