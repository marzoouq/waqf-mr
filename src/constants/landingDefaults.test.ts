import { describe, it, expect } from 'vitest';
import { LANDING_DEFAULTS, withLandingDefaults } from './landingDefaults';

describe('landing defaults', () => {
  it('يخفي أرقام الوقف عن الزوار افتراضياً', () => {
    expect(LANDING_DEFAULTS.show_stats).toBe(false);
  });
  it('الإعدادات القديمة تبقي الأرقام مخفية', () => {
    expect(withLandingDefaults({ hero_title: 'قديم' }).show_stats).toBe(false);
    expect(withLandingDefaults({ hero_title: 'قديم' }).hero_title).toBe('قديم');
  });
});
