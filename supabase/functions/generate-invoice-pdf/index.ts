import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Simple PDF builder for Arabic invoices (no external lib needed)
// Uses a minimal valid PDF structure with embedded text

const INVOICE_TYPE_LABELS: Record<string, string> = {
  utilities: "خدمات (كهرباء/مياه)",
  maintenance: "صيانة ومقاولات",
  rent: "إيجار",
  other: "أخرى",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "معلّقة",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

function formatAmount(amount: number): string {
  return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Build a minimal PDF with Arabic text.
 * We use HTML-to-PDF via a simple approach: generate an HTML string,
 * then convert it to a PDF-like blob. Since Deno edge functions don't have
 * full browser rendering, we'll create a simple text-based PDF.
 * 
 * For proper Arabic rendering, we generate an HTML file and store it,
 * then the client-side viewer can render it. But since the plan asks for PDF,
 * we'll use jsPDF via esm.sh.
 */

// Use jsPDF from esm.sh
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

function generateInvoicePdf(invoice: {
  invoice_number: string | null;
  invoice_type: string;
  amount: number;
  date: string;
  description: string | null;
  status: string;
}): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Since we can't embed Arabic fonts in edge function easily,
  // we'll create a simple structured PDF with ASCII-safe labels
  // and Arabic text where jsPDF supports it

  const pageWidth = 210;
  const margin = 20;
  let y = 30;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("WAQF INVOICE", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Waqf Marzouq bin Ali Al-Thubayti", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.text("Deed No: 411209707", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.text("Court: Personal Status Court - Taif", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.text("Administrator: Abdullah bin Marzouq bin Ali Al-Thubayti", pageWidth / 2, y, { align: "center" });
  y += 15;

  // Line
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Invoice details
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice: ${invoice.invoice_number || "N/A"}`, pageWidth / 2, y, { align: "center" });
  y += 15;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const details = [
    ["Invoice Number", invoice.invoice_number || "N/A"],
    ["Type", INVOICE_TYPE_LABELS[invoice.invoice_type] || invoice.invoice_type],
    ["Amount (SAR)", formatAmount(invoice.amount)],
    ["Date", invoice.date],
    ["Description", invoice.description || "N/A"],
    ["Status", INVOICE_STATUS_LABELS[invoice.status] || invoice.status],
  ];

  // Simple table
  const col1X = margin + 5;
  const col2X = margin + 65;
  const rowHeight = 10;

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 6, pageWidth - 2 * margin, rowHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Field", col1X, y);
  doc.text("Value", col2X, y);
  y += rowHeight;

  doc.setFont("helvetica", "normal");
  for (const [label, value] of details) {
    doc.text(label, col1X, y);
    doc.text(String(value), col2X, y);
    y += rowHeight;
  }

  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated on: ${new Date().toISOString().split("T")[0]}`, pageWidth / 2, y, { align: "center" });

  // Return as Uint8Array
  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - allow service_role or admin users
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { invoice_ids } = await req.json();

    if (!invoice_ids || !Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return new Response(JSON.stringify({ error: "invoice_ids array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice_ids.length > 20) {
      return new Response(JSON.stringify({ error: "Maximum 20 invoices at a time" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoices
    const { data: invoices, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .in("id", invoice_ids);

    if (fetchError) throw fetchError;
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ error: "No invoices found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; invoice_number: string | null; success: boolean; error?: string }[] = [];

    for (const invoice of invoices) {
      try {
        // Skip if already has a file
        if (invoice.file_path) {
          results.push({ id: invoice.id, invoice_number: invoice.invoice_number, success: true, error: "already has file" });
          continue;
        }

        const pdfBytes = generateInvoicePdf({
          invoice_number: invoice.invoice_number,
          invoice_type: invoice.invoice_type,
          amount: invoice.amount,
          date: invoice.date,
          description: invoice.description,
          status: invoice.status,
        });

        const fileName = `${invoice.invoice_number || invoice.id}.pdf`;
        const storagePath = `generated/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("invoices")
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Update invoice record
        const { error: updateError } = await supabaseAdmin
          .from("invoices")
          .update({
            file_path: storagePath,
            file_name: fileName,
          })
          .eq("id", invoice.id);

        if (updateError) throw updateError;

        results.push({ id: invoice.id, invoice_number: invoice.invoice_number, success: true });
      } catch (err) {
        results.push({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
