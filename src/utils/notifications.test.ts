import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing
const mockRpc = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
const mockInsert = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({ insert: (...args: unknown[]) => mockInsert(...args) }),
  },
}));

import { notifyAllBeneficiaries, notifyAdmins, notifyUser } from './notifications';

describe('notifications utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockReturnValue(Promise.resolve({ error: null }));
    mockInsert.mockReturnValue(Promise.resolve({ error: null }));
  });

  describe('notifyAllBeneficiaries', () => {
    it('calls rpc with correct parameters', async () => {
      notifyAllBeneficiaries('عنوان', 'رسالة', 'info', '/link');
      await vi.waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('notify_all_beneficiaries', {
          p_title: 'عنوان',
          p_message: 'رسالة',
          p_type: 'info',
          p_link: '/link',
        });
      });
    });

    it('uses default type and null link', async () => {
      notifyAllBeneficiaries('t', 'm');
      await vi.waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('notify_all_beneficiaries', {
          p_title: 't',
          p_message: 'm',
          p_type: 'info',
          p_link: null,
        });
      });
    });

    it('logs error on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRpc.mockReturnValue(Promise.resolve({ error: { message: 'fail' } }));
      notifyAllBeneficiaries('t', 'm');
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });
  });

  describe('notifyAdmins', () => {
    it('calls rpc with correct parameters', async () => {
      notifyAdmins('عنوان', 'رسالة', 'warning', '/admin');
      await vi.waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('notify_admins', {
          p_title: 'عنوان',
          p_message: 'رسالة',
          p_type: 'warning',
          p_link: '/admin',
        });
      });
    });
  });

  describe('notifyUser', () => {
    it('inserts notification for specific user', async () => {
      notifyUser('user-1', 'عنوان', 'رسالة', 'info', '/page');
      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          user_id: 'user-1',
          title: 'عنوان',
          message: 'رسالة',
          type: 'info',
          link: '/page',
        });
      });
    });

    it('uses null for missing link', async () => {
      notifyUser('user-1', 't', 'm');
      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({ link: null })
        );
      });
    });
  });
});
