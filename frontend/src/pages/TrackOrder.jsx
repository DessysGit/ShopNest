import { useState } from 'react';
import { Search, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../services/api';

const TrackOrder = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      const response = await api.get('/orders/track', {
        params: {
          order_number: orderNumber.trim(),
          email: email.trim()
        }
      });
      setOrderData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Unable to track order. Please check your order number and email.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'confirmed':
      case 'processing':
        return <Package className="w-6 h-6 text-blue-500" />;
      case 'shipped':
        return <Truck className="w-6 h-6 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Package className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'confirmed':
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'shipped':
        return 'text-purple-600 bg-purple-50';
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Track Your Order
          </h1>
          <p className="text-gray-600">
            Enter your order number and email to track your order status
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Number
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., ORD-A1B2C3D4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Track Order
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Information */}
        {orderData && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-4 mb-4">
                {getStatusIcon(orderData.status)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Order {orderData.order_number}
                  </h2>
                  <p className="text-gray-600">
                    Placed on {new Date(orderData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderData.status)}`}>
                  {getStatusText(orderData.status)}
                </span>
              </div>

              {orderData.tracking_number && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Tracking Number
                  </p>
                  <p className="text-lg font-semibold text-blue-600">
                    {orderData.tracking_number}
                  </p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items
              </h3>
              <div className="space-y-3">
                {orderData.items.map((item, index) => (
                  <div 
                    key={index}
                    className="flex justify-between items-center py-3 border-b last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} × ${item.price.toFixed(2)}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      ${item.subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${orderData.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {orderData.shipping_address && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Shipping Address
                </h3>
                <div className="text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">
                    {orderData.shipping_address.full_name}
                  </p>
                  <p>{orderData.shipping_address.street_address}</p>
                  {orderData.shipping_address.apartment && (
                    <p>{orderData.shipping_address.apartment}</p>
                  )}
                  <p>
                    {orderData.shipping_address.city}, {orderData.shipping_address.state} {orderData.shipping_address.postal_code}
                  </p>
                  <p>{orderData.shipping_address.country}</p>
                  {orderData.shipping_address.phone && (
                    <p className="mt-2">Phone: {orderData.shipping_address.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Track Another Order */}
            <div className="text-center">
              <button
                onClick={() => {
                  setOrderData(null);
                  setOrderNumber('');
                  setEmail('');
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Track Another Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
