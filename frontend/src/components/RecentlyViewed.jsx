import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import recommendationService from '../services/recommendationService';

const RecentlyViewed = ({ currentProductId, limit = 8 }) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const recentlyViewed = recommendationService.getRecentlyViewed(limit);
    // Filter out current product
    const filtered = recentlyViewed.filter(p => p.id !== currentProductId);
    setProducts(filtered);
  }, [currentProductId, limit]);

  const handleClear = () => {
    recommendationService.clearRecentlyViewed();
    setProducts([]);
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-indigo-600" />
          Recently Viewed
        </h2>
        <button
          onClick={handleClear}
          className="text-sm text-gray-600 hover:text-red-600 transition-colors flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
          >
            {/* Product Image */}
            <div className="relative h-32 bg-gray-100 overflow-hidden">
              <img
                src={product.images?.[0]?.image_url || '/placeholder-product.png'}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            {/* Product Info */}
            <div className="p-3">
              <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {product.name}
              </h3>
              
              {/* Price */}
              <span className="text-base font-bold text-gray-900">
                ${parseFloat(product.price).toFixed(2)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentlyViewed;
