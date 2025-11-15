import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Sparkles } from 'lucide-react';
import recommendationService from '../services/recommendationService';

const SimilarProducts = ({ productId, limit = 8 }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      if (!productId) return;
      
      setLoading(true);
      try {
        const data = await recommendationService.getSimilarProducts(productId, limit);
        setProducts(data || []);
      } catch (error) {
        console.log('Similar products not available yet');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarProducts();
  }, [productId, limit]);

  if (loading) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          Similar Products
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-indigo-600" />
        Similar Products
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            {/* Product Image */}
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              <img
                src={product.images?.[0]?.image_url || '/placeholder-product.png'}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {product.name}
              </h3>
              
              {/* Rating */}
              {product.rating_average > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {product.rating_average.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({product.total_reviews})
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
                
                {/* Stock Status */}
                {product.quantity < 10 && product.quantity > 0 && (
                  <span className="text-xs text-orange-600 font-medium">
                    Only {product.quantity} left
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SimilarProducts;
