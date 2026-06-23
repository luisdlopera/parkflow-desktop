import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

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

const mockLogin = vi.hoisted(() => vi.fn());
vi.mock('@/features/auth/api/auth.api', () => ({
  login: mockLogin,
}));

vi.mock('@/lib/errors/get-user-error-message', () => ({
  getUserErrorMessage: vi.fn(() => ({ title: 'Error de autenticación', description: 'Credenciales inválidas' })),
}));

describe('LoginPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
    } as any);
  });

  describe('rendering', () => {
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

  describe('form submission', () => {
    it('calls login and redirects to dashboard on successful login', async () => {
      mockLogin.mockResolvedValueOnce({
        user: { id: '1', email: 'admin@test.com', onboardingCompleted: true },
      });
      render(<LoginPage />);
      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByTestId('password');
      const submitButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'admin@parkflow.local' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
      expect(mockReplace).toHaveBeenCalledWith('/');
    });

    it('redirects to onboarding if user has not completed onboarding', async () => {
      mockLogin.mockResolvedValueOnce({
        user: { id: '1', email: 'admin@test.com', onboardingCompleted: false },
      });
      render(<LoginPage />);
      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByTestId('password');
      const submitButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'admin@parkflow.local' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });
  });

  describe('error handling', () => {
    it('displays error message on failed login', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      render(<LoginPage />);
      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByTestId('password');
      const submitButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'badpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Error de autenticación/)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading indicator on submit button while logging in', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => { resolveLogin = resolve; });
      mockLogin.mockReturnValueOnce(loginPromise);

      render(<LoginPage />);
      const emailInput = screen.getByLabelText(/correo electrónico/i);
      const passwordInput = screen.getByTestId('password');
      const submitButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'admin@parkflow.local' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
      resolveLogin!({ user: { id: '1', email: 'admin@test.com', onboardingCompleted: true } });
    });
  });
});
