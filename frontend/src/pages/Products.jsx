import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShoppingBag, Star } from 'lucide-react';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import useCartStore from '../store/cartStore';
import toast from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    min_price: '',
    max_price: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.min_price) params.min_price = filters.min_price;
      if (filters.max_price) params.max_price = filters.max_price;
      params.sort_by = filters.sort_by;
      params.sort_order = filters.sort_order;

      const data = await productService.getProducts(params);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleAddToCart = (product) => {
    addItem(product, 1);
    toast.success('Added to cart!');
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category_id: '',
      min_price: '',
      max_price: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">Discover amazing products from verified sellers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Clear
                </button>
              </div>

              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="Search products..."
                    className="input-field pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </form>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category_id"
                  value={filters.category_id}
                  onChange={handleFilterChange}
                  className="input-field"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    name="min_price"
                    value={filters.min_price}
                    onChange={handleFilterChange}
                    placeholder="Min"
                    className="input-field"
                    min="0"
                  />
                  <input
                    type="number"
                    name="max_price"
                    value={filters.max_price}
                    onChange={handleFilterChange}
                    placeholder="Max"
                    className="input-field"
                    min="0"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  name="sort_by"
                  value={filters.sort_by}
                  onChange={handleFilterChange}
                  className="input-field"
                >
                  <option value="created_at">Newest</option>
                  <option value="price">Price</option>
                  <option value="rating">Rating</option>
                  <option value="sales">Best Selling</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <select
                  name="sort_order"
                  value={filters.sort_order}
                  onChange={handleFilterChange}
                  className="input-field"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="mb-4 text-gray-600">
                  {products.length} product{products.length !== 1 ? 's' : ''} found
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="card hover:shadow-lg transition-shadow">
                      <Link to={`/products/${product.id}`}>
                        <div className="aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden">
                          {product.primary_image ? (
                            <img
                              src={product.primary_image}
                              alt={product.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-16 w-16 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </Link>

                      <Link to={`/products/${product.id}`}>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-primary-600">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center mb-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {parseFloat(product.rating_average).toFixed(1)} ({product.total_reviews})
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-2xl font-bold text-primary-600">
                            ${parseFloat(product.price).toFixed(2)}
                          </span>
                          {product.compare_at_price && (
                            <span className="text-sm text-gray-500 line-through ml-2">
                              ${parseFloat(product.compare_at_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {product.quantity > 0 ? (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-full btn-primary"
                        >
                          Add to Cart
                        </button>
                      ) : (
                        <button disabled className="w-full btn-secondary cursor-not-allowed">
                          Out of Stock
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or search terms
                </p>
                <button onClick={clearFilters} className="btn-primary">
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
