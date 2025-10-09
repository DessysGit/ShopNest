import api from './api';

export const categoryService = {
  // Get all categories
  getCategories: async (includeInactive = false) => {
    const response = await api.get('/categories', {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  // Get single category
  getCategory: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Create category (admin)
  createCategory: async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  // Update category (admin)
  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  // Delete category (admin)
  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

export default categoryService;
