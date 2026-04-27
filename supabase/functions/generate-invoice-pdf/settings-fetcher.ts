// ═══════════════════════════════════════════════════════════════════════════════
// settings-fetcher.ts — جلب إعدادات الوقف وأنواع البيانات المشتركة
// ═══════════════════════════════════════════════════════════════════════════════

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface InvoiceData {
  invoice_number: string | null;
  invoice_type: string;
  amount: number;
  date: string;
  description: string | null;
  status: string;
  vat_rate: number;
  vat_amount: number;
  amount_excluding_vat: number | null;
}

export interface WaqfSettings {
  waqf_name: string;
  waqf_deed_number: string;
  waqf_court: string;
  waqf_admin: string;
  vat_registration_number: string;
  waqf_logo_url: string;
  waqf_bank_name: string;
  waqf_bank_iban: string;
  business_address: string;
  commercial_registration_number: string;
}

export async function fetchWaqfSettings(adminClient: SupabaseClient): Promise<WaqfSettings> {
  const keys = [
    "waqf_name", "waqf_deed_number", "waqf_court", "waqf_admin",
    "vat_registration_number", "waqf_logo_url", "waqf_bank_name", "waqf_bank_iban",
    "business_address_street", "business_address_district", "business_address_city",
    "business_address_postal_code", "commercial_registration_number",
  ];
  const { data } = await adminClient.from("app_settings").select("key, value").in("key", keys);

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  const addressParts = [
    map.business_address_street,
    map.business_address_district,
    map.business_address_city,
    map.business_address_postal_code,
  ].filter(Boolean);

  return {
    waqf_name: map.waqf_name || "غير محدد",
    waqf_deed_number: map.waqf_deed_number || "غير محدد",
    waqf_court: map.waqf_court || "غير محدد",
    waqf_admin: map.waqf_admin || "غير محدد",
    vat_registration_number: map.vat_registration_number || "",
    waqf_logo_url: map.waqf_logo_url || "",
    waqf_bank_name: map.waqf_bank_name || "",
    waqf_bank_iban: map.waqf_bank_iban || "",
    business_address: addressParts.length > 0 ? addressParts.join("، ") : "",
    commercial_registration_number: map.commercial_registration_number || "",
  };
}
