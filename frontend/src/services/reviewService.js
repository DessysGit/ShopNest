import api from './api';

export const reviewService = {
  // Create a new review
  createReview: async (reviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },

  // Get reviews for a product
  getProductReviews: async (productId, skip = 0, limit = 20) => {
    const response = await api.get(`/reviews/product/${productId}`, {
      params: { skip, limit },
    });
    return response.data;
  },

  // Get review statistics for a product
  getProductReviewStats: async (productId) => {
    const response = await api.get(`/reviews/product/${productId}/stats`);
    return response.data;
  },

  // Get current user's reviews
  getMyReviews: async () => {
    const response = await api.get('/reviews/my-reviews');
    return response.data;
  },

  // Update a review
  updateReview: async (reviewId, reviewData) => {
    const response = await api.put(`/reviews/${reviewId}`, reviewData);
    return response.data;
  },

  // Delete a review
  deleteReview: async (reviewId) => {
    const response = await api.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  // Mark review as helpful
  markHelpful: async (reviewId) => {
    const response = await api.post(`/reviews/${reviewId}/helpful`);
    return response.data;
  },
};

export default reviewService;
