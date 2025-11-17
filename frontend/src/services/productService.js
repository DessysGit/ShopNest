import api from './api';

export const productService = {
  // Get all products with filters
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  // Get single product
  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Create product (seller)
  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Update product (seller) - includes images in the main payload
  updateProduct: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  // Delete product (seller)
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // Get seller's products
  getMyProducts: async (includeInactive = false) => {
    const response = await api.get('/products/seller/my-products', {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },
};

export default productService;
