import { describe, it, expect, beforeEach } from 'vitest';
import { installRuntimeCollector, getRuntimeErrors, clearRuntimeErrors } from './runtimeCollector';

describe('runtimeCollector', () => {
  beforeEach(() => clearRuntimeErrors());

  it('captures window error events', () => {
    installRuntimeCollector();
    const evt = new ErrorEvent('error', { message: 'boom-test', error: new Error('boom-test') });
    window.dispatchEvent(evt);
    const errors = getRuntimeErrors();
    expect(errors.some((e) => e.message.includes('boom-test'))).toBe(true);
  });

  it('clearRuntimeErrors empties the log', () => {
    const evt = new ErrorEvent('error', { message: 'x', error: new Error('x') });
    window.dispatchEvent(evt);
    clearRuntimeErrors();
    expect(getRuntimeErrors()).toEqual([]);
  });
});
