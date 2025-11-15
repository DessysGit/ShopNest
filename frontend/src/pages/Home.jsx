import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Users, Shield, TrendingUp, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import productService from '../services/productService';
import useAuthStore from '../store/authStore';
import PopularProducts from '../components/PopularProducts';

const Home = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Redirect admin/seller to their dashboards
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
        return;
      } else if (user.role === 'seller') {
        navigate('/seller/dashboard');
        return;
      }
    }
    
    // For buyers and guests, fetch products
    fetchProducts();
  }, [isAuthenticated, user, navigate]);

  const fetchProducts = async () => {
    try {
      const response = await productService.getProducts({
        page: 1,
        page_size: 12,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      setProducts(response.items || response || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  // Show loading while checking auth and redirecting
  if (isAuthenticated && user && (user.role === 'admin' || user.role === 'seller')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // For logged-in buyers - show products directly with search
  if (isAuthenticated && user && user.role === 'buyer') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Search Header */}
        <div className="bg-white border-b sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome back, {user.first_name || 'Shopper'}! 👋
            </h1>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-3xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products..."
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Popular Products Recommendations */}
          <PopularProducts limit={12} title="Recommended For You" />

          <div className="flex justify-between items-center mb-6 mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Latest Products</h2>
            <Link 
              to="/products" 
              className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                  <div className="bg-gray-300 h-48"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="aspect-square bg-gray-200 overflow-hidden">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary-600">
                        ${parseFloat(product.price).toFixed(2)}
                      </span>
                      {product.quantity > 0 ? (
                        <span className="text-sm text-green-600 font-medium">In Stock</span>
                      ) : (
                        <span className="text-sm text-red-600 font-medium">Out of Stock</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">No products available yet</p>
              <p className="text-gray-500">Check back soon for new products!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For guests - show simple landing page
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Simplified */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to ShopNest
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              Your trusted marketplace for quality products from verified sellers
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Sign In to Shop
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors border-2 border-white"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Features */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-primary-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="font-semibold mb-1">Wide Selection</h3>
              <p className="text-sm text-gray-600">Thousands of products</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="font-semibold mb-1">Verified Sellers</h3>
              <p className="text-sm text-gray-600">Trusted merchants</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="font-semibold mb-1">Secure Payments</h3>
              <p className="text-sm text-gray-600">Safe transactions</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="font-semibold mb-1">Best Prices</h3>
              <p className="text-sm text-gray-600">Great deals daily</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Products Preview */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Explore Our Marketplace</h2>
            <p className="text-gray-600">Sign in to browse and shop thousands of products</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                  <div className="bg-gray-300 h-48"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden opacity-75"
                >
                  <div className="aspect-square bg-gray-200 overflow-hidden">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <span className="text-2xl font-bold text-primary-600">
                      ${parseFloat(product.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Products coming soon!</p>
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              to="/login"
              className="inline-flex items-center px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Sign In to View All Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Seller CTA */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-3">Want to Sell on ShopNest?</h2>
          <p className="text-lg mb-6 text-primary-100">
            Join our marketplace and reach thousands of customers
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Register as Seller
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
