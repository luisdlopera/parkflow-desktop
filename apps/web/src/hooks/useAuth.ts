import { useAuthStore } from '@/lib/stores/auth.store';
import { authService } from '@/services/auth.service';
import { useCallback } from 'react';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } = useAuthStore();

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await authService.getMe();
      setUser(userData);
    } catch (error) {
      setUser(null); // El interceptor ya manejará el 401 si ocurre y redirigirá si es necesario
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  const performLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout(); // Limpiar estado local independientemente de la respuesta
      window.location.href = '/login';
    }
  };

  const performLogin = async (credentials: Record<string, unknown>) => {
    const data = await authService.login(credentials);
    await initializeAuth(); // Recargar el estado del usuario tras un login exitoso
    return data;
  };

  return { 
    user, 
    isAuthenticated, 
    isLoading, 
    initializeAuth, 
    performLogout, 
    performLogin 
  };
};
