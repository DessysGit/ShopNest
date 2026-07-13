import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, Heart } from 'lucide-react';
import recommendationService from '../services/recommendationService';
import wishlistService from '../services/wishlistService';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const TrendingProducts = ({ limit = 8, title = "Trending Products" }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistProductIds, setWishlistProductIds] = useState(new Set());
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const fetchTrendingProducts = async () => {
      setLoading(true);
      try {
        const data = await recommendationService.getTrendingProducts(limit);
        setProducts(data || []);
      } catch (error) {
        console.log('Trending products not available yet');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingProducts();
  }, [limit]);

  // Fetch wishlist to highlight saved items
  useEffect(() => {
    if (isAuthenticated) {
      const fetchWishlist = async () => {
        try {
          const data = await wishlistService.getWishlist();
          setWishlistProductIds(new Set(data.map(item => item.product?.id)));
        } catch (error) {
          // Silently fail
        }
      };
      fetchWishlist();
    }
  }, [isAuthenticated]);

  const handleWishlistToggle = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (wishlistProductIds.has(product.id)) {
        await wishlistService.removeFromWishlist(product.id);
        setWishlistProductIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(product.id);
          return newSet;
        });
        toast.success('Removed from wishlist');
      } else {
        await wishlistService.addToWishlist(product.id);
        setWishlistProductIds(prev => new Set(prev).add(product.id));
        toast.success('Added to wishlist!');
      }
    } catch (error) {
      toast.error('Login to save items');
    }
  };

  if (loading) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(limit)].map((_, i) => (
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
        <TrendingUp className="w-6 h-6 text-indigo-600" />
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden relative"
          >
            {/* Wishlist Button */}
            {isAuthenticated && (
              <button
                onClick={(e) => handleWishlistToggle(e, product)}
                className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-all ${
                  wishlistProductIds.has(product.id)
                    ? 'bg-red-500 text-white'
                    : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
                }`}
                title={wishlistProductIds.has(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className="w-4 h-4" />
              </button>
            )}

            {/* Product Image */}
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              <img
                src={product.primary_image || product.images?.[0]?.image_url || 'https://via.placeholder.com/400x400?text=No+Image'}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x400?text=No+Image';
                }}
              />
              
              {/* Trending Badge */}
              <div className="absolute bottom-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending
              </div>
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
                <div>
                  <span className="text-xl font-bold text-gray-900">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                </div>
                
                {/* Sales Count */}
                {product.sales_count > 0 && (
                  <span className="text-xs text-gray-500">
                    {product.sales_count} sold
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

export default TrendingProducts;