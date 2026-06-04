// ═══════════════════════════════════════════════════════════════════════════════
// generate-invoice-pdf — توليد فواتير PDF بالعربية مع QR ZATCA
// ───────────────────────────────────────────────────────────────────────────────
// الهيكل:
//   - index.ts             ← HTTP handler + validation + storage
//   - pdf-renderer.ts      ← توليد المستند ذاته (Amiri/QR)
//   - settings-fetcher.ts  ← جلب إعدادات الوقف وأنواع البيانات
// ═══════════════════════════════════════════════════════════════════════════════

import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { z } from "npm:zod@3";
import { generateInvoicePdf } from "./pdf-renderer.ts";
import { fetchWaqfSettings } from "./settings-fetcher.ts";

const MAX_INVOICES_PER_REQUEST = 20;

const BodySchema = z.object({
  invoice_ids: z
    .array(z.string().uuid({ message: "صيغة معرّف الفاتورة غير صالحة" }))
    .min(1, "invoice_ids array is required")
    .max(MAX_INVOICES_PER_REQUEST, `Maximum ${MAX_INVOICES_PER_REQUEST} invoices at a time`),
  table: z.enum(["invoices", "payment_invoices"]).optional(),
  force_regenerate: z.boolean().optional(),
});

Deno.serve(async (req): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) المصادقة الموحّدة (Bearer + getUser + role + rate limit)
    const auth = await authenticate(req, corsHeaders, {
      allowedRoles: ["admin", "accountant"],
      rateLimitKey: "pdf_gen",
      rateLimit: 10,
      rateLimitWindowSeconds: 60,
    });
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    // 2) Body validation موحّد (Zod)
    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
      return jsonError(firstMsg, 400, corsHeaders);
    }
    const { invoice_ids, table: sourceTable, force_regenerate } = parsed.data;
    const tableName = sourceTable === "payment_invoices" ? "payment_invoices" : "invoices";
    const forceRegenerate = force_regenerate === true;


    // 3) جلب الفواتير + الإعدادات بالتوازي
    const [invoicesRes, waqfSettings] = await Promise.all([
      admin.from(tableName).select("*").in("id", invoice_ids),
      fetchWaqfSettings(admin),
    ]);
    if (invoicesRes.error) throw invoicesRes.error;
    const invoices = invoicesRes.data;
    if (!invoices || invoices.length === 0) {
      return jsonError("No invoices found", 404, corsHeaders);
    }

    // 4) توليد و رفع كل فاتورة
    const results: { id: string; invoice_number: string | null; success: boolean; error?: string }[] = [];

    for (const invoice of invoices) {
      try {
        if (invoice.file_path && !forceRegenerate) {
          results.push({ id: invoice.id, invoice_number: invoice.invoice_number, success: true, error: "already has file" });
          continue;
        }

        const pdfBytes = await generateInvoicePdf({
          invoice_number: invoice.invoice_number,
          invoice_type: invoice.invoice_type,
          amount: invoice.amount,
          date: invoice.date,
          description: invoice.description,
          status: invoice.status,
          vat_rate: invoice.vat_rate ?? 0,
          vat_amount: invoice.vat_amount ?? 0,
          amount_excluding_vat: invoice.amount_excluding_vat ?? null,
        }, waqfSettings);

        // تعقيم اسم الملف لمنع path traversal
        const rawName = (invoice.invoice_number || invoice.id) as string;
        const safeName = rawName.replace(/[./\\]+/g, "_");
        const fileName = `${safeName}.pdf`;
        const storagePath = `generated/${fileName}`;

        const { error: uploadError } = await admin.storage
          .from("invoices")
          .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
        if (uploadError) throw uploadError;

        const updateData: Record<string, string> = { file_path: storagePath };
        if (tableName === "invoices") updateData.file_name = fileName;
        const { error: updateError } = await admin.from(tableName).update(updateData).eq("id", invoice.id);
        if (updateError) throw updateError;

        results.push({ id: invoice.id, invoice_number: invoice.invoice_number, success: true });
      } catch (err) {
        console.error("generate-invoice-pdf item error:", err instanceof Error ? err.message : String(err));
        results.push({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          success: false,
          error: "فشل توليد الفاتورة",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-invoice-pdf error:", err instanceof Error ? err.message : String(err));
    return jsonError("حدث خطأ في معالجة الفواتير", 500, corsHeaders);
  }
});

function jsonError(message: string, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
