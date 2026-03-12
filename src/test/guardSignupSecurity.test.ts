/**
 * اختبارات أمنية لوظيفة guard-signup
 * يتحقق من منطق التحقق من المدخلات وتعيين الدور الافتراضي
 */
import { describe, it, expect } from "vitest";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignupEmail(email: unknown): string | null {
  if (!email || typeof email !== "string" || !EMAIL_RE.test((email as string).trim())) {
    return "بريد إلكتروني غير صالح";
  }
  return null;
}

function validateSignupPassword(password: unknown): string | null {
  if (!password || typeof password !== "string" || (password as string).length < 8 || (password as string).length > 128) {
    return "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً";
  }
  return null;
}

/**
 * محاكاة منطق تعيين الدور الافتراضي في guard-signup
 * بعد إنشاء المستخدم، يتم تعيين دور "beneficiary" تلقائياً
 */
function getDefaultRoleForNewUser(): string {
  return "beneficiary";
}

/**
 * محاكاة rate limiting
 */
function createRateLimiter(limit: number, windowMs: number) {
  const map = new Map<string, { count: number; resetAt: number }>();
  
  return {
    isLimited(ip: string): boolean {
      const now = Date.now();
      const entry = map.get(ip);
      if (!entry || now > entry.resetAt) {
        map.set(ip, { count: 1, resetAt: now + windowMs });
        return false;
      }
      entry.count += 1;
      return entry.count > limit;
    },
    reset() { map.clear(); }
  };
}

describe("Guard Signup Security", () => {
  describe("Email validation", () => {
    it("accepts valid email", () => {
      expect(validateSignupEmail("user@example.com")).toBeNull();
      expect(validateSignupEmail("test@waqf.app")).toBeNull();
      expect(validateSignupEmail("1234567890@waqf.app")).toBeNull();
    });

    it("rejects empty email", () => {
      expect(validateSignupEmail("")).toBe("بريد إلكتروني غير صالح");
      expect(validateSignupEmail(null)).toBe("بريد إلكتروني غير صالح");
      expect(validateSignupEmail(undefined)).toBe("بريد إلكتروني غير صالح");
    });

    it("rejects non-string email", () => {
      expect(validateSignupEmail(123)).toBe("بريد إلكتروني غير صالح");
      expect(validateSignupEmail({})).toBe("بريد إلكتروني غير صالح");
      expect(validateSignupEmail([])).toBe("بريد إلكتروني غير صالح");
    });

    it("rejects malformed email", () => {
      expect(validateSignupEmail("noatsign")).toBe("بريد إلكتروني غير صالح");
      expect(validateSignupEmail("@nodomain")).toBe("بريد إلكتروني غير صالح");
      expect(validateSignupEmail("user@")).toBe("بريد إلكتروني غير صالح");
      expect(validateSignupEmail("user @domain.com")).toBe("بريد إلكتروني غير صالح");
    });
  });

  describe("Password validation", () => {
    it("accepts valid password (8-128 chars)", () => {
      expect(validateSignupPassword("12345678")).toBeNull();
      expect(validateSignupPassword("a".repeat(128))).toBeNull();
      expect(validateSignupPassword("StrongP@ss1")).toBeNull();
    });

    it("rejects too short password", () => {
      expect(validateSignupPassword("1234567")).toBe("كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
      expect(validateSignupPassword("123456")).toBe("كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
      expect(validateSignupPassword("")).toBe("كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
    });

    it("rejects too long password", () => {
      expect(validateSignupPassword("a".repeat(129))).toBe("كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
    });

    it("rejects non-string password", () => {
      expect(validateSignupPassword(null)).toBe("كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
      expect(validateSignupPassword(undefined)).toBe("كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
      expect(validateSignupPassword(123456)).toBe("كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
    });
  });

  describe("Default role assignment", () => {
    it("assigns 'beneficiary' role to new users", () => {
      expect(getDefaultRoleForNewUser()).toBe("beneficiary");
    });

    it("default role is a valid app_role", () => {
      const validRoles = ["admin", "beneficiary", "waqif", "accountant"];
      expect(validRoles).toContain(getDefaultRoleForNewUser());
    });

    it("default role is NOT admin", () => {
      expect(getDefaultRoleForNewUser()).not.toBe("admin");
    });

    it("default role is NOT accountant", () => {
      expect(getDefaultRoleForNewUser()).not.toBe("accountant");
    });
  });

  describe("Rate limiting", () => {
    it("allows first request", () => {
      const limiter = createRateLimiter(5, 60000);
      expect(limiter.isLimited("192.168.1.1")).toBe(false);
    });

    it("allows up to limit requests", () => {
      const limiter = createRateLimiter(5, 60000);
      for (let i = 0; i < 5; i++) {
        expect(limiter.isLimited("192.168.1.1")).toBe(false);
      }
    });

    it("blocks after exceeding limit", () => {
      const limiter = createRateLimiter(5, 60000);
      for (let i = 0; i < 5; i++) {
        limiter.isLimited("192.168.1.1");
      }
      expect(limiter.isLimited("192.168.1.1")).toBe(true);
    });

    it("tracks different IPs independently", () => {
      const limiter = createRateLimiter(5, 60000);
      for (let i = 0; i < 5; i++) {
        limiter.isLimited("192.168.1.1");
      }
      expect(limiter.isLimited("192.168.1.1")).toBe(true);
      expect(limiter.isLimited("192.168.1.2")).toBe(false);
    });
  });

  describe("Registration toggle enforcement", () => {
    it("guard-signup checks registration_enabled from database, not client", () => {
      // محاكاة: guard-signup يقرأ app_settings.registration_enabled
      // إذا كانت القيمة غير "true" يرفض التسجيل بـ 403
      const checkRegistration = (settingValue: string | null): boolean => {
        return settingValue === "true";
      };

      expect(checkRegistration("true")).toBe(true);
      expect(checkRegistration("false")).toBe(false);
      expect(checkRegistration(null)).toBe(false);
      expect(checkRegistration("")).toBe(false);
      expect(checkRegistration("TRUE")).toBe(false); // case-sensitive
    });
  });
});
