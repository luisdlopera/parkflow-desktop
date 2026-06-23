import { describe, it, expect } from 'vitest';
import { loginSchema, setupSchema } from '@/lib/validation/auth.schema';

describe('loginSchema', () => {
  it('validates correct login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty fields', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('defaults rememberMe to false when omitted', () => {
    const result = loginSchema.parse({
      email: 'user@example.com',
      password: 'secret123',
    });
    expect(result.rememberMe).toBe(false);
  });

  it('accepts rememberMe as true', () => {
    const result = loginSchema.parse({
      email: 'user@example.com',
      password: 'secret123',
      rememberMe: true,
    });
    expect(result.rememberMe).toBe(true);
  });
});

describe('setupSchema', () => {
  it('validates correct setup data', () => {
    const result = setupSchema.safeParse({
      email: 'admin@example.com',
      password: 'longenough',
      confirmPassword: 'longenough',
      adminName: 'Admin User',
      companyName: 'My Business',
      companyNit: '123456789',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short password (min 8)', () => {
    const result = setupSchema.safeParse({
      email: 'admin@example.com',
      password: 'short',
      confirmPassword: 'short',
      adminName: 'Admin',
      companyName: 'Business',
      companyNit: '123456789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password mismatch', () => {
    const result = setupSchema.safeParse({
      email: 'admin@example.com',
      password: 'longenough',
      confirmPassword: 'different',
      adminName: 'Admin',
      companyName: 'Business',
      companyNit: '123456789',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmIssues = result.error.issues.filter(i => i.path.includes('confirmPassword'));
      expect(confirmIssues.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid email', () => {
    const result = setupSchema.safeParse({
      email: 'bad-email',
      password: 'longenough',
      confirmPassword: 'longenough',
      adminName: 'Admin',
      companyName: 'Business',
      companyNit: '123456789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing companyName', () => {
    const result = setupSchema.safeParse({
      email: 'admin@example.com',
      password: 'longenough',
      confirmPassword: 'longenough',
      adminName: 'Admin',
      companyName: '',
      companyNit: '123456789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing adminName', () => {
    const result = setupSchema.safeParse({
      email: 'admin@example.com',
      password: 'longenough',
      confirmPassword: 'longenough',
      adminName: '',
      companyName: 'Business',
      companyNit: '123456789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing companyNit', () => {
    const result = setupSchema.safeParse({
      email: 'admin@example.com',
      password: 'longenough',
      confirmPassword: 'longenough',
      adminName: 'Admin',
      companyName: 'Business',
      companyNit: '',
    });
    expect(result.success).toBe(false);
  });
});
