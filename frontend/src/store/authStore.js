import { create } from 'zustand';
import authService from '../services/authService';

const useAuthStore = create((set) => ({
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),

  login: async (credentials) => {
    const data = await authService.login(credentials);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },

  register: async (userData) => {
    const data = await authService.register(userData);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    set({ user: userData });
  },
}));

export default useAuthStore;
