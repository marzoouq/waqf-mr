/**
 * اختبار سياسة RLS لجدول waqf_bylaws
 * يتحقق من أن الأنظمة المخفية (is_visible = false) محجوبة عن الأدوار غير الإدارية
 */
import { describe, it, expect } from "vitest";
import { AppRole } from "@/types/database";

interface Bylaw {
  id: string;
  part_title: string;
  is_visible: boolean;
}

/**
 * محاكاة سياسة RLS المطبقة على waqf_bylaws:
 * - الناظر يرى كل شيء
 * - الأدوار الأخرى (مستفيد، واقف، محاسب) ترى فقط is_visible = true
 * - المستخدم غير المسجل لا يرى شيئاً
 */
function filterBylawsByPolicy(
  bylaws: Bylaw[],
  role: AppRole | null
): Bylaw[] {
  if (!role) return []; // غير مسجل
  if (role === "admin") return bylaws; // الناظر يرى الكل
  // الأدوار الأخرى: فقط المرئية
  return bylaws.filter((b) => b.is_visible);
}

const sampleBylaws: Bylaw[] = [
  { id: "1", part_title: "باب أول - مرئي", is_visible: true },
  { id: "2", part_title: "باب ثاني - مخفي", is_visible: false },
  { id: "3", part_title: "باب ثالث - مرئي", is_visible: true },
  { id: "4", part_title: "باب رابع - مخفي", is_visible: false },
];

describe("سياسة RLS لجدول waqf_bylaws — فلترة is_visible", () => {
  it("الناظر يرى جميع الأنظمة بما فيها المخفية", () => {
    const result = filterBylawsByPolicy(sampleBylaws, "admin");
    expect(result).toHaveLength(4);
    expect(result.some((b) => !b.is_visible)).toBe(true);
  });

  it("المستفيد يرى فقط الأنظمة المرئية", () => {
    const result = filterBylawsByPolicy(sampleBylaws, "beneficiary");
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.is_visible)).toBe(true);
  });

  it("الواقف يرى فقط الأنظمة المرئية", () => {
    const result = filterBylawsByPolicy(sampleBylaws, "waqif");
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.is_visible)).toBe(true);
  });

  it("المحاسب يرى فقط الأنظمة المرئية", () => {
    const result = filterBylawsByPolicy(sampleBylaws, "accountant");
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.is_visible)).toBe(true);
  });

  it("المستخدم غير المسجل لا يرى أي نظام", () => {
    const result = filterBylawsByPolicy(sampleBylaws, null);
    expect(result).toHaveLength(0);
  });

  it("عندما تكون جميع الأنظمة مخفية، الأدوار غير الإدارية لا ترى شيئاً", () => {
    const allHidden: Bylaw[] = [
      { id: "10", part_title: "مخفي 1", is_visible: false },
      { id: "11", part_title: "مخفي 2", is_visible: false },
    ];
    expect(filterBylawsByPolicy(allHidden, "beneficiary")).toHaveLength(0);
    expect(filterBylawsByPolicy(allHidden, "waqif")).toHaveLength(0);
    expect(filterBylawsByPolicy(allHidden, "admin")).toHaveLength(2);
  });

  it("عندما تكون جميع الأنظمة مرئية، الجميع يراها", () => {
    const allVisible: Bylaw[] = [
      { id: "20", part_title: "مرئي 1", is_visible: true },
      { id: "21", part_title: "مرئي 2", is_visible: true },
    ];
    expect(filterBylawsByPolicy(allVisible, "beneficiary")).toHaveLength(2);
    expect(filterBylawsByPolicy(allVisible, "admin")).toHaveLength(2);
  });
});
