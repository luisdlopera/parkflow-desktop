import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from '../page';
import { useRouter } from 'next/navigation';

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock session and setup check
vi.mock('@/features/auth/services/auth-storage.service', () => ({
  loadSession: vi.fn(async () => null),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock('@/features/auth/services/auth-domain.service', () => ({
  currentUser: vi.fn(async () => null),
}));

vi.mock('@/lib/api/auth-api', () => ({
  checkSetupRequired: vi.fn(async () => ({ setupRequired: false })),
  postInitialSetup: vi.fn(),
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  login: vi.fn(),
}));

describe('LoginPage - Form Rendering', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: vi.fn(),
    } as any);
  });

  it('renders login form with correct structure', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByTestId('password')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /¿olvidaste tu contraseña/i })).toBeInTheDocument();
  });

  it('displays welcome message', () => {
    render(<LoginPage />);

    expect(screen.getByText('¡Bienvenido!')).toBeInTheDocument();
  });

  it('has remember me checkbox', () => {
    render(<LoginPage />);

    expect(screen.getByText('Recordarme')).toBeInTheDocument();
  });
});
