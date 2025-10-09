import api from './api';

export const sellerService = {
  // Get seller profile
  getProfile: async () => {
    const response = await api.get('/sellers/profile');
    return response.data;
  },

  // Create seller profile
  createProfile: async (profileData) => {
    const response = await api.post('/sellers/profile', profileData);
    return response.data;
  },

  // Update seller profile
  updateProfile: async (profileData) => {
    const response = await api.put('/sellers/profile', profileData);
    return response.data;
  },

  // Get seller dashboard stats
  getDashboard: async () => {
    const response = await api.get('/sellers/dashboard');
    return response.data;
  },
};

export default sellerService;
