/**
 * validation.ts — مخطط مدخلات invoice-file-url (قابل للاختبار بمعزل عن الشبكة).
 */
import { z } from "npm:zod@3";

export const SIGNED_URL_TTL = 120; // ثانية

export const BodySchema = z.object({
  file_path: z
    .string()
    .min(1, "مسار الملف مطلوب")
    .max(300, "مسار الملف طويل جداً")
    .refine(
      (p) => !p.includes("..") && !p.startsWith("/") && !p.includes("\\"),
      "مسار الملف غير صالح",
    ),
  download: z.string().max(200).optional(),
});
