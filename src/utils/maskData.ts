/**
 * Masks sensitive data for display purposes
 * Shows only the last 4 characters, replacing the rest with ****
 */
export const maskNationalId = (id: string | null): string => {
  if (!id) return '';
  if (id.length <= 4) return '****';
  return '****' + id.slice(-4);
};

export const maskBankAccount = (account: string | null): string => {
  if (!account) return '';
  if (account.length <= 4) return '****';
  return '****' + account.slice(-4);
};

export const maskPhone = (phone: string | null): string => {
  if (!phone) return '';
  if (phone.length <= 4) return '****';
  return '****' + phone.slice(-4);
};

export const maskEmail = (email: string | null): string => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '****';
  const name = parts[0];
  if (name.length <= 2) return '**@' + parts[1];
  return name[0] + '***@' + parts[1];
};
