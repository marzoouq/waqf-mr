/**
 * اختبارات pwaBootstrap — يتحقق أن:
 *  - في الإنتاج: لا يلمس caches ولا يستدعي reload.
 *  - في preview/iframe: يُلغي تسجيل SW ويمسح caches فقط (بدون reload).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// موك logger لتجنّب ضوضاء الكونسول
vi.mock('./logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

interface CachesMock {
  keys: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface SwMock {
  getRegistrations: ReturnType<typeof vi.fn>;
}

function setupGlobals(hostname: string, swMock: SwMock, cachesMock: CachesMock) {
  vi.stubGlobal('location', { hostname } as unknown as Location);
  // navigator.serviceWorker
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: swMock,
  });
  vi.stubGlobal('caches', cachesMock);
}

describe('pwaBootstrap.runPwaCacheGuard', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('الإنتاج: لا يستدعي caches.delete ولا يلمس serviceWorker', async () => {
    const unregister = vi.fn();
    const sw: SwMock = {
      getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
    };
    const cachesMock: CachesMock = {
      keys: vi.fn().mockResolvedValue(['cache-1']),
      delete: vi.fn().mockResolvedValue(true),
    };
    setupGlobals('waqf-wise.net', sw, cachesMock);

    const mod = await import('./pwaBootstrap');
    await mod.runPwaCacheGuard();

    expect(sw.getRegistrations).not.toHaveBeenCalled();
    expect(cachesMock.keys).not.toHaveBeenCalled();
    expect(cachesMock.delete).not.toHaveBeenCalled();
    expect(unregister).not.toHaveBeenCalled();
  });

  it('preview: يُلغي تسجيل SW ويمسح كل caches بدون reload', async () => {
    const unregister1 = vi.fn().mockResolvedValue(undefined);
    const unregister2 = vi.fn().mockResolvedValue(undefined);
    const sw: SwMock = {
      getRegistrations: vi.fn().mockResolvedValue([
        { unregister: unregister1 },
        { unregister: unregister2 },
      ]),
    };
    const cachesMock: CachesMock = {
      keys: vi.fn().mockResolvedValue(['workbox-precache', 'html']),
      delete: vi.fn().mockResolvedValue(true),
    };
    setupGlobals('id-preview--abc.lovable.app', sw, cachesMock);

    const mod = await import('./pwaBootstrap');
    await mod.runPwaCacheGuard();

    expect(sw.getRegistrations).toHaveBeenCalledTimes(1);
    expect(unregister1).toHaveBeenCalledTimes(1);
    expect(unregister2).toHaveBeenCalledTimes(1);
    expect(cachesMock.delete).toHaveBeenCalledTimes(2);
    expect(cachesMock.delete).toHaveBeenCalledWith('workbox-precache');
    expect(cachesMock.delete).toHaveBeenCalledWith('html');
  });

  it('localhost (preview): يمسح كذلك', async () => {
    const sw: SwMock = { getRegistrations: vi.fn().mockResolvedValue([]) };
    const cachesMock: CachesMock = {
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    };
    setupGlobals('localhost', sw, cachesMock);

    const mod = await import('./pwaBootstrap');
    await mod.runPwaCacheGuard();

    expect(sw.getRegistrations).toHaveBeenCalled();
    expect(cachesMock.keys).toHaveBeenCalled();
  });
});
