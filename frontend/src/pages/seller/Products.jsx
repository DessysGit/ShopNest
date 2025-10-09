import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Package, Eye, EyeOff } from 'lucide-react';
import productService from '../../services/productService';
import toast from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [showInactive]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getMyProducts(showInactive);
      setProducts(data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await productService.deleteProduct(id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete product');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Products</h1>
            <p className="text-gray-600">Manage your product listings</p>
          </div>
          <Link to="/seller/products/create" className="btn-primary flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </Link>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Show inactive products</span>
              </label>
            </div>
            <div className="text-sm text-gray-600">
              {products.length} product{products.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Products List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-300 rounded-lg"></div>
                  <div className="flex-grow">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex gap-6">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-medium text-primary-600 text-lg">
                            ${parseFloat(product.price).toFixed(2)}
                          </span>
                          <span>Stock: {product.quantity}</span>
                          <span>
                            {product.is_active ? (
                              <span className="flex items-center text-green-600">
                                <Eye className="h-4 w-4 mr-1" />
                                Active
                              </span>
                            ) : (
                              <span className="flex items-center text-gray-500">
                                <EyeOff className="h-4 w-4 mr-1" />
                                Inactive
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/products/${product.id}`}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                          title="View Product"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => toast.info('Edit feature coming soon!')}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit Product"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete Product"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
                      <span>⭐ {parseFloat(product.rating_average).toFixed(1)} ({product.total_reviews} reviews)</span>
                      {product.is_featured && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          Featured
                        </span>
                      )}
                      {product.quantity <= product.low_stock_threshold && product.quantity > 0 && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          Low Stock
                        </span>
                      )}
                      {product.quantity === 0 && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No products yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start adding products to your store
            </p>
            <Link to="/seller/products/create" className="btn-primary inline-flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
