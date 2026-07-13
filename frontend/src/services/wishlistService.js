/**
 * Wishlist API Service
 * ====================
 * Provides methods to interact with the Wishlist API endpoints.
 * Handles all wishlist-related operations: fetching, adding, and removing items.
 * 
 * This service is used throughout the frontend to manage user wishlists,
 * including updating the heart icon state on product cards and the wishlist page.
 */

import api from './api';

/**
 * Wishlist Service Object
 * Contains all wishlist-related API methods with proper error handling.
 */
export const wishlistService = {
  /**
   * Get all wishlist items for the current authenticated user.
   * Fetches the user's wishlist with full product details included.
   * 
   * @returns {Promise<Array>} Array of wishlist items with product details,
   *                          or empty array if none exist or error occurs
   * @throws {Error} Silently caught and logged - returns empty array on failure
   */
  getWishlist: async () => {
    try {
      const response = await api.get('/wishlist');
      return response.data;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return [];
    }
  },

  /**
   * Add a product to the user's wishlist.
   * Creates a persistent saved item that appears in the wishlist page.
   * 
   * @param {string} productId - UUID of the product to add
   * @returns {Promise<Object>} The created wishlist item response
   * @throws {Error} Thrown to caller for display - product not found or already saved
   */
  addToWishlist: async (productId) => {
    try {
      const response = await api.post(`/wishlist/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  },

  /**
   * Remove a product from the user's wishlist.
   * Permanently deletes the wishlist item.
   * 
   * @param {string} productId - UUID of the product to remove
   * @returns {Promise<boolean>} True if removal was successful
   * @throws {Error} Thrown to caller for display - product not in wishlist
   */
  removeFromWishlist: async (productId) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  /**
   * Check if a specific product is in the user's wishlist.
   * Used to determine if the wishlist heart icon should be filled.
   * 
   * @param {string} productId - UUID of the product to check
   * @returns {Promise<boolean>} True if product is in wishlist, false otherwise
   * @throws {Error} Silently caught - returns false on failure
   */
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