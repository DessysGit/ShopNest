import api from './api';

export const adminService = {
  // Get pending sellers
  getPendingSellers: async () => {
    const response = await api.get('/admin/sellers/pending');
    return response.data;
  },

  // Get all sellers
  getAllSellers: async () => {
    const response = await api.get('/admin/sellers/all');
    return response.data;
  },

  // Approve or reject seller
  approveSeller: async (sellerId, action, rejectionReason = null) => {
    const response = await api.post(`/admin/sellers/${sellerId}/approval`, {
      action,
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // Suspend seller
  suspendSeller: async (sellerId) => {
    const response = await api.put(`/admin/sellers/${sellerId}/suspend`);
    return response.data;
  },

  // Reactivate seller
  reactivateSeller: async (sellerId) => {
    const response = await api.put(`/admin/sellers/${sellerId}/reactivate`);
    return response.data;
  },

  // Get dashboard stats
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
};

export default adminService;
