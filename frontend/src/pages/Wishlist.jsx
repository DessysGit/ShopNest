/**
 * Wishlist Page Component
 * =======================
 * Displays the user's saved wishlist items with product details, images, and prices.
 * Allows users to view products, add them to cart, or remove from wishlist.
 * 
 * URL: /wishlist
 * Access: Protected route - requires authentication
 * 
 * Features:
 * - Grid layout of wishlist items (responsive: 1/2/4 columns)
 * - Product image with remove button overlay
 * - Stock status indicator
 * - Rating display
 * - Add to Cart button (only for in-stock items)
 * - View Product link to product detail page
 * - Empty state with call-to-action
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react';
import wishlistService from '../services/wishlistService';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Wishlist Page Component
 * Main component for displaying and managing user's wishlist items.
 */
const Wishlist = () => {
  // State for wishlist items and loading status
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get cart store action and auth state
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();

  // Fetch wishlist when component mounts or auth status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated]);

  /**
   * Fetch all wishlist items for the authenticated user.
   * Updates local state with the fetched data.
   */
  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const data = await wishlistService.getWishlist();
      setWishlistItems(data);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove a product from the wishlist.
   * @param {string} productId - UUID of product to remove
   * @param {string} productName - Name for toast notification
   */
  const handleRemove = async (productId, productName) => {
    try {
      await wishlistService.removeFromWishlist(productId);
      toast.success(`${productName} removed from wishlist`);
      fetchWishlist(); // Refresh wishlist after removal
    } catch (error) {
      toast.error('Failed to remove from wishlist');
    }
  };

  /**
   * Add product to cart from wishlist with quantity of 1.
   * @param {Object} product - Product object from wishlist item
   */
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

  // Show sign-in prompt for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your wishlist</p>
          <Link to="/login" className="btn-primary inline-block">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  // Main wishlist page rendering
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section - Shows wishlist count */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500" />
            My Wishlist
          </h1>
          <p className="text-gray-600">
            {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} saved for later
          </p>
        </div>

        {/* Wishlist Items Grid - Empty state or product cards */}
        {wishlistItems.length === 0 ? (
          // Empty state - prompt user to browse products
          <div className="card text-center py-12">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-600 mb-6">
              Save products you love to your wishlist and come back anytime
            </p>
            <Link to="/products" className="btn-primary inline-block">
              Browse Products
            </Link>
          </div>
        ) : (
          // Product cards grid - responsive layout
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistItems.map((item) => {
              const product = item.product;
              // Skip if product data is missing (edge case)
              if (!product) return null;

              return (
                <div key={item.id} className="card hover:shadow-lg transition-shadow">
                  {/* Product Image with Remove Button Overlay */}
                  <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden mb-4">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // Fallback placeholder when no image exists
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Remove from Wishlist Button - Top-right corner */}
                    <button
                      onClick={() => handleRemove(product.id, product.name)}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>

                  {/* Product Info - Name and Price */}
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-primary-600">
                      ${parseFloat(product.price).toFixed(2)}
                    </span>
                    {/* Stock Status Indicator */}
                    {product.quantity > 0 ? (
                      <span className="text-sm text-green-600 font-medium">In Stock</span>
                    ) : (
                      <span className="text-sm text-red-600 font-medium">Out of Stock</span>
                    )}
                  </div>

                  {/* Product Rating - Only shown if reviews exist */}
                  {product.rating_average > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        {product.rating_average.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({product.total_reviews} reviews)
                      </span>
                    </div>
                  )}

                  {/* Action Buttons - View Product and Add to Cart */}
                  <div className="space-y-2">
                    <Link
                      to={`/products/${product.id}`}
                      className="w-full btn-secondary flex items-center justify-center"
                    >
                      View Product
                    </Link>
                    {/* Add to Cart only available for in-stock items */}
                    {product.quantity > 0 && (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full btn-primary flex items-center justify-center"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;