import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  AlertCircle
} from 'lucide-react';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, shipped, delivered, cancelled

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    const reason = prompt('Please provide a reason for cancellation (optional):');
    
    try {
      await orderService.cancelOrder(orderId, reason || 'Customer requested cancellation');
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  const statusConfig = {
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: Clock,
      label: 'Pending',
    },
    confirmed: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: CheckCircle,
      label: 'Confirmed',
    },
    processing: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      icon: Package,
      label: 'Processing',
    },
    shipped: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-800',
      icon: Truck,
      label: 'Shipped',
    },
    delivered: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: CheckCircle,
      label: 'Delivered',
    },
    cancelled: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: XCircle,
      label: 'Cancelled',
    },
    refunded: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: AlertCircle,
      label: 'Refunded',
    },
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        {/* Filter Tabs */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Orders ({orders.length})
            </button>
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = orders.filter((o) => o.status === status).length;
              if (count === 0) return null;
              
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="card text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't placed any orders yet"
                : `No ${filter} orders`}
            </p>
            <Link to="/products" className="btn-primary inline-block">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const config = statusConfig[order.status];
              const StatusIcon = config.icon;

              return (
                <div key={order.id} className="card hover:shadow-lg transition-shadow">
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 pb-4 border-b">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          Order #{order.order_number}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} flex items-center`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="mt-3 md:mt-0 text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ${parseFloat(order.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    {order.items?.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        {item.product?.images?.[0]?.image_url ? (
                          <img
                            src={item.product.images[0].image_url}
                            alt={item.product_name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × ${parseFloat(item.price).toFixed(2)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            statusConfig[item.status]?.bg
                          } ${statusConfig[item.status]?.text}`}
                        >
                          {statusConfig[item.status]?.label}
                        </span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <p className="text-sm text-gray-600 text-center">
                        + {order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Tracking Info */}
                  {order.tracking_number && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center">
                        <Truck className="h-5 w-5 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm font-semibold text-blue-900">
                            Tracking Number: {order.tracking_number}
                          </p>
                          <p className="text-xs text-blue-700">
                            Use this to track your shipment
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shipping Address */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Shipping Address</p>
                    <p className="text-sm text-gray-600">
                      {order.shipping_address?.address_line1}, {order.shipping_address?.city},{' '}
                      {order.shipping_address?.state} {order.shipping_address?.postal_code}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Link
                      to={`/orders/${order.id}`}
                      className="flex-1 btn-secondary flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                    
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Order
                      </button>
                    )}

                    {order.status === 'delivered' && (
                      <Link
                        to={`/orders/${order.id}/review`}
                        className="flex-1 btn-primary flex items-center justify-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Write Review
                      </Link>
                    )}
                  </div>

                  {/* Cancellation Info */}
                  {order.status === 'cancelled' && order.cancelled_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-900 mb-1">
                            Cancellation Reason:
                          </p>
                          <p className="text-sm text-red-700">{order.cancelled_reason}</p>
                          {order.cancelled_at && (
                            <p className="text-xs text-red-600 mt-1">
                              Cancelled on {new Date(order.cancelled_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
