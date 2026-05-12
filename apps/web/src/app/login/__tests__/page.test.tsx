import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';
import { login, loadSession, currentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

// Mock auth
vi.mock('@/lib/auth', () => ({
  login: vi.fn(),
  loadSession: vi.fn(),
  currentUser: vi.fn(),
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('LoginPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    } as any);
    vi.mocked(loadSession).mockResolvedValue(null);
    vi.mocked(currentUser).mockResolvedValue(null);
  });

  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar al sistema/i })).toBeInTheDocument();
  });

  it('calls login function on submit', async () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /entrar al sistema/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        password: 'Password123!',
      }));
    });
  });

  it('displays error message on login failure', async () => {
    vi.mocked(login).mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /entrar al sistema/i });

    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
