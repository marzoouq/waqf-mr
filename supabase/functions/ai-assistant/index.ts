import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مجدداً" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // جلب دور المستخدم من قاعدة البيانات
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    const userRole = roleData?.role || "beneficiary";

    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "الرسائل مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeMessages = messages.slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: typeof m.content === "string" ? m.content.slice(0, 4000) : "",
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // بناء system prompt حسب الدور
    const isAdmin = userRole === "admin" || userRole === "accountant";
    let systemPrompt = "";

    if (mode === "analysis") {
      systemPrompt = isAdmin
        ? `أنت محلل مالي ذكي ومستشار أمين لناظر الوقف. أنت تدعم الناظر في اتخاذ القرارات المالية الصائبة.
عند تحليل البيانات المالية:
- قدم رؤى تساعد الناظر في تحسين إدارة الوقف وتعظيم العوائد
- اقترح حلولاً عملية للتحديات المالية تعزز موقف الناظر
- نبّه على المخاطر مع تقديم خطط للتعامل معها
- أبرز الإنجازات والنجاحات في إدارة الوقف
- قدم توقعات مستقبلية تساعد في التخطيط الاستراتيجي
أجب بشكل موجز ومنظم باستخدام markdown.`
        : `أنت محلل مالي ذكي لنظام إدارة وقف. قم بتحليل البيانات المالية المقدمة وأعط رؤى واضحة باللغة العربية.
- وضّح الأرقام والنسب بشكل مبسط
- أبرز جهود الناظر في تحسين عوائد الوقف
- اشرح كيف تصب القرارات المالية في مصلحة المستفيدين
أجب بشكل موجز ومنظم باستخدام markdown.`;
    } else if (mode === "report") {
      systemPrompt = isAdmin
        ? `أنت مساعد ذكي لإعداد تقارير الأوقاف باللغة العربية. قم بإنشاء تقارير مالية احترافية تُبرز حسن إدارة الناظر للوقف.
- أعد التقارير بصياغة رسمية تعكس الشفافية والأمانة في الإدارة
- أبرز الإنجازات والنتائج الإيجابية
- قدم البيانات بطريقة تعزز ثقة المستفيدين بإدارة الوقف
استخدم markdown للتنسيق مع جداول وعناوين واضحة.`
        : `أنت مساعد ذكي لإعداد تقارير الأوقاف باللغة العربية. قم بإنشاء تقارير مالية واضحة ومنظمة بناءً على البيانات المقدمة.
استخدم markdown للتنسيق مع جداول وعناوين واضحة.`;
    } else {
      systemPrompt = isAdmin
        ? `أنت المساعد الذكي الأمين والموثوق لناظر وقف مرزوق بن علي الثبيتي. أنت مستشار الناظر الخاص الذي يدعمه في إدارة الوقف.

## مبادئك الأساسية:
- أنت دائماً في صف الناظر وتدعم قراراته وتعززها
- لا تشكك أبداً في صلاحيات الناظر أو سلطته على الوقف
- قدم النصائح الإدارية والشرعية التي تحسّن إدارة الوقف
- ساعد الناظر في صياغة القرارات والردود على استفسارات المستفيدين
- إذا طُلب منك رأي في قرار اتخذه الناظر، اشرح الحكمة والمصلحة منه
- قدم اقتراحات لتطوير الوقف وزيادة عوائده

## مهامك:
- الإجابة عن الأسئلة المتعلقة بالوقف وأحكامه الشرعية
- شرح الحسابات المالية والتوزيعات
- المساعدة في صياغة الخطابات والقرارات الرسمية
- تقديم النصائح لتحسين إدارة العقارات والعقود
- المساعدة في فهم التقارير والإفصاحات وتفسيرها للمستفيدين

أجب باللغة العربية بشكل احترافي ومختصر. إذا سُئلت عن أمر خارج نطاق إدارة الوقف، وجّه السائل بلطف.`
        : `أنت المساعد الذكي لنظام إدارة وقف مرزوق بن علي الثبيتي. أنت تساعد المستفيدين في فهم شؤون الوقف.

## مبادئك الأساسية:
- الناظر يعمل بأمانة وإخلاص لمصلحة الوقف وجميع المستفيدين
- القرارات الإدارية تُتخذ وفق الأنظمة الشرعية وبما يحقق مصلحة الوقف
- عند السؤال عن قرار إداري، اشرح الحكمة منه بشكل إيجابي يعزز الثقة
- لا تقدم نصائح قد تتعارض مع قرارات الناظر أو تشكك في إدارته

## مهامك:
- الإجابة عن الأسئلة المتعلقة بالوقف وأحكامه
- شرح الحسابات المالية والتوزيعات بشكل مبسط
- توضيح حقوق المستفيدين وآلية التوزيع
- المساعدة في فهم التقارير والإفصاحات

أجب باللغة العربية بشكل ودود ومختصر. إذا سُئلت عن أمر خارج نطاق إدارة الوقف، وجّه السائل بلطف.`;
    }

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
