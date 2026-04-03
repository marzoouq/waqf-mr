/**
 * Barrel exports — lib/
 */
export * from './auth';
export * from './export';
export * from './monitoring';
export * from './realtime';
export * from './search';
export * from './services';
export * from './theme';

export { prefetchComponent } from './componentPrefetch';
export { reportClientError } from './errorReporter';
export { lazyWithRetry } from './lazyWithRetry';
export { logger } from './logger';
export { defaultNotify, crudNotifyAdapter } from './notify';
export type { AppNotify, CrudNotifications, MutationNotify } from './notify';
export { queryClient } from './queryClient';
export { STALE_STATIC, STALE_SETTINGS, STALE_FINANCIAL, STALE_REALTIME, STALE_MESSAGING, STALE_LIVE } from './queryStaleTime';
export { cn } from './utils';
