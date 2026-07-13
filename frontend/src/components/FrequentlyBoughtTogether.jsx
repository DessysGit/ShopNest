import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import recommendationService from '../services/recommendationService';
import wishlistService from '../services/wishlistService';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import toast from 'react-hot-toast';

const FrequentlyBoughtTogether = ({ productId, limit = 4 }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistProductIds, setWishlistProductIds] = useState(new Set());
  const { isAuthenticated } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!productId) return;
    
    const fetchFrequentlyBoughtTogether = async () => {
      setLoading(true);
      try {
        const data = await recommendationService.getFrequentlyBoughtTogether(productId, limit);
        setRecommendations(data.recommendations || []);
      } catch (error) {
        console.log('Frequently bought together not available yet');
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFrequentlyBoughtTogether();
  }, [productId, limit]);

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

  const handleAddToCart = (product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      images: product.images,
      primary_image: product.primary_image
    }, 1);
    toast.success(`${product.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-indigo-600" />
          Frequently Bought Together
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6 text-indigo-600" />
        Frequently Bought Together
      </h2>
      <p className="text-gray-600 mb-4">Customers who bought this item also bought:</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {recommendations.map((item) => {
          const product = item.product;
          if (!product) return null;

          return (
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
                  <Heart className="w-3 h-3" />
                </button>
              )}

              {/* Product Image */}
              <div className="relative h-32 bg-gray-100 overflow-hidden">
                <img
                  src={product.primary_image || product.images?.[0]?.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                  }}
                />
              </div>

              {/* Product Info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                  {product.name}
                </h3>
                
                <span className="text-lg font-bold text-primary-600">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;