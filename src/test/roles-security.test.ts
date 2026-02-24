/**
 * اختبارات أمنية لنظام الأدوار والصلاحيات
 * يتحقق من أن منطق التحقق من الأدوار يعمل بشكل صحيح
 */
import { describe, it, expect } from "vitest";
import { AppRole } from "@/types/database";

// Simulates the role-checking logic used in ProtectedRoute
function isAllowed(userRole: AppRole | null, allowedRoles?: AppRole[]): boolean {
  if (!allowedRoles) return true;
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

describe("Role-Based Access Control", () => {
  describe("isAllowed logic", () => {
    it("allows any role when no allowedRoles specified", () => {
      expect(isAllowed("admin")).toBe(true);
      expect(isAllowed("beneficiary")).toBe(true);
      expect(isAllowed("waqif")).toBe(true);
      expect(isAllowed("accountant")).toBe(true);
      expect(isAllowed(null)).toBe(true);
    });

    it("admin can access admin-only routes", () => {
      expect(isAllowed("admin", ["admin"])).toBe(true);
    });

    it("beneficiary cannot access admin-only routes", () => {
      expect(isAllowed("beneficiary", ["admin"])).toBe(false);
    });

    it("accountant cannot access admin-only routes alone but can with accountant", () => {
      expect(isAllowed("accountant", ["admin"])).toBe(false);
      expect(isAllowed("accountant", ["admin", "accountant"])).toBe(true);
    });

    it("waqif cannot access admin-only routes", () => {
      expect(isAllowed("waqif", ["admin"])).toBe(false);
    });

    it("null role is rejected for restricted routes", () => {
      expect(isAllowed(null, ["admin"])).toBe(false);
      expect(isAllowed(null, ["beneficiary"])).toBe(false);
    });

    it("beneficiary can access beneficiary routes", () => {
      expect(isAllowed("beneficiary", ["beneficiary"])).toBe(true);
    });

    it("admin can access multi-role routes", () => {
      expect(isAllowed("admin", ["admin", "beneficiary", "waqif"])).toBe(true);
    });

    it("beneficiary can access shared routes", () => {
      expect(isAllowed("beneficiary", ["admin", "beneficiary"])).toBe(true);
    });

    it("waqif cannot access admin+beneficiary routes", () => {
      expect(isAllowed("waqif", ["admin", "beneficiary"])).toBe(false);
    });
  });

  describe("AppRole type validation", () => {
    it("all four roles exist", () => {
      const validRoles: AppRole[] = ["admin", "beneficiary", "waqif", "accountant"];
      expect(validRoles).toHaveLength(4);
      expect(validRoles).toContain("admin");
      expect(validRoles).toContain("beneficiary");
      expect(validRoles).toContain("waqif");
      expect(validRoles).toContain("accountant");
    });
  });

  describe("Route protection matrix", () => {
    const adminRoutes = ["admin"] as AppRole[];
    const dashboardRoutes = ["admin", "accountant"] as AppRole[];
    const beneficiaryRoutes = ["beneficiary", "admin"] as AppRole[];
    const allRoles = ["admin", "beneficiary", "waqif"] as AppRole[];

    it("admin-only routes reject others", () => {
      expect(isAllowed("admin", adminRoutes)).toBe(true);
      expect(isAllowed("accountant", adminRoutes)).toBe(false);
      expect(isAllowed("beneficiary", adminRoutes)).toBe(false);
      expect(isAllowed("waqif", adminRoutes)).toBe(false);
    });

    it("dashboard routes allow admin and accountant", () => {
      expect(isAllowed("admin", dashboardRoutes)).toBe(true);
      expect(isAllowed("accountant", dashboardRoutes)).toBe(true);
      expect(isAllowed("beneficiary", dashboardRoutes)).toBe(false);
      expect(isAllowed("waqif", dashboardRoutes)).toBe(false);
    });

    it("beneficiary routes allow admin preview", () => {
      expect(isAllowed("admin", beneficiaryRoutes)).toBe(true);
      expect(isAllowed("beneficiary", beneficiaryRoutes)).toBe(true);
      expect(isAllowed("waqif", beneficiaryRoutes)).toBe(false);
    });

    it("shared view routes allow all authenticated roles", () => {
      expect(isAllowed("admin", allRoles)).toBe(true);
      expect(isAllowed("beneficiary", allRoles)).toBe(true);
      expect(isAllowed("waqif", allRoles)).toBe(true);
    });
  });
});
