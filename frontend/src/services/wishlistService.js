import api from './api';

export const wishlistService = {
  // Get user's wishlist
  getWishlist: async () => {
    try {
      const response = await api.get('/wishlist');
      return response.data;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return [];
    }
  },

  // Add product to wishlist
  addToWishlist: async (productId) => {
    try {
      const response = await api.post(`/wishlist/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  },

  // Remove product from wishlist
  removeFromWishlist: async (productId) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  // Check if product is in wishlist
  checkWishlist: async (productId) => {
    try {
      const response = await api.get(`/wishlist/check/${productId}`);
      return response.data.in_wishlist;
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  }
};

export default wishlistService;