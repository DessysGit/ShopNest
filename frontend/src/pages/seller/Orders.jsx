import { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';
import orderService from '../../services/orderService';
import toast from 'react-hot-toast';

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getSellerOrders();
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderItemId, newStatus) => {
    if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;

    setActionLoading(true);
    try {
      await orderService.updateOrderStatus(
        orderItemId,
        newStatus,
        newStatus === 'shipped' ? trackingNumber : null
      );
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
      setShowModal(false);
      setTrackingNumber('');
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const openOrderModal = (orderItem) => {
    setSelectedOrder(orderItem);
    setTrackingNumber(orderItem.order?.tracking_number || '');
    setShowModal(true);
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
  };

  // Filter orders
  const filteredOrders = orders
    .filter((item) => {
      if (filter === 'all') return true;
      return item.status === filter;
    })
    .filter((item) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        item.order?.order_number?.toLowerCase().includes(search) ||
        item.product_name?.toLowerCase().includes(search) ||
        item.order?.buyer?.email?.toLowerCase().includes(search)
      );
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orders Management</h1>
          <p className="text-gray-600">Process and track your customer orders</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`card hover:shadow-lg transition-shadow ${
              filter === 'all' ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
            </div>
          </button>

          {Object.entries(statusConfig).map(([status, config]) => {
            const count = orders.filter((o) => o.status === status).length;
            const Icon = config.icon;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`card hover:shadow-lg transition-shadow ${
                  filter === status ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="text-center">
                  <Icon className={`h-8 w-8 ${config.text} mx-auto mb-2`} />
                  <p className="text-sm text-gray-600 mb-1">{config.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number, product, or customer email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'Try adjusting your search terms'
                : filter === 'all'
                ? 'You have no orders yet'
                : `No ${filter} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((orderItem) => {
              const config = statusConfig[orderItem.status];
              const StatusIcon = config.icon;

              return (
                <div key={orderItem.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {orderItem.product?.images?.[0]?.image_url ? (
                        <img
                          src={orderItem.product.images[0].image_url}
                          alt={orderItem.product_name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {orderItem.product_name}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} flex items-center`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Order #{orderItem.order?.order_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">
                            ${parseFloat(orderItem.subtotal).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">Qty: {orderItem.quantity}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">Customer:</span>{' '}
                            {orderItem.order?.buyer?.first_name}{' '}
                            {orderItem.order?.buyer?.last_name}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium">Email:</span>{' '}
                            {orderItem.order?.buyer?.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">Ordered:</span>{' '}
                            {new Date(orderItem.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium">Your Earning:</span>{' '}
                            <span className="text-green-600 font-semibold">
                              ${parseFloat(orderItem.seller_earning).toFixed(2)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {orderItem.order?.tracking_number && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <Truck className="h-5 w-5 text-blue-600 mr-2" />
                            <p className="text-sm text-blue-900">
                              <span className="font-semibold">Tracking:</span>{' '}
                              {orderItem.order.tracking_number}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Shipping Address */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          Shipping Address:
                        </p>
                        <p className="text-sm text-gray-600">
                          {orderItem.order?.shipping_address?.address_line1},{' '}
                          {orderItem.order?.shipping_address?.city},{' '}
                          {orderItem.order?.shipping_address?.state}{' '}
                          {orderItem.order?.shipping_address?.postal_code}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <button
                        onClick={() => openOrderModal(orderItem)}
                        className="btn-primary flex items-center justify-center whitespace-nowrap"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Manage
                      </button>

                      {/* Quick Actions */}
                      {orderItem.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(orderItem.id, 'confirmed')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm
                        </button>
                      )}

                      {orderItem.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(orderItem.id, 'processing')}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Process
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Management Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Manage Order Item
                  </h2>
                  <p className="text-gray-600">
                    Order #{selectedOrder.order?.order_number}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Order Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Product Information</h3>
                  <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    {selectedOrder.product?.images?.[0]?.image_url ? (
                      <img
                        src={selectedOrder.product.images[0].image_url}
                        alt={selectedOrder.product_name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                        <Package className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold">{selectedOrder.product_name}</h4>
                      <p className="text-sm text-gray-600">Quantity: {selectedOrder.quantity}</p>
                      <p className="text-sm text-gray-600">
                        Price: ${parseFloat(selectedOrder.price).toFixed(2)}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        Subtotal: ${parseFloat(selectedOrder.subtotal).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">
                        {selectedOrder.order?.buyer?.first_name}{' '}
                        {selectedOrder.order?.buyer?.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedOrder.order?.buyer?.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">
                        {selectedOrder.order?.shipping_address?.phone || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm">
                    <p>{selectedOrder.order?.shipping_address?.address_line1}</p>
                    {selectedOrder.order?.shipping_address?.address_line2 && (
                      <p>{selectedOrder.order.shipping_address.address_line2}</p>
                    )}
                    <p>
                      {selectedOrder.order?.shipping_address?.city},{' '}
                      {selectedOrder.order?.shipping_address?.state}{' '}
                      {selectedOrder.order?.shipping_address?.postal_code}
                    </p>
                    <p>{selectedOrder.order?.shipping_address?.country}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Financial Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Item Subtotal:</span>
                      <span className="font-medium">
                        ${parseFloat(selectedOrder.subtotal).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Platform Fee:</span>
                      <span className="font-medium text-red-600">
                        -${parseFloat(selectedOrder.platform_fee).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t-2">
                      <span className="font-semibold text-gray-900">Your Earning:</span>
                      <span className="font-bold text-green-600">
                        ${parseFloat(selectedOrder.seller_earning).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current Status */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Current Status</h3>
                  <span
                    className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                      statusConfig[selectedOrder.status].bg
                    } ${statusConfig[selectedOrder.status].text}`}
                  >
                    {statusConfig[selectedOrder.status].label}
                  </span>
                </div>

                {/* Tracking Number Input */}
                {(selectedOrder.status === 'processing' ||
                  selectedOrder.status === 'confirmed') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking Number (required for shipping)
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}
                      disabled={actionLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Confirm Order
                    </button>
                  )}

                  {selectedOrder.status === 'confirmed' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')}
                      disabled={actionLoading}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <Package className="h-5 w-5 mr-2" />
                      Start Processing
                    </button>
                  )}

                  {selectedOrder.status === 'processing' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'shipped')}
                      disabled={actionLoading || !trackingNumber.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <Truck className="h-5 w-5 mr-2" />
                      Mark as Shipped
                    </button>
                  )}

                  {selectedOrder.status === 'shipped' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Mark as Delivered
                    </button>
                  )}

                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerOrders;
