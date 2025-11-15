import api from './api';

/**
 * Recommendation Service
 * Handles all product recommendation API calls
 */

const recommendationService = {
  /**
   * Get similar products based on category and price
   */
  getSimilarProducts: async (productId, limit = 8) => {
    try {
      const response = await api.get(`/recommendations/similar/${productId}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching similar products:', error);
      return [];
    }
  },

  /**
   * Get popular products (best sellers)
   */
  getPopularProducts: async (limit = 12) => {
    try {
      const response = await api.get('/recommendations/popular', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching popular products:', error);
      return [];
    }
  },

  /**
   * Get trending products
   */
  getTrendingProducts: async (limit = 12) => {
    try {
      const response = await api.get('/recommendations/trending', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trending products:', error);
      return [];
    }
  },

  /**
   * Get other products from the same seller
   */
  getSellerOtherProducts: async (sellerId, productId, limit = 8) => {
    try {
      const response = await api.get(`/recommendations/seller/${sellerId}/other/${productId}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching seller products:', error);
      return [];
    }
  },

  /**
   * Get products frequently bought together
   */
  getFrequentlyBoughtTogether: async (productId, limit = 4) => {
    try {
      const response = await api.get(`/recommendations/bought-together/${productId}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching bought together products:', error);
      return { product_id: productId, recommendations: [] };
    }
  },

  /**
   * Get popular products in a category
   */
  getCategoryRecommendations: async (categoryId, excludeId = null, limit = 8) => {
    try {
      const response = await api.get(`/recommendations/category/${categoryId}`, {
        params: { exclude_id: excludeId, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching category recommendations:', error);
      return [];
    }
  },

  /**
   * Track recently viewed products in localStorage
   */
  addToRecentlyViewed: (product) => {
    try {
      const key = 'shopnest_recently_viewed';
      const recentlyViewed = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Remove if already exists
      const filtered = recentlyViewed.filter(p => p.id !== product.id);
      
      // Add to front
      filtered.unshift(product);
      
      // Keep only last 12
      const limited = filtered.slice(0, 12);
      
      localStorage.setItem(key, JSON.stringify(limited));
    } catch (error) {
      console.error('Error saving to recently viewed:', error);
    }
  },

  /**
   * Get recently viewed products from localStorage
   */
  getRecentlyViewed: (limit = 8) => {
    try {
      const key = 'shopnest_recently_viewed';
      const recentlyViewed = JSON.parse(localStorage.getItem(key) || '[]');
      return recentlyViewed.slice(0, limit);
    } catch (error) {
      console.error('Error getting recently viewed:', error);
      return [];
    }
  },

  /**
   * Clear recently viewed history
   */
  clearRecentlyViewed: () => {
    try {
      localStorage.removeItem('shopnest_recently_viewed');
    } catch (error) {
      console.error('Error clearing recently viewed:', error);
    }
  }
};

export default recommendationService;
