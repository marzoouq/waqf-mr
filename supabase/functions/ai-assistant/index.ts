import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ─── Cache بسيط في الذاكرة لتقليل استعلامات DB المتكررة ───
class SimpleCache {
  private cache = new Map<string, { data: string; ts: number }>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(ttlMs = 60_000, maxSize = 50) {
    this.ttl = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, ts: Date.now() });
  }
}

const dataCache = new SimpleCache();

// #51: قائمة بيضاء للأوضاع المسموحة
const ALLOWED_MODES = ["chat", "analysis", "report"] as const;
type AllowedMode = (typeof ALLOWED_MODES)[number];

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

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limiting: 30 طلب/دقيقة لكل مستخدم
    const { data: isLimited, error: rlError } = await serviceClient.rpc('check_rate_limit', {
      p_key: `ai:${userData.user.id}`,
      p_limit: 30,
      p_window_seconds: 60,
    });
    if (rlError) {
      console.error("ai rate_limit check failed");
      return new Response(
        JSON.stringify({ error: "خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (isLimited) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى الانتظار دقيقة" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (!roleData?.role) {
      console.error("ai-assistant: failed to fetch role for authenticated user");
      return new Response(
        JSON.stringify({ error: "لم يتم التعرف على صلاحياتك. يرجى التواصل مع الناظر." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userRole = roleData.role;

    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const { messages, mode: rawMode } = await req.json();

    // #51: التحقق من صحة الوضع
    const mode: AllowedMode = (ALLOWED_MODES as readonly string[]).includes(rawMode) ? rawMode as AllowedMode : "chat";

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

    // ─── جلب البيانات مع cache لتقليل استعلامات DB المتكررة ───
    const cacheKey = `${userData.user.id}:${userRole}`;
    let dataContext = forceRefresh ? null : dataCache.get(cacheKey);
    if (!dataContext) {
      dataContext = await fetchWaqfData(userClient, userRole, userData.user.id);
      dataCache.set(cacheKey, dataContext);
    }

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

    // إضافة البيانات إلى السياق — بعد التجريد
    systemPrompt += `\n\n## بيانات الوقف (من قاعدة البيانات):\n${dataContext}`;
    systemPrompt += `\n\n**تعليمات مهمة:** استخدم هذه البيانات للإجابة على أسئلة المستخدم. عند ذكر أرقام أو إحصائيات، اعتمد على هذه البيانات وليس على تخمينات. إذا لم تجد بيانات كافية للإجابة، أخبر المستخدم بذلك.`;

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

// ─── #43: تحويل المبالغ إلى نطاقات مجمّعة لحماية الخصوصية ───
function toRange(amount: number): string {
  if (amount <= 0) return "0";
  if (amount < 10_000) return "أقل من 10,000";
  if (amount < 50_000) return "10,000 - 50,000";
  if (amount < 100_000) return "50,000 - 100,000";
  if (amount < 500_000) return "100,000 - 500,000";
  if (amount < 1_000_000) return "500,000 - مليون";
  return "أكثر من مليون";
}

// ─── دالة جلب بيانات الوقف من قاعدة البيانات ───
async function fetchWaqfData(
  client: SupabaseClient,
  userRole: string,
  userId: string
): Promise<string> {
  const sections: string[] = [];
  const isAdmin = userRole === "admin" || userRole === "accountant";

  try {
    // 1. السنوات المالية
    const { data: fiscalYears } = await client
      .from("fiscal_years")
      .select("id, label, status, published, start_date, end_date")
      .order("start_date", { ascending: false })
      .limit(5);

    if (fiscalYears?.length) {
      sections.push("### السنوات المالية:");
      for (const fy of fiscalYears) {
        sections.push(`- **${fy.label}**: الحالة: ${fy.status === "active" ? "نشطة" : fy.status === "closed" ? "مقفلة" : fy.status} | ${fy.published ? "منشورة" : "غير منشورة"} | من ${fy.start_date} إلى ${fy.end_date}`);
      }
    }

    // 2. جلب نسب الناظر والواقف الفعلية من الإعدادات
    const { data: pctSettings } = await client
      .from("app_settings")
      .select("key, value")
      .in("key", ["admin_share_percentage", "waqif_share_percentage"]);
    const pctMap: Record<string, string> = {};
    for (const r of pctSettings ?? []) pctMap[r.key] = r.value;
    const adminPct = pctMap["admin_share_percentage"] || "10";
    const waqifPct = pctMap["waqif_share_percentage"] || "5";

    // 3. الحسابات المالية — #59: فلتر السنوات المنشورة فقط لغير الأدمن
    const accountsQuery = client
      .from("accounts")
      .select("*, fiscal_year_id")
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: accounts } = await accountsQuery;

    // #59: فلتر الحسابات للسنوات المنشورة فقط لغير الأدمن
    const publishedFYIds = new Set(
      (fiscalYears ?? []).filter(fy => fy.published || fy.status === "active").map(fy => fy.id)
    );
    const filteredAccounts = isAdmin
      ? accounts
      : accounts?.filter(acc => publishedFYIds.has(acc.fiscal_year_id));

    if (filteredAccounts?.length) {
      if (isAdmin) {
        // #43: الأدمن يرى الأرقام الحقيقية (مسؤول عن الإدارة)
        sections.push("\n### الحسابات المالية:");
        for (const acc of filteredAccounts) {
          sections.push(`**السنة: ${acc.fiscal_year}**`);
          sections.push(`- إجمالي الدخل: ${Number(acc.total_income).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- إجمالي المصروفات: ${Number(acc.total_expenses).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- صافي بعد المصروفات: ${Number(acc.net_after_expenses).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- الزكاة: ${Number(acc.zakat_amount).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- الضريبة: ${Number(acc.vat_amount).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- حصة الناظر (${adminPct}%): ${Number(acc.admin_share).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- حصة الواقف (${waqifPct}%): ${Number(acc.waqif_share).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- ريع الوقف للتوزيع: ${Number(acc.waqf_revenue).toLocaleString("ar-SA")} ر.س`);
        }
      } else {
        // #43: المستفيد/الواقف يرى نطاقات مالية فقط بدون أرقام دقيقة
        sections.push("\n### ملخص مالي عام:");
        for (const acc of filteredAccounts) {
          sections.push(`**السنة: ${acc.fiscal_year}**`);
          sections.push(`- نطاق الدخل: ${toRange(Number(acc.total_income))} ر.س`);
          sections.push(`- نطاق المصروفات: ${toRange(Number(acc.total_expenses))} ر.س`);
          sections.push(`- نطاق ريع الوقف: ${toRange(Number(acc.waqf_revenue))} ر.س`);
        }
      }
    }

    // 3. العقارات — معلومات عامة آمنة
    const { data: properties } = await client
      .from("properties")
      .select("property_number, property_type, location, area")
      .limit(20);

    if (properties?.length) {
      sections.push(`\n### العقارات (${properties.length} عقار):`);
      for (const p of properties) {
        sections.push(`- ${p.property_number} | ${p.property_type} | ${p.location} | ${p.area} م²`);
      }
    }

    // 4. العقود النشطة — بيانات مجمّعة بدون أسماء مستأجرين
    if (isAdmin) {
      const { data: contracts } = await client
        .from("contracts")
        .select("contract_number, rent_amount, start_date, end_date, status, payment_type")
        .eq("status", "active")
        .limit(30);

      if (contracts?.length) {
        const totalRent = contracts.reduce((s, c) => s + Number(c.rent_amount), 0);
        const byType: Record<string, { count: number; total: number }> = {};
        for (const c of contracts) {
          const key = c.payment_type === "annual" ? "سنوي" : c.payment_type === "monthly" ? "شهري" : "دفعات";
          if (!byType[key]) byType[key] = { count: 0, total: 0 };
          byType[key].count++;
          byType[key].total += Number(c.rent_amount);
        }
        sections.push(`\n### العقود النشطة (${contracts.length} عقد):`);
        sections.push(`- إجمالي الإيجارات: ${totalRent.toLocaleString("ar-SA")} ر.س`);
        for (const [type, info] of Object.entries(byType)) {
          sections.push(`  - ${type}: ${info.count} عقد | ${info.total.toLocaleString("ar-SA")} ر.س`);
        }
        const sorted = [...contracts].sort((a, b) => a.end_date.localeCompare(b.end_date));
        const soonest = sorted[0];
        if (soonest) {
          sections.push(`- أقرب انتهاء: عقد ${soonest.contract_number} في ${soonest.end_date}`);
        }
      }
    } else {
      const { count } = await client
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      if (count && count > 0) {
        sections.push(`\n### العقود: يوجد ${count} عقد نشط حالياً.`);
      }
    }

    // 5. ملخص الدخل حسب المصدر (آخر سنة مالية)
    const activeFY = fiscalYears?.find(fy => fy.status === "active");
    // #59: للمستفيد/الواقف لا نعرض بيانات سنة غير منشورة
    if (activeFY && (isAdmin || activeFY.published)) {
      const { data: income } = await client
        .from("income")
        .select("source, amount, date")
        .eq("fiscal_year_id", activeFY.id)
        .order("date", { ascending: false })
        .limit(500);

      if (income?.length) {
        const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
        const bySrc: Record<string, number> = {};
        for (const i of income) {
          bySrc[i.source] = (bySrc[i.source] || 0) + Number(i.amount);
        }
        sections.push(`\n### الدخل للسنة النشطة (${activeFY.label}):`);
        if (isAdmin) {
          sections.push(`- إجمالي الدخل: ${totalIncome.toLocaleString("ar-SA")} ر.س (${income.length} سجل)`);
          for (const [src, amt] of Object.entries(bySrc)) {
            sections.push(`  - ${src}: ${amt.toLocaleString("ar-SA")} ر.س`);
          }
        } else {
          // #43: نطاقات مالية فقط لغير الأدمن
          sections.push(`- نطاق الدخل: ${toRange(totalIncome)} ر.س`);
          sections.push(`- عدد مصادر الدخل: ${Object.keys(bySrc).length}`);
        }
      }

      // 6. ملخص المصروفات حسب النوع
      const { data: expenses } = await client
        .from("expenses")
        .select("expense_type, amount, date")
        .eq("fiscal_year_id", activeFY.id)
        .limit(500);

      if (expenses?.length) {
        const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
        const byType: Record<string, number> = {};
        for (const e of expenses) {
          byType[e.expense_type] = (byType[e.expense_type] || 0) + Number(e.amount);
        }
        sections.push(`\n### المصروفات للسنة النشطة (${activeFY.label}):`);
        if (isAdmin) {
          sections.push(`- إجمالي المصروفات: ${totalExp.toLocaleString("ar-SA")} ر.س (${expenses.length} سجل)`);
          for (const [type, amt] of Object.entries(byType)) {
            sections.push(`  - ${type}: ${amt.toLocaleString("ar-SA")} ر.س`);
          }
        } else {
          sections.push(`- نطاق المصروفات: ${toRange(totalExp)} ر.س`);
          sections.push(`- عدد أنواع المصروفات: ${Object.keys(byType).length}`);
        }
      }
    }

    // 7. المستفيدون — #43: إخفاء الأسماء واستبدالها بمراجع مجهولة
    if (isAdmin) {
      const { data: beneficiaries } = await client
        .from("beneficiaries")
        .select("share_percentage")
        .order("share_percentage", { ascending: false })
        .limit(50);

      if (beneficiaries?.length) {
        const totalPct = beneficiaries.reduce((s, b) => s + Number(b.share_percentage), 0);
        sections.push(`\n### المستفيدون (${beneficiaries.length} مستفيد):`);
        beneficiaries.forEach((b, i) => {
          sections.push(`- مستفيد ${i + 1}: ${b.share_percentage}%`);
        });
        sections.push(`- **إجمالي النسب: ${totalPct}%**`);
      }
    } else {
      const { data: myBeneficiary } = await client
        .from("beneficiaries")
        .select("share_percentage")
        .eq("user_id", userId)
        .single();

      if (myBeneficiary) {
        sections.push(`\n### بياناتك كمستفيد:`);
        sections.push(`- نسبة الحصة: ${myBeneficiary.share_percentage}%`);
      }
    }

    // 8. التوزيعات الأخيرة — مجمّعة بدون أسماء
    if (isAdmin) {
      const { data: distributions } = await client
        .from("distributions")
        .select("amount, date, status")
        .order("date", { ascending: false })
        .limit(20);

      if (distributions?.length) {
        const totalDist = distributions.reduce((s, d) => s + Number(d.amount), 0);
        const pending = distributions.filter(d => d.status === "pending").length;
        const paid = distributions.filter(d => d.status === "paid").length;
        sections.push(`\n### آخر التوزيعات:`);
        sections.push(`- إجمالي: ${totalDist.toLocaleString("ar-SA")} ر.س | مدفوعة: ${paid} | معلقة: ${pending}`);
      }
    } else {
      const { data: myBen } = await client
        .from("beneficiaries")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (myBen) {
        const { data: myDists } = await client
          .from("distributions")
          .select("amount, date, status")
          .eq("beneficiary_id", myBen.id)
          .order("date", { ascending: false })
          .limit(10);

        if (myDists?.length) {
          const myTotal = myDists.reduce((s, d) => s + Number(d.amount), 0);
          sections.push(`\n### توزيعاتك:`);
          // #43: نطاقات مالية لغير الأدمن
          sections.push(`- نطاق إجمالي حصتك: ${toRange(myTotal)} ر.س (${myDists.length} توزيعة)`);
        }
      }
    }

    // 9. العقود المنتهية أو قريبة الانتهاء (للمشرفين فقط) — بدون أسماء مستأجرين
    if (isAdmin) {
      const { data: expiring } = await client
        .from("contracts")
        .select("contract_number, end_date, rent_amount")
        .eq("status", "active")
        .lte("end_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("end_date", { ascending: true })
        .limit(10);

      if (expiring?.length) {
        const totalExpRent = expiring.reduce((s, c) => s + Number(c.rent_amount), 0);
        sections.push(`\n### ⚠️ عقود تنتهي خلال 30 يوماً (${expiring.length}):`);
        sections.push(`- إجمالي إيجاراتها: ${totalExpRent.toLocaleString("ar-SA")} ر.س`);
        for (const c of expiring) {
          sections.push(`- عقد ${c.contract_number} | ينتهي ${c.end_date} | ${Number(c.rent_amount).toLocaleString("ar-SA")} ر.س`);
        }
      }
    }

  } catch (err) {
    console.error("Error fetching waqf data:", err instanceof Error ? err.message : err);
    sections.push("⚠️ تعذر جلب بعض البيانات من قاعدة البيانات.");
  }

  return sections.length > 0 ? sections.join("\n") : "لا توجد بيانات متوفرة حالياً.";
}
