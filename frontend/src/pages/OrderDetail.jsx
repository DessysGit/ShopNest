import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  ArrowLeft,
  AlertCircle,
  Download,
} from 'lucide-react';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const data = await orderService.getOrder(id);
      setOrder(data);
    } catch (error) {
      toast.error('Order not found');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusConfig = {
    pending: { icon: Clock, label: 'Pending', color: 'yellow' },
    confirmed: { icon: CheckCircle, label: 'Confirmed', color: 'blue' },
    processing: { icon: Package, label: 'Processing', color: 'purple' },
    shipped: { icon: Truck, label: 'Shipped', color: 'indigo' },
    delivered: { icon: CheckCircle, label: 'Delivered', color: 'green' },
    cancelled: { icon: AlertCircle, label: 'Cancelled', color: 'red' },
    refunded: { icon: AlertCircle, label: 'Refunded', color: 'gray' },
  };

  const currentStatus = statusConfig[order.status];
  const StatusIcon = currentStatus.icon;

  const orderSteps = [
    { status: 'pending', label: 'Order Placed' },
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'processing', label: 'Processing' },
    { status: 'shipped', label: 'Shipped' },
    { status: 'delivered', label: 'Delivered' },
  ];

  const currentStepIndex = orderSteps.findIndex((step) => step.status === order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Orders
        </button>

        {/* Header */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order #{order.order_number}
              </h1>
              <p className="text-gray-600">
                Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <span
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-${currentStatus.color}-100 text-${currentStatus.color}-800`}
              >
                <StatusIcon className="h-4 w-4 mr-2" />
                {currentStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Order Progress */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-6">Order Progress</h2>
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
                <div
                  className="h-full bg-primary-600 transition-all duration-500"
                  style={{
                    width: `${(currentStepIndex / (orderSteps.length - 1)) * 100}%`,
                  }}
                />
              </div>
              <div className="relative flex justify-between">
                {orderSteps.map((step, index) => {
                  const isComplete = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div key={step.status} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                          isComplete
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        } ${isCurrent ? 'ring-4 ring-primary-200' : ''}`}
                      >
                        {isComplete ? <CheckCircle className="h-5 w-5" /> : index + 1}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium text-center ${
                          isComplete ? 'text-primary-600' : 'text-gray-600'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tracking Information */}
        {order.tracking_number && (
          <div className="card mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <Truck className="h-6 w-6 text-blue-600 mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Tracking Information</h3>
                <p className="text-blue-800 mb-2">
                  Tracking Number: <span className="font-mono font-bold">{order.tracking_number}</span>
                </p>
                <p className="text-sm text-blue-700">
                  Your package is on its way! Use the tracking number above to monitor your shipment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {order.status === 'cancelled' && (
          <div className="card mb-6 bg-red-50 border-red-200">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Order Cancelled</h3>
                {order.cancelled_reason && (
                  <p className="text-red-800 mb-2">Reason: {order.cancelled_reason}</p>
                )}
                {order.cancelled_at && (
                  <p className="text-sm text-red-700">
                    Cancelled on {new Date(order.cancelled_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                    {item.product?.images?.[0]?.image_url ? (
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
                      <h3 className="font-semibold text-gray-900 mb-1">{item.product_name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Quantity: {item.quantity} × ${parseFloat(item.price).toFixed(2)}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold bg-${
                          statusConfig[item.status]?.color || 'gray'
                        }-100 text-${statusConfig[item.status]?.color || 'gray'}-800`}
                      >
                        {statusConfig[item.status]?.label || item.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        ${parseFloat(item.subtotal).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                  Shipping Address
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-medium">
                    {order.shipping_address?.first_name} {order.shipping_address?.last_name}
                  </p>
                  <p>{order.shipping_address?.address_line1}</p>
                  {order.shipping_address?.address_line2 && (
                    <p>{order.shipping_address.address_line2}</p>
                  )}
                  <p>
                    {order.shipping_address?.city}, {order.shipping_address?.state}{' '}
                    {order.shipping_address?.postal_code}
                  </p>
                  <p>{order.shipping_address?.country}</p>
                  <p className="pt-2">{order.shipping_address?.phone}</p>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-primary-600" />
                  Payment Method
                </h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <p className="font-medium capitalize">
                    {order.payment_method?.replace('_', ' ')}
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      order.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : order.payment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.payment_status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    ${parseFloat(order.shipping_cost).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (VAT 12.5%)</span>
                  <span className="font-medium">${parseFloat(order.tax).toFixed(2)}</span>
                </div>
                {order.platform_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-medium">
                      ${parseFloat(order.platform_fee).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-lg text-primary-600">
                      ${parseFloat(order.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Order Notes:</p>
                  <p className="text-sm text-gray-800">{order.notes}</p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </button>

                {order.status === 'delivered' && (
                  <Link
                    to={`/orders/${order.id}/review`}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Write Review
                  </Link>
                )}
              </div>

              <div className="mt-6 pt-6 border-t text-xs text-gray-600 space-y-2">
                <p>Need help with your order?</p>
                <Link to="/support" className="text-primary-600 hover:text-primary-700 block">
                  Contact Support →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
