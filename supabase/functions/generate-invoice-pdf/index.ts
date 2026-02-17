import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const INVOICE_TYPE_LABELS: Record<string, string> = {
  utilities: "Utilities",
  maintenance: "Maintenance",
  rent: "Rent",
  other: "Other",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  cancelled: "Cancelled",
};

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/** Build a valid PDF 1.4 file from scratch (no external libs). */
function generateInvoicePdf(invoice: {
  invoice_number: string | null;
  invoice_type: string;
  amount: number;
  date: string;
  description: string | null;
  status: string;
}): Uint8Array {
  const num = invoice.invoice_number || "N/A";
  const type = INVOICE_TYPE_LABELS[invoice.invoice_type] || invoice.invoice_type;
  const amount = formatAmount(invoice.amount);
  const date = invoice.date;
  const desc = (invoice.description || "N/A").replace(/[^\x20-\x7E]/g, "?");
  const status = INVOICE_STATUS_LABELS[invoice.status] || invoice.status;
  const generated = new Date().toISOString().split("T")[0];

  // Build content stream (PDF drawing commands)
  const lines: string[] = [];
  let y = 780;
  const lh = 16; // line height

  // Header
  lines.push("BT");
  lines.push("/F1 18 Tf");
  lines.push(`105 ${y} Td`);
  lines.push(`(WAQF INVOICE) Tj`);
  lines.push("ET");
  y -= 24;

  lines.push("BT");
  lines.push("/F1 10 Tf");
  lines.push(`105 ${y} Td`);
  lines.push(`(Waqf Marzouq bin Ali Al-Thubayti) Tj`);
  lines.push("ET");
  y -= lh;

  lines.push("BT");
  lines.push("/F1 10 Tf");
  lines.push(`105 ${y} Td`);
  lines.push(`(Deed No: 411209707  |  Court: Personal Status Court - Taif) Tj`);
  lines.push("ET");
  y -= lh;

  lines.push("BT");
  lines.push("/F1 10 Tf");
  lines.push(`105 ${y} Td`);
  lines.push(`(Administrator: Abdullah bin Marzouq bin Ali Al-Thubayti) Tj`);
  lines.push("ET");
  y -= 30;

  // Horizontal line
  lines.push(`50 ${y} m 545 ${y} l S`);
  y -= 30;

  // Invoice title
  lines.push("BT");
  lines.push("/F1 14 Tf");
  lines.push(`105 ${y} Td`);
  lines.push(`(Invoice: ${pdfEscape(num)}) Tj`);
  lines.push("ET");
  y -= 30;

  // Details table
  const rows = [
    ["Invoice Number", num],
    ["Type", type],
    ["Amount (SAR)", amount],
    ["Date", date],
    ["Description", desc.substring(0, 60)],
    ["Status", status],
  ];

  // Table header bg
  lines.push("0.94 0.94 0.94 rg");
  lines.push(`50 ${y - 4} 495 ${lh} re f`);
  lines.push("0 0 0 rg");

  lines.push("BT");
  lines.push("/F1 10 Tf");
  lines.push(`55 ${y} Td`);
  lines.push(`(Field) Tj`);
  lines.push("ET");
  lines.push("BT");
  lines.push("/F1 10 Tf");
  lines.push(`250 ${y} Td`);
  lines.push(`(Value) Tj`);
  lines.push("ET");
  y -= lh;

  for (const [label, value] of rows) {
    lines.push("BT");
    lines.push("/F1 10 Tf");
    lines.push(`55 ${y} Td`);
    lines.push(`(${pdfEscape(label)}) Tj`);
    lines.push("ET");
    lines.push("BT");
    lines.push("/F1 10 Tf");
    lines.push(`250 ${y} Td`);
    lines.push(`(${pdfEscape(value)}) Tj`);
    lines.push("ET");
    y -= lh;
  }

  y -= 20;
  lines.push(`50 ${y} m 545 ${y} l S`);
  y -= 24;

  // Footer
  lines.push("BT");
  lines.push("/F1 9 Tf");
  lines.push("0.47 0.47 0.47 rg");
  lines.push(`105 ${y} Td`);
  lines.push(`(Generated on: ${generated}) Tj`);
  lines.push("ET");

  const contentStream = lines.join("\n");

  // Build PDF objects
  const objects: string[] = [];
  // obj 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  // obj 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  // obj 3: Page
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj"
  );
  // obj 4: Content stream
  objects.push(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`
  );
  // obj 5: Font (Helvetica - built-in, no embedding needed)
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj"
  );

  // Assemble PDF
  const header = "%PDF-1.4\n";
  let body = "";
  const offsets: number[] = [];

  let pos = header.length;
  for (const obj of objects) {
    offsets.push(pos);
    const entry = obj + "\n";
    body += entry;
    pos += entry.length;
  }

  const xrefStart = pos;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdfString = header + body + xref + trailer;
  return new TextEncoder().encode(pdfString);
}

function pdfEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

        const { error: uploadError } = await supabaseAdmin.storage
          .from("invoices")
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { error: updateError } = await supabaseAdmin
          .from("invoices")
          .update({ file_path: storagePath, file_name: fileName })
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
