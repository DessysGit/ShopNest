import { create } from 'zustand';
import authService from '../services/authService';
import useCartStore from './cartStore';

const useAuthStore = create((set) => ({
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),

  login: async (credentials) => {
    const data = await authService.login(credentials);
    set({ user: data.user, isAuthenticated: true });
    
    // Initialize cart for this user
    useCartStore.getState().initializeCart();
    
    return data;
  },

  register: async (userData) => {
    const data = await authService.register(userData);
    set({ user: data.user, isAuthenticated: true });
    
    // Initialize cart for this user
    useCartStore.getState().initializeCart();
    
    return data;
  },

  logout: () => {
    authService.logout();
    
    // Clear cart on logout
    useCartStore.getState().clearOnLogout();
    
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    set({ user: userData });
  },
}));

export default useAuthStore;
