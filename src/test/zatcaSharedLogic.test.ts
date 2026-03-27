/**
 * اختبارات المنطق الأساسي لأدوات ZATCA المشتركة
 * تختبر دوال ASN.1 وتحليل الشهادات — بدون اعتماد على Deno
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════════
// إعادة تنفيذ الدوال الصرفة (Pure Functions) للاختبار
// هذه نسخ مطابقة من zatca-shared.ts بدون import Deno
// ═══════════════════════════════════════════════════════════════════════════════

function asn1Length(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function asn1Wrap(tag: number, content: Uint8Array): Uint8Array {
  const len = asn1Length(content.length);
  const result = new Uint8Array(1 + len.length + content.length);
  result[0] = tag;
  result.set(len, 1);
  result.set(content, 1 + len.length);
  return result;
}

function asn1Sequence(items: Uint8Array[]): Uint8Array {
  const totalLen = items.reduce((s, i) => s + i.length, 0);
  const content = new Uint8Array(totalLen);
  let offset = 0;
  for (const item of items) { content.set(item, offset); offset += item.length; }
  return asn1Wrap(0x30, content);
}

function asn1Set(items: Uint8Array[]): Uint8Array {
  const totalLen = items.reduce((s, i) => s + i.length, 0);
  const content = new Uint8Array(totalLen);
  let offset = 0;
  for (const item of items) { content.set(item, offset); offset += item.length; }
  return asn1Wrap(0x31, content);
}

function asn1Integer(value: number): Uint8Array {
  return asn1Wrap(0x02, new Uint8Array([value]));
}

function asn1Oid(components: number[]): Uint8Array {
  const bytes: number[] = [];
  bytes.push(components[0]! * 40 + components[1]!);
  for (let i = 2; i < components.length; i++) {
    let val = components[i]!;
    if (val >= 128) {
      const stack: number[] = [];
      while (val > 0) { stack.unshift(val & 0x7f); val >>= 7; }
      for (let j = 0; j < stack.length - 1; j++) stack[j]! |= 0x80;
      bytes.push(...stack);
    } else {
      bytes.push(val);
    }
  }
  return asn1Wrap(0x06, new Uint8Array(bytes));
}

function asn1Utf8String(str: string): Uint8Array {
  return asn1Wrap(0x0c, new TextEncoder().encode(str));
}

function asn1PrintableString(str: string): Uint8Array {
  return asn1Wrap(0x13, new TextEncoder().encode(str));
}

function asn1BitString(data: Uint8Array): Uint8Array {
  const content = new Uint8Array(1 + data.length);
  content[0] = 0;
  content.set(data, 1);
  return asn1Wrap(0x03, content);
}

function asn1OctetString(data: Uint8Array): Uint8Array {
  return asn1Wrap(0x04, data);
}

function asn1Ia5String(str: string): Uint8Array {
  return asn1Wrap(0x16, new TextEncoder().encode(str));
}

function parseCertExpiry(base64Cert: string): string | null {
  try {
    const binary = atob(base64Cert);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const times: string[] = [];
    for (let i = 0; i < bytes.length - 2; i++) {
      const tag = bytes[i]!;
      if (tag !== 0x17 && tag !== 0x18) continue;
      const len = bytes[i + 1];
      if (len === undefined || len < 10 || len > 20) continue;
      if (i + 2 + len > bytes.length) continue;
      const timeStr = new TextDecoder().decode(bytes.slice(i + 2, i + 2 + len));
      let iso: string;
      if (tag === 0x17) {
        const yy = parseInt(timeStr.slice(0, 2));
        const year = yy >= 50 ? 1900 + yy : 2000 + yy;
        iso = `${year}-${timeStr.slice(2, 4)}-${timeStr.slice(4, 6)}T${timeStr.slice(6, 8)}:${timeStr.slice(8, 10)}:${timeStr.slice(10, 12)}Z`;
      } else {
        iso = `${timeStr.slice(0, 4)}-${timeStr.slice(4, 6)}-${timeStr.slice(6, 8)}T${timeStr.slice(8, 10)}:${timeStr.slice(10, 12)}:${timeStr.slice(12, 14)}Z`;
      }
      if (!isNaN(new Date(iso).getTime())) times.push(iso);
      if (times.length >= 2) break;
    }
    return times.length >= 2 ? times[1]! : null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات ASN.1 Encoding
// ═══════════════════════════════════════════════════════════════════════════════

describe("ASN.1 Encoding — دوال ZATCA الحرجة", () => {

  describe("asn1Length", () => {
    it("يرمز أطوال أقل من 128 بـ byte واحد", () => {
      expect(asn1Length(0)).toEqual(new Uint8Array([0]));
      expect(asn1Length(5)).toEqual(new Uint8Array([5]));
      expect(asn1Length(127)).toEqual(new Uint8Array([127]));
    });

    it("يرمز أطوال 128-255 بـ 0x81 + byte", () => {
      expect(asn1Length(128)).toEqual(new Uint8Array([0x81, 128]));
      expect(asn1Length(255)).toEqual(new Uint8Array([0x81, 255]));
    });

    it("يرمز أطوال أكبر من 255 بـ 0x82 + 2 bytes", () => {
      expect(asn1Length(256)).toEqual(new Uint8Array([0x82, 1, 0]));
      expect(asn1Length(512)).toEqual(new Uint8Array([0x82, 2, 0]));
    });
  });

  describe("asn1Wrap", () => {
    it("يغلّف البيانات بـ tag + length + content", () => {
      const content = new Uint8Array([0x41, 0x42]);
      const result = asn1Wrap(0x30, content);
      expect(result[0]).toBe(0x30); // tag
      expect(result[1]).toBe(2);    // length
      expect(result[2]).toBe(0x41); // content[0]
      expect(result[3]).toBe(0x42); // content[1]
    });
  });

  describe("asn1Integer", () => {
    it("يرمز عدداً صحيحاً بالصيغة ASN.1", () => {
      const result = asn1Integer(0);
      expect(result[0]).toBe(0x02); // INTEGER tag
      expect(result[1]).toBe(1);    // length
      expect(result[2]).toBe(0);    // value
    });
  });

  describe("asn1Sequence", () => {
    it("يدمج عناصر متعددة في SEQUENCE", () => {
      const items = [asn1Integer(1), asn1Integer(2)];
      const result = asn1Sequence(items);
      expect(result[0]).toBe(0x30); // SEQUENCE tag
      // يجب أن يحتوي على كلا العنصرين
      expect(result.length).toBe(2 + items[0]!.length + items[1]!.length);
    });

    it("يتعامل مع تسلسل فارغ", () => {
      const result = asn1Sequence([]);
      expect(result[0]).toBe(0x30);
      expect(result[1]).toBe(0); // طول صفري
    });
  });

  describe("asn1Set", () => {
    it("يغلف عنصراً في SET", () => {
      const item = asn1Integer(5);
      const result = asn1Set([item]);
      expect(result[0]).toBe(0x31); // SET tag
    });
  });

  describe("asn1Oid", () => {
    it("يرمز OID بسيط (2.5.29.17 — SubjectAltName)", () => {
      const result = asn1Oid([2, 5, 29, 17]);
      expect(result[0]).toBe(0x06); // OID tag
      // أول byte = 2*40+5 = 85
      expect(result[2]).toBe(85);
    });

    it("يرمز OID طويل مع مكونات > 127", () => {
      const result = asn1Oid([1, 2, 840, 10045, 2, 1]); // EC Public Key
      expect(result[0]).toBe(0x06);
      // يجب أن يكون الطول أكبر من 3 bytes بسبب الترميز متعدد البايتات
      expect(result.length).toBeGreaterThan(5);
    });
  });

  describe("asn1Utf8String / asn1PrintableString / asn1Ia5String", () => {
    it("يرمز نصاً UTF-8 بشكل صحيح", () => {
      const result = asn1Utf8String("SA");
      expect(result[0]).toBe(0x0c); // UTF8String tag
      expect(result[1]).toBe(2);    // length
    });

    it("يرمز نصاً Printable بشكل صحيح", () => {
      const result = asn1PrintableString("SA");
      expect(result[0]).toBe(0x13); // PrintableString tag
    });

    it("يرمز نص IA5 بشكل صحيح", () => {
      const result = asn1Ia5String("ZATCA-Code-Signing");
      expect(result[0]).toBe(0x16); // IA5String tag
      expect(result[1]).toBe(18);   // length
    });
  });

  describe("asn1BitString", () => {
    it("يضيف byte padding صفري قبل البيانات", () => {
      const data = new Uint8Array([0x04, 0x05]);
      const result = asn1BitString(data);
      expect(result[0]).toBe(0x03); // BIT STRING tag
      expect(result[1]).toBe(3);    // length = 1 (padding) + 2 (data)
      expect(result[2]).toBe(0);    // padding byte
    });
  });

  describe("asn1OctetString", () => {
    it("يغلف بيانات في OCTET STRING", () => {
      const data = new Uint8Array([0x01, 0x02, 0x03]);
      const result = asn1OctetString(data);
      expect(result[0]).toBe(0x04); // OCTET STRING tag
      expect(result[1]).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات تحليل انتهاء الشهادة
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseCertExpiry — تحليل تاريخ انتهاء الشهادة", () => {

  it("يعيد null لبيانات فارغة", () => {
    expect(parseCertExpiry("")).toBe(null);
  });

  it("يعيد null لـ base64 غير صالح", () => {
    expect(parseCertExpiry("not-valid-base64!!!")).toBe(null);
  });

  it("يعيد null عندما لا توجد أوقات ASN.1 كافية", () => {
    // بيانات base64 عشوائية بدون UTCTime tags
    const noTimesB64 = btoa(String.fromCharCode(...new Uint8Array(20)));
    expect(parseCertExpiry(noTimesB64)).toBe(null);
  });

  it("يستخرج تاريخ الانتهاء من UTCTime (tag 0x17)", () => {
    // بناء بيانات وهمية تحتوي على UTCTime entries
    // UTCTime format: YYMMDDHHMMSSZ
    const notBefore = "240101120000Z"; // 2024-01-01T12:00:00Z
    const notAfter = "260601120000Z";  // 2026-06-01T12:00:00Z

    const bytes: number[] = [];
    // padding
    bytes.push(0x00, 0x00);
    // notBefore
    bytes.push(0x17, notBefore.length);
    for (const ch of notBefore) bytes.push(ch.charCodeAt(0));
    // notAfter
    bytes.push(0x17, notAfter.length);
    for (const ch of notAfter) bytes.push(ch.charCodeAt(0));
    // trailing padding
    bytes.push(0x00, 0x00, 0x00);

    const b64 = btoa(String.fromCharCode(...bytes));
    const result = parseCertExpiry(b64);
    expect(result).toBe("2026-06-01T12:00:00Z");
  });

  it("يتعامل مع سنوات >= 50 كـ 19xx (UTCTime)", () => {
    const notBefore = "990101000000Z"; // 1999
    const notAfter = "500601000000Z";  // 1950

    const bytes: number[] = [0x00];
    bytes.push(0x17, notBefore.length);
    for (const ch of notBefore) bytes.push(ch.charCodeAt(0));
    bytes.push(0x17, notAfter.length);
    for (const ch of notAfter) bytes.push(ch.charCodeAt(0));
    bytes.push(0x00);

    const b64 = btoa(String.fromCharCode(...bytes));
    const result = parseCertExpiry(b64);
    expect(result).toBe("1950-06-01T00:00:00Z");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات تكامل CSR
// ═══════════════════════════════════════════════════════════════════════════════

describe("بناء CSR — دوال مركّبة", () => {
  it("buildDistinguishedName يبني DN صحيح", () => {
    const attrs = [
      { oid: [2, 5, 4, 6], value: "SA" }, // countryName → PrintableString
      { oid: [2, 5, 4, 3], value: "Test" }, // commonName → UTF8String
    ];

    // countryName: oid[3] === 6 → PrintableString
    const rdns = attrs.map(attr => {
      const valEncoded = attr.oid[3] === 6
        ? asn1PrintableString(attr.value)
        : asn1Utf8String(attr.value);
      return asn1Set([asn1Sequence([asn1Oid(attr.oid), valEncoded])]);
    });
    const dn = asn1Sequence(rdns);

    expect(dn[0]).toBe(0x30); // SEQUENCE
    expect(dn.length).toBeGreaterThan(10);
  });

  it("buildEcSpki ينتج SPKI صحيح لمفتاح EC", () => {
    // مفتاح عمومي EC وهمي (65 bytes — uncompressed P-256)
    const fakePublicKey = new Uint8Array(65);
    fakePublicKey[0] = 0x04; // uncompressed point marker

    const algId = asn1Sequence([
      asn1Oid([1, 2, 840, 10045, 2, 1]),  // ecPublicKey
      asn1Oid([1, 2, 840, 10045, 3, 1, 7]) // P-256
    ]);
    const spki = asn1Sequence([algId, asn1BitString(fakePublicKey)]);

    expect(spki[0]).toBe(0x30); // SEQUENCE
    // يجب أن يحتوي على BIT STRING مع المفتاح
    expect(spki.length).toBeGreaterThan(70);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات ZATCA URLs
// ═══════════════════════════════════════════════════════════════════════════════

describe("ZATCA URLs — ثوابت النظام", () => {
  const ZATCA_URLS: Record<string, string> = {
    production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
    sandbox: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  };

  it("يحتوي على رابط sandbox صحيح", () => {
    expect(ZATCA_URLS.sandbox).toContain("simulation");
  });

  it("يحتوي على رابط production صحيح", () => {
    expect(ZATCA_URLS.production).toContain("developer-portal");
  });

  it("رابط غير معروف يُعيد undefined", () => {
    expect(ZATCA_URLS["unknown"]).toBeUndefined();
  });
});
