import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';
import { useRouter } from 'next/navigation';

// ──────────────────────────────────────────────────────────────────────────────
// Mocks de infraestructura
// ──────────────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: vi.fn(),
}));

vi.mock('@/auth/runtime/detectRuntime', () => ({
  isTauri: () => false,
}));

vi.mock('@/lib/services/remember-me.service', () => ({
  loadRememberMeEmail: vi.fn(() => null),
  saveRememberMeEmail: vi.fn(),
  clearRememberMeEmail: vi.fn(),
}));

vi.mock('@/lib/api/auth-api', () => ({
  checkSetupRequired: vi.fn(async () => ({ setupRequired: false })),
}));

vi.mock('@/hooks/auth/useAuthBroadcast', () => ({
  broadcastAuthEvent: vi.fn(),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Mocks del nuevo flujo: createAuthProvider + AuthSession
// ──────────────────────────────────────────────────────────────────────────────
const mockLogin = vi.fn();

vi.mock('@/auth/runtime/createAuthProvider', () => ({
  createAuthProvider: () => Promise.resolve({
    login: (...args: unknown[]) => mockLogin(...args),
    restoreSession: vi.fn(async () => null),
    logout: vi.fn(),
  }),
}));

// ──────────────────────────────────────────────────────────────────────────────
// Mocks auxiliares
// ──────────────────────────────────────────────────────────────────────────────
vi.mock('@/lib/stores/auth.store', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: null, isAuthenticated: false };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ setUser: vi.fn(), setPermissions: vi.fn(), setSessionExpiresAt: vi.fn() }) },
  ),
}));

vi.mock('@/lib/api/config', () => ({ authBase: () => 'http://localhost:6011/api/v1/auth' }));
vi.mock('@/lib/api/fetch-with-credentials', () => ({ fetchWithCredentials: vi.fn() }));

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN',
      onboardingCompleted: true,
      permissions: [],
      ...overrides,
    },
    session: { sessionId: 'sess-1', accessTokenExpiresAtIso: new Date(Date.now() + 3_600_000).toISOString() },
    offlineLease: null,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    permissions: [],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
    } as any);
    mockLogin.mockResolvedValue(buildSession());
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Renderizado
  // ──────────────────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────
  // Envío del formulario
  // ──────────────────────────────────────────────────────────────────────────
  describe('form submission', () => {
    it('calls auth provider login and redirects to dashboard', async () => {
      mockLogin.mockResolvedValue(buildSession({ onboardingCompleted: true }));

      render(<LoginPage />);
      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'admin@parkflow.local' },
      });
      fireEvent.change(screen.getByTestId('password'), {
        target: { value: 'Qwert.12345' },
      });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'admin@parkflow.local',
          password: 'Qwert.12345',
          rememberMe: false,
        });
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });

    it('redirects to /onboarding when onboardingCompleted is false', async () => {
      mockLogin.mockResolvedValue(buildSession({ onboardingCompleted: false }));

      render(<LoginPage />);
      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'nuevo@parkflow.local' },
      });
      fireEvent.change(screen.getByTestId('password'), {
        target: { value: 'Qwert.12345' },
      });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Manejo de errores
  // ──────────────────────────────────────────────────────────────────────────
  describe('error handling', () => {
    it('displays error when login fails', async () => {
      mockLogin.mockRejectedValue(new Error('AUTH_INVALID_CREDENTIALS'));

      render(<LoginPage />);
      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'wrong@test.com' },
      });
      fireEvent.change(screen.getByTestId('password'), {
        target: { value: 'badpassword' },
      });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByText(/error inesperado/i)).toBeInTheDocument();
      });
    });

    it('displays network error message', async () => {
      mockLogin.mockRejectedValue(new TypeError('Failed to fetch'));

      render(<LoginPage />);
      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'admin@test.com' },
      });
      fireEvent.change(screen.getByTestId('password'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Estado de carga
  // ──────────────────────────────────────────────────────────────────────────
  describe('loading state', () => {
    it('disables submit button while login is in progress', async () => {
      let resolveLogin!: (value: unknown) => void;
      const pendingLogin = new Promise((resolve) => { resolveLogin = resolve; });
      mockLogin.mockReturnValueOnce(pendingLogin);

      render(<LoginPage />);
      const submitButton = screen.getByTestId('login-button');

      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'admin@parkflow.local' },
      });
      fireEvent.change(screen.getByTestId('password'), {
        target: { value: 'Qwert.12345' },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      resolveLogin(buildSession());
    });
  });
});
