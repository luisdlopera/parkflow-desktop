import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authBase } from '@/lib/api/config';

// Utilizamos la misma URL base que la configuración actual de auth
export const apiClient = axios.create({
  baseURL: authBase(),
  withCredentials: true, // ESENCIAL para enviar las cookies HttpOnly
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si el backend nos dice que no estamos autorizados
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout(); // Limpiar el estado de Zustand
      
      // Si estamos del lado del cliente, redirigir al login
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);
