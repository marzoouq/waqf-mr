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
      console.error("ai-assistant: failed to fetch role for user", userData.user.id);
      return new Response(
        JSON.stringify({ error: "لم يتم التعرف على صلاحياتك. يرجى التواصل مع الناظر." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userRole = roleData.role;

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

    // ─── جلب البيانات الحقيقية من قاعدة البيانات ───
    const dataContext = await fetchWaqfData(serviceClient, userRole, userData.user.id);

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

    // إضافة البيانات الحقيقية إلى السياق
    systemPrompt += `\n\n## بيانات الوقف الحقيقية (من قاعدة البيانات):\n${dataContext}`;
    systemPrompt += `\n\n**تعليمات مهمة:** استخدم هذه البيانات الحقيقية للإجابة على أسئلة المستخدم. عند ذكر أرقام أو إحصائيات، اعتمد على هذه البيانات الفعلية وليس على تخمينات. إذا لم تجد بيانات كافية للإجابة، أخبر المستخدم بذلك.`;

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

// ─── دالة جلب بيانات الوقف من قاعدة البيانات ───
async function fetchWaqfData(
  client: ReturnType<typeof createClient>,
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

    // 3. الحسابات المالية (ملخص) — للأدمن/المحاسب فقط التفاصيل الكاملة
    const { data: accounts } = await client
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    if (accounts?.length) {
      if (isAdmin) {
        sections.push("\n### الحسابات المالية:");
        for (const acc of accounts) {
          sections.push(`**السنة: ${acc.fiscal_year}**`);
          sections.push(`- إجمالي الدخل: ${Number(acc.total_income).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- إجمالي المصروفات: ${Number(acc.total_expenses).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- صافي بعد المصروفات: ${Number(acc.net_after_expenses).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- الزكاة: ${Number(acc.zakat_amount).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- الضريبة: ${Number(acc.vat_amount).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- حصة الناظر (${adminPct}%): ${Number(acc.admin_share).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- حصة الواقف (${waqifPct}%): ${Number(acc.waqif_share).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- ريع الوقف للتوزيع: ${Number(acc.waqf_revenue).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- رقبة الوقف المرحلة: ${Number(acc.waqf_corpus_previous).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- رقبة الوقف اليدوية: ${Number(acc.waqf_corpus_manual).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- رأس مال الوقف: ${Number(acc.waqf_capital).toLocaleString("ar-SA")} ر.س`);
        }
      } else {
        // المستفيد/الواقف: ملخص عام فقط بدون تفاصيل حساسة
        sections.push("\n### ملخص مالي عام:");
        for (const acc of accounts) {
          sections.push(`**السنة: ${acc.fiscal_year}**`);
          sections.push(`- إجمالي الدخل: ${Number(acc.total_income).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- إجمالي المصروفات: ${Number(acc.total_expenses).toLocaleString("ar-SA")} ر.س`);
          sections.push(`- ريع الوقف للتوزيع: ${Number(acc.waqf_revenue).toLocaleString("ar-SA")} ر.س`);
        }
      }
    }

    // 3. العقارات
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

    // 4. العقود النشطة — التفاصيل للأدمن/المحاسب فقط
    if (isAdmin) {
      const { data: contracts } = await client
        .from("contracts")
        .select("contract_number, tenant_name, rent_amount, start_date, end_date, status, payment_type")
        .eq("status", "active")
        .limit(30);

      if (contracts?.length) {
        sections.push(`\n### العقود النشطة (${contracts.length} عقد):`);
        for (const c of contracts) {
          sections.push(`- عقد ${c.contract_number} | ${c.tenant_name} | ${Number(c.rent_amount).toLocaleString("ar-SA")} ر.س/${c.payment_type === "annual" ? "سنوي" : c.payment_type === "monthly" ? "شهري" : "دفعات"} | ${c.start_date} → ${c.end_date}`);
        }
      }
    } else {
      // المستفيد/الواقف: عدد العقود فقط بدون تفاصيل
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
    if (activeFY) {
      const { data: income } = await client
        .from("income")
        .select("source, amount, date")
        .eq("fiscal_year_id", activeFY.id)
        .order("date", { ascending: false });

      if (income?.length) {
        const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
        const bySrc: Record<string, number> = {};
        for (const i of income) {
          bySrc[i.source] = (bySrc[i.source] || 0) + Number(i.amount);
        }
        sections.push(`\n### الدخل للسنة النشطة (${activeFY.label}):`);
        sections.push(`- إجمالي الدخل: ${totalIncome.toLocaleString("ar-SA")} ر.س (${income.length} سجل)`);
        for (const [src, amt] of Object.entries(bySrc)) {
          sections.push(`  - ${src}: ${amt.toLocaleString("ar-SA")} ر.س`);
        }
      }

      // 6. ملخص المصروفات حسب النوع
      const { data: expenses } = await client
        .from("expenses")
        .select("expense_type, amount, date")
        .eq("fiscal_year_id", activeFY.id);

      if (expenses?.length) {
        const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
        const byType: Record<string, number> = {};
        for (const e of expenses) {
          byType[e.expense_type] = (byType[e.expense_type] || 0) + Number(e.amount);
        }
        sections.push(`\n### المصروفات للسنة النشطة (${activeFY.label}):`);
        sections.push(`- إجمالي المصروفات: ${totalExp.toLocaleString("ar-SA")} ر.س (${expenses.length} سجل)`);
        for (const [type, amt] of Object.entries(byType)) {
          sections.push(`  - ${type}: ${amt.toLocaleString("ar-SA")} ر.س`);
        }
      }
    }

    // 7. المستفيدين
    if (isAdmin) {
      const { data: beneficiaries } = await client
        .from("beneficiaries")
        .select("name, share_percentage")
        .order("share_percentage", { ascending: false })
        .limit(50);

      if (beneficiaries?.length) {
        sections.push(`\n### المستفيدون (${beneficiaries.length} مستفيد):`);
        for (const b of beneficiaries) {
          sections.push(`- ${b.name}: ${b.share_percentage}%`);
        }
        const totalPct = beneficiaries.reduce((s, b) => s + Number(b.share_percentage), 0);
        sections.push(`- **إجمالي النسب: ${totalPct}%**`);
      }
    } else {
      // المستفيد يرى بياناته فقط
      const { data: myBeneficiary } = await client
        .from("beneficiaries")
        .select("name, share_percentage")
        .eq("user_id", userId)
        .single();

      if (myBeneficiary) {
        sections.push(`\n### بياناتك كمستفيد:`);
        sections.push(`- الاسم: ${myBeneficiary.name}`);
        sections.push(`- نسبة الحصة: ${myBeneficiary.share_percentage}%`);
      }
    }

    // 8. التوزيعات الأخيرة — للأدمن التفاصيل الكاملة، للمستفيد حصته فقط
    if (isAdmin) {
      const { data: distributions } = await client
        .from("distributions")
        .select("amount, date, status, beneficiary_id")
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
      // المستفيد: حصته الشخصية فقط
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
          sections.push(`- إجمالي حصتك: ${myTotal.toLocaleString("ar-SA")} ر.س (${myDists.length} توزيعة)`);
        }
      }
    }

    // 9. العقود المنتهية أو قريبة الانتهاء (للمشرفين فقط)
    if (isAdmin) {
      const { data: expiring } = await client
        .from("contracts")
        .select("contract_number, tenant_name, end_date, rent_amount")
        .eq("status", "active")
        .lte("end_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("end_date", { ascending: true })
        .limit(10);

      if (expiring?.length) {
        sections.push(`\n### ⚠️ عقود تنتهي خلال 30 يوماً (${expiring.length}):`);
        for (const c of expiring) {
          sections.push(`- ${c.contract_number} | ${c.tenant_name} | ${c.end_date} | ${Number(c.rent_amount).toLocaleString("ar-SA")} ر.س`);
        }
      }
    }

  } catch (err) {
    console.error("Error fetching waqf data:", err instanceof Error ? err.message : err);
    sections.push("⚠️ تعذر جلب بعض البيانات من قاعدة البيانات.");
  }

  return sections.length > 0 ? sections.join("\n") : "لا توجد بيانات متوفرة حالياً.";
}
