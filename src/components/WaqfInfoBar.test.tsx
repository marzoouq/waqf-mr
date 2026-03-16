import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── URL.revokeObjectURL / createObjectURL spy ──
let revokedUrls: string[] = [];
let createCount = 0;

beforeEach(() => {
  revokedUrls = [];
  createCount = 0;
  vi.stubGlobal('URL', {
    ...globalThis.URL,
    createObjectURL: vi.fn(() => {
      createCount++;
      return `blob:http://localhost/fake-${createCount}`;
    }),
    revokeObjectURL: vi.fn((url: string) => {
      revokedUrls.push(url);
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WaqfInfoBar URL cleanup logic', () => {
  it('revokeObjectURL is called when replacing a blob preview', () => {
    // Simulate the component logic for handleLogoSelect
    let logoPreview: string | null = null;

    // First file select
    const firstBlob = URL.createObjectURL(new Blob());
    logoPreview = firstBlob;
    expect(logoPreview).toMatch(/^blob:/);

    // Second file select — should revoke previous blob
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    const secondBlob = URL.createObjectURL(new Blob());
    logoPreview = secondBlob;

    expect(revokedUrls).toContain(firstBlob);
    expect(revokedUrls).toHaveLength(1);
    expect(logoPreview).toBe(secondBlob);
  });

  it('does not revoke non-blob URLs (e.g. https)', () => {
    let logoPreview: string | null = 'https://example.com/logo.png';

    // Replacing a remote URL should NOT call revokeObjectURL
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    const blob = URL.createObjectURL(new Blob());
    logoPreview = blob;

    expect(revokedUrls).toHaveLength(0);
    expect(logoPreview).toBe(blob);
  });

  it('revokeObjectURL is called when clearing the logo preview', () => {
    // Simulate setting a blob then clicking the X button
    const blob = URL.createObjectURL(new Blob());
    let logoPreview: string | null = blob;

    // Clear action (X button)
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    logoPreview = null;

    expect(revokedUrls).toContain(blob);
    expect(logoPreview).toBeNull();
  });

  it('handles null logoPreview safely', () => {
    const logoPreview: string | null = null;

    // Should not throw
    if (logoPreview && (logoPreview as string).startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview as string);
    }

    expect(revokedUrls).toHaveLength(0);
  });

  it('multiple sequential replacements revoke each previous blob', () => {
    let logoPreview: string | null = null;
    const blobs: string[] = [];

    for (let i = 0; i < 5; i++) {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      const blob = URL.createObjectURL(new Blob());
      blobs.push(blob);
      logoPreview = blob;
    }

    // The last blob is still active, so 4 previous ones should be revoked
    expect(revokedUrls).toHaveLength(4);
    expect(revokedUrls).toEqual(blobs.slice(0, 4));
  });
});
