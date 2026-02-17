import { describe, it, expect } from 'vitest';
import { maskNationalId, maskBankAccount, maskPhone, maskEmail } from './maskData';

describe('maskNationalId', () => {
  it('returns empty string for null', () => {
    expect(maskNationalId(null)).toBe('');
  });

  it('masks full national ID showing last 4', () => {
    expect(maskNationalId('1234567890')).toBe('****7890');
  });

  it('returns **** for IDs with 4 or fewer chars', () => {
    expect(maskNationalId('1234')).toBe('****');
    expect(maskNationalId('12')).toBe('****');
  });
});

describe('maskBankAccount', () => {
  it('returns empty string for null', () => {
    expect(maskBankAccount(null)).toBe('');
  });

  it('masks bank account showing last 4', () => {
    expect(maskBankAccount('SA1234567890123456')).toBe('****3456');
  });

  it('returns **** for short accounts', () => {
    expect(maskBankAccount('1234')).toBe('****');
  });
});

describe('maskPhone', () => {
  it('returns empty string for null', () => {
    expect(maskPhone(null)).toBe('');
  });

  it('masks phone showing last 4 digits', () => {
    expect(maskPhone('0551234567')).toBe('****4567');
  });

  it('handles short phone numbers', () => {
    expect(maskPhone('123')).toBe('****');
  });
});

describe('maskEmail', () => {
  it('returns empty string for null', () => {
    expect(maskEmail(null)).toBe('');
  });

  it('masks email preserving domain', () => {
    expect(maskEmail('ahmed@example.com')).toBe('a***@example.com');
  });

  it('handles short usernames', () => {
    expect(maskEmail('ab@x.com')).toBe('**@x.com');
  });

  it('returns **** for invalid email without @', () => {
    expect(maskEmail('noemail')).toBe('****');
  });

  it('handles single char username', () => {
    expect(maskEmail('a@x.com')).toBe('**@x.com');
  });
});
