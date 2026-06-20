import { apiClient } from '@/lib/axios';
import { User } from '@/lib/stores/auth.store';

export const authService = {
  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>('/me');
    return data;
  },
  
  async login(credentials: Record<string, unknown>) {
    const { data } = await apiClient.post('/login', credentials);
    return data; // Backend sends HttpOnly Set-Cookie
  },
  
  async logout() {
    await apiClient.post('/logout'); // Backend invalidates the cookie
  }
};
