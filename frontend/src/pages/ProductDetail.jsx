import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Star, Package, Truck, Shield, ArrowLeft, Plus, Minus, ThumbsUp, User } from 'lucide-react';
import productService from '../services/productService';
import reviewService from '../services/reviewService';
import useCartStore from '../store/cartStore';
import toast from 'react-hot-toast';
import SimilarProducts from '../components/SimilarProducts';
import SellerOtherProducts from '../components/SellerOtherProducts';
import RecentlyViewed from '../components/RecentlyViewed';
import recommendationService from '../services/recommendationService';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    fetchReviewStats();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const data = await productService.getProduct(id);
      setProduct(data);
      
      // Track this product as recently viewed
      recommendationService.addToRecentlyViewed({
        id: data.id,
        name: data.name,
        price: data.price,
        images: data.images
      });
    } catch (error) {
      toast.error('Product not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const data = await reviewService.getProductReviews(id);
      setReviews(data);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const data = await reviewService.getProductReviewStats(id);
      setReviewStats(data);
    } catch (error) {
      console.error('Failed to load review stats:', error);
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      await reviewService.markHelpful(reviewId);
      toast.success('Thank you for your feedback!');
      fetchReviews();
    } catch (error) {
      toast.error('Failed to mark review as helpful');
    }
  };

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success(`Added ${quantity} item(s) to cart!`);
    setQuantity(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h2>
          <Link to="/products" className="text-primary-600 hover:text-primary-700">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/products" className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Products
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden border">
              {product.images.length > 0 ? (
                <img src={product.images[selectedImage]?.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-32 w-32 text-gray-400" />
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button key={image.id} onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-primary-600' : 'border-gray-200 hover:border-gray-300'}`}>
                    <img src={image.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < Math.floor(product.rating_average) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-gray-600">
                  {parseFloat(product.rating_average).toFixed(1)} ({product.total_reviews} reviews)
                </span>
              </div>
            </div>

            <div className="border-t border-b py-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-primary-600">${parseFloat(product.price).toFixed(2)}</span>
                {product.compare_at_price && (
                  <>
                    <span className="text-2xl text-gray-500 line-through">${parseFloat(product.compare_at_price).toFixed(2)}</span>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">Save {discount}%</span>
                  </>
                )}
              </div>
            </div>

            <div>
              {product.quantity > 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Package className="h-5 w-5" />
                  <span className="font-medium">{product.quantity} in stock{product.quantity <= product.low_stock_threshold && ' - Low stock!'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <Package className="h-5 w-5" />
                  <span className="font-medium">Out of stock</span>
                </div>
              )}
            </div>

            {product.description && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {product.quantity > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center border border-gray-300 rounded-lg w-32">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-gray-100">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex-1 text-center font-medium">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))} className="p-3 hover:bg-gray-100">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button onClick={handleAddToCart} className="w-full btn-primary flex items-center justify-center text-lg py-4">
                  <ShoppingCart className="h-6 w-6 mr-2" />
                  Add to Cart
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <Truck className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Free Shipping</p>
              </div>
              <div className="text-center">
                <Shield className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Secure Payment</p>
              </div>
              <div className="text-center">
                <Package className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Product Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">SKU:</span>
                <span className="font-medium">{product.sku || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{product.is_digital ? 'Digital' : 'Physical'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Views:</span>
                <span className="font-medium">{product.views_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sales:</span>
                <span className="font-medium">{product.sales_count}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Seller Information</h3>
            <p className="text-gray-600 mb-4">This product is sold by a verified seller on ShopNest.</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold">Verified Seller</p>
                <p className="text-sm text-gray-600">Ships from Ghana</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="card">
            <h3 className="text-2xl font-bold mb-6">Customer Reviews</h3>
            
            {reviewStats && reviewStats.total_reviews > 0 && (
              <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                      <span className="text-5xl font-bold text-gray-900">{reviewStats.average_rating.toFixed(1)}</span>
                      <div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-5 w-5 ${i < Math.floor(reviewStats.average_rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Based on {reviewStats.total_reviews} review{reviewStats.total_reviews !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviewStats.rating_distribution[rating] || 0;
                      const percentage = reviewStats.total_reviews > 0 ? (count / reviewStats.total_reviews) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-sm w-12">{rating} star</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {reviewsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading reviews...</p>
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="border-b last:border-b-0 pb-6 last:pb-0">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{review.user_name || 'Anonymous'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                ))}
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3 whitespace-pre-line">{review.comment}</p>
                        <button onClick={() => handleMarkHelpful(review.id)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                          <ThumbsUp className="h-4 w-4" />
                          <span>Helpful ({review.helpful_count})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h4>
                  <p className="text-gray-600">Be the first to review this product!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommendation Sections */}
        {product && <SimilarProducts productId={product.id} limit={8} />}
        
        {product && product.seller && (
          <SellerOtherProducts 
            sellerId={product.seller.id}
            productId={product.id}
            sellerName={product.seller.business_name}
            limit={8}
          />
        )}
        
        <RecentlyViewed currentProductId={product?.id} limit={8} />
      </div>
    </div>
  );
};

export default ProductDetail;
