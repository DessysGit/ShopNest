import api from './api';

export const orderService = {
  // Create a new order
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // Get user's orders
  getOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  // Get single order details
  getOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Cancel an order
  cancelOrder: async (orderId, reason) => {
    const response = await api.put(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  // Seller: Get seller's orders
  getSellerOrders: async () => {
    const response = await api.get('/sellers/orders');
    return response.data;
  },

  // Seller: Update order status
  updateOrderStatus: async (orderItemId, status, trackingNumber = null) => {
    const response = await api.put(`/sellers/orders/${orderItemId}/status`, {
      status,
      tracking_number: trackingNumber,
    });
    return response.data;
  },

  // Admin: Get all orders
  getAllOrders: async () => {
    const response = await api.get('/admin/orders');
    return response.data;
  },
};

export default orderService;
