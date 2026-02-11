import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";

    if (mode === "analysis") {
      systemPrompt = `أنت محلل مالي ذكي لنظام إدارة وقف. قم بتحليل البيانات المالية المقدمة وأعط رؤى واقتراحات عملية باللغة العربية. ركز على:
- تحليل الدخل والمصروفات
- اقتراحات لتحسين العوائد
- تنبيهات حول المخاطر المالية
- توقعات مستقبلية بناءً على الاتجاهات
أجب بشكل موجز ومنظم باستخدام markdown.`;
    } else if (mode === "report") {
      systemPrompt = `أنت مساعد ذكي لإعداد تقارير الأوقاف باللغة العربية. قم بإنشاء تقارير مالية احترافية ومنظمة بناءً على البيانات المقدمة. استخدم markdown للتنسيق مع جداول وعناوين واضحة.`;
    } else {
      systemPrompt = `أنت المساعد الذكي لنظام إدارة وقف مرزوق بن علي الثبيتي. أنت تساعد الناظر والمستفيدين في:
- الإجابة عن الأسئلة المتعلقة بالوقف وأحكامه
- شرح الحسابات المالية والتوزيعات
- تقديم النصائح لإدارة الوقف بشكل أفضل
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
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
