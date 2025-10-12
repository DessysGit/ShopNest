import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Loader, Package } from 'lucide-react';
import orderService from '../services/orderService';
import reviewService from '../services/reviewService';
import toast from 'react-hot-toast';

const ReviewProduct = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [reviews, setReviews] = useState({});

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const data = await orderService.getOrder(orderId);
      setOrder(data);
      
      // Initialize reviews object for each item
      const initialReviews = {};
      data.items.forEach(item => {
        initialReviews[item.id] = {
          rating: 5,
          comment: ''
        };
      });
      setReviews(initialReviews);
    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (itemId, rating) => {
    setReviews(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        rating
      }
    }));
  };

  const handleCommentChange = (itemId, comment) => {
    setReviews(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        comment
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all reviews have comments
    const hasEmptyComments = Object.values(reviews).some(review => !review.comment.trim());
    if (hasEmptyComments) {
      toast.error('Please provide a review for all products');
      return;
    }

    // Validate minimum comment length
    const hasShortComments = Object.values(reviews).some(review => review.comment.trim().length < 10);
    if (hasShortComments) {
      toast.error('Reviews must be at least 10 characters long');
      return;
    }

    setSubmitting(true);
    try {
      // Submit each review
      const reviewPromises = Object.entries(reviews).map(([itemId, review]) => {
        const item = order.items.find(i => i.id === itemId);
        return reviewService.createReview({
          product_id: item.product_id,
          order_id: orderId,
          rating: review.rating,
          comment: review.comment
        });
      });

      await Promise.all(reviewPromises);
      
      toast.success('Thank you for your reviews! 🌟');
      navigate('/orders');
    } catch (error) {
      console.error('Review submission error:', error);
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already reviewed')) {
        toast.error('You have already reviewed this product');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to submit reviews');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Orders
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Write Reviews</h1>
          <p className="text-gray-600">
            Order #{order.order_number} • {order.items.length} product(s)
          </p>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {order.items.map((item) => (
            <div key={item.id} className="card">
              <div className="flex gap-4 mb-6">
                {item.product?.images?.[0] ? (
                  <img
                    src={item.product.images[0].image_url}
                    alt={item.product_name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {item.product_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Quantity: {item.quantity} • ${parseFloat(item.price).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(item.id, star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= reviews[item.id]?.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600 self-center">
                    {reviews[item.id]?.rating} star(s)
                  </span>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review *
                </label>
                <textarea
                  value={reviews[item.id]?.comment || ''}
                  onChange={(e) => handleCommentChange(item.id, e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Tell others about your experience with this product..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 10 characters ({reviews[item.id]?.comment?.length || 0}/10)
                </p>
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Your review will help other customers make better decisions
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center"
              >
                {submitting ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Reviews'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Guidelines */}
        <div className="card mt-6 bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Review Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be honest and fair in your review</li>
            <li>• Focus on the product quality and experience</li>
            <li>• Keep it respectful and constructive</li>
            <li>• Don't include personal information</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReviewProduct;
