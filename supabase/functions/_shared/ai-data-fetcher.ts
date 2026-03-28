/**
 * جلب بيانات الوقف من قاعدة البيانات للمساعد الذكي
 * مفصول عن index.ts لسهولة الصيانة والاختبار
 */
import { SupabaseClient } from "npm:@supabase/supabase-js@2";

// ─── تحويل المبالغ إلى نطاقات مجمّعة لحماية الخصوصية ───
function toRange(amount: number): string {
  if (amount <= 0) return "0";
  if (amount < 10_000) return "أقل من 10,000";
  if (amount < 50_000) return "10,000 - 50,000";
  if (amount < 100_000) return "50,000 - 100,000";
  if (amount < 500_000) return "100,000 - 500,000";
  if (amount < 1_000_000) return "500,000 - مليون";
  return "أكثر من مليون";
}

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

export const dataCache = new SimpleCache();

/**
 * جلب بيانات الوقف حسب دور المستخدم
 */
export async function fetchWaqfData(
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

    // 2. نسب الناظر والواقف الفعلية
    const { data: pctSettings } = await client
      .from("app_settings")
      .select("key, value")
      .in("key", ["admin_share_percentage", "waqif_share_percentage"]);
    const pctMap: Record<string, string> = {};
    for (const r of pctSettings ?? []) pctMap[r.key] = r.value;
    const adminPct = pctMap["admin_share_percentage"] || "10";
    const waqifPct = pctMap["waqif_share_percentage"] || "5";

    // 3. الحسابات المالية
    const accountsQuery = client
      .from("accounts")
      .select("*, fiscal_year_id")
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: accounts } = await accountsQuery;

    const publishedFYIds = new Set(
      (fiscalYears ?? []).filter(fy => fy.published || fy.status === "active").map(fy => fy.id)
    );
    const filteredAccounts = isAdmin
      ? accounts
      : accounts?.filter(acc => publishedFYIds.has(acc.fiscal_year_id));

    if (filteredAccounts?.length) {
      if (isAdmin) {
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
        sections.push("\n### ملخص مالي عام:");
        for (const acc of filteredAccounts) {
          sections.push(`**السنة: ${acc.fiscal_year}**`);
          sections.push(`- نطاق الدخل: ${toRange(Number(acc.total_income))} ر.س`);
          sections.push(`- نطاق المصروفات: ${toRange(Number(acc.total_expenses))} ر.س`);
          sections.push(`- نطاق ريع الوقف: ${toRange(Number(acc.waqf_revenue))} ر.س`);
        }
      }
    }

    // 4. العقارات
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

    // 5. العقود النشطة
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

    // 6. ملخص الدخل حسب المصدر
    const activeFY = fiscalYears?.find(fy => fy.status === "active");
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
          sections.push(`- نطاق الدخل: ${toRange(totalIncome)} ر.س`);
          sections.push(`- عدد مصادر الدخل: ${Object.keys(bySrc).length}`);
        }
      }

      // 7. ملخص المصروفات حسب النوع
      const { data: expenses } = await client
        .from("expenses")
        .select("expense_type, amount, date")
        .eq("fiscal_year_id", activeFY.id)
        .limit(500);

      if (expenses?.length) {
        const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
        const byExpType: Record<string, number> = {};
        for (const e of expenses) {
          byExpType[e.expense_type] = (byExpType[e.expense_type] || 0) + Number(e.amount);
        }
        sections.push(`\n### المصروفات للسنة النشطة (${activeFY.label}):`);
        if (isAdmin) {
          sections.push(`- إجمالي المصروفات: ${totalExp.toLocaleString("ar-SA")} ر.س (${expenses.length} سجل)`);
          for (const [type, amt] of Object.entries(byExpType)) {
            sections.push(`  - ${type}: ${amt.toLocaleString("ar-SA")} ر.س`);
          }
        } else {
          sections.push(`- نطاق المصروفات: ${toRange(totalExp)} ر.س`);
          sections.push(`- عدد أنواع المصروفات: ${Object.keys(byExpType).length}`);
        }
      }
    }

    // 8. المستفيدون
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

    // 9. التوزيعات الأخيرة
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
          sections.push(`- نطاق إجمالي حصتك: ${toRange(myTotal)} ر.س (${myDists.length} توزيعة)`);
        }
      }
    }

    // 10. العقود المنتهية أو قريبة الانتهاء
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
