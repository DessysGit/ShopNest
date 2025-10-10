import { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  AlertCircle,
  Mail,
  Phone,
  Building,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected, suspended
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const data = await adminService.getAllSellers();
      setSellers(data);
    } catch (error) {
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sellerId) => {
    if (!confirm('Are you sure you want to approve this seller?')) return;

    setActionLoading(true);
    try {
      await adminService.approveSeller(sellerId, 'approve');
      toast.success('Seller approved successfully!');
      fetchSellers();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to approve seller');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (sellerId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.approveSeller(sellerId, 'reject', rejectionReason);
      toast.success('Seller rejected');
      fetchSellers();
      setShowModal(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to reject seller');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (sellerId) => {
    if (!confirm('Are you sure you want to suspend this seller?')) return;

    setActionLoading(true);
    try {
      await adminService.suspendSeller(sellerId);
      toast.success('Seller suspended');
      fetchSellers();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to suspend seller');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (sellerId) => {
    if (!confirm('Are you sure you want to reactivate this seller?')) return;

    setActionLoading(true);
    try {
      await adminService.reactivateSeller(sellerId);
      toast.success('Seller reactivated');
      fetchSellers();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to reactivate seller');
    } finally {
      setActionLoading(false);
    }
  };

  const openSellerModal = (seller) => {
    setSelectedSeller(seller);
    setShowModal(true);
    setRejectionReason('');
  };

  // Filter sellers
  const filteredSellers = sellers
    .filter((seller) => {
      if (filter === 'all') return true;
      return seller.approval_status === filter;
    })
    .filter((seller) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        seller.business_name?.toLowerCase().includes(search) ||
        seller.user?.email?.toLowerCase().includes(search) ||
        seller.user?.first_name?.toLowerCase().includes(search) ||
        seller.user?.last_name?.toLowerCase().includes(search)
      );
    });

  const statusConfig = {
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: Clock,
      label: 'Pending',
    },
    approved: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: CheckCircle,
      label: 'Approved',
    },
    rejected: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: XCircle,
      label: 'Rejected',
    },
    suspended: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: Ban,
      label: 'Suspended',
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sellers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Seller Management</h1>
          <p className="text-gray-600">Review and manage seller applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = sellers.filter((s) => s.approval_status === status).length;
            const Icon = config.icon;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`card hover:shadow-lg transition-shadow ${
                  filter === status ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{config.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{count}</p>
                  </div>
                  <Icon className={`h-10 w-10 ${config.text}`} />
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
                placeholder="Search by business name, email, or name..."
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
                <option value="all">All Sellers</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sellers List */}
        <div className="space-y-4">
          {filteredSellers.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No sellers found</h3>
              <p className="text-gray-600">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'No sellers match the selected filter'}
              </p>
            </div>
          ) : (
            filteredSellers.map((seller) => {
              const config = statusConfig[seller.approval_status];
              const StatusIcon = config.icon;

              return (
                <div key={seller.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Business Logo */}
                    <div className="flex-shrink-0">
                      {seller.business_logo ? (
                        <img
                          src={seller.business_logo}
                          alt={seller.business_name}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Building className="h-12 w-12 text-primary-600" />
                        </div>
                      )}
                    </div>

                    {/* Seller Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {seller.business_name}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} flex items-center`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </span>
                        </div>
                        {seller.business_description && (
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {seller.business_description}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {seller.user?.email}
                        </div>
                        {seller.user?.phone && (
                          <div className="flex items-center text-gray-600">
                            <Phone className="h-4 w-4 mr-2" />
                            {seller.user.phone}
                          </div>
                        )}
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Applied: {new Date(seller.created_at).toLocaleDateString()}
                        </div>
                        {seller.approval_date && (
                          <div className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            {seller.approval_status === 'approved' ? 'Approved' : 'Reviewed'}:{' '}
                            {new Date(seller.approval_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {seller.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-red-900 mb-1">
                                Rejection Reason:
                              </p>
                              <p className="text-sm text-red-700">{seller.rejection_reason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => openSellerModal(seller)}
                        className="btn-primary w-full lg:w-auto"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Seller Detail Modal */}
      {showModal && selectedSeller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedSeller.business_name}
                  </h2>
                  <p className="text-gray-600">Seller Application Details</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Business Logo */}
              {selectedSeller.business_logo && (
                <div className="mb-6">
                  <img
                    src={selectedSeller.business_logo}
                    alt={selectedSeller.business_name}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Business Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Business Name:</span>
                      <span className="font-medium">{selectedSeller.business_name}</span>
                    </div>
                    {selectedSeller.business_description && (
                      <div className="py-2 border-b">
                        <span className="text-gray-600 block mb-2">Description:</span>
                        <p className="text-gray-900">{selectedSeller.business_description}</p>
                      </div>
                    )}
                    {selectedSeller.business_address && (
                      <div className="py-2 border-b">
                        <span className="text-gray-600 block mb-2">Address:</span>
                        <p className="text-gray-900">{selectedSeller.business_address}</p>
                      </div>
                    )}
                    {selectedSeller.tax_id && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Tax ID:</span>
                        <span className="font-medium">{selectedSeller.tax_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">
                        {selectedSeller.user?.first_name} {selectedSeller.user?.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedSeller.user?.email}</span>
                    </div>
                    {selectedSeller.user?.phone && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{selectedSeller.user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Application Status</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusConfig[selectedSeller.approval_status].bg
                        } ${statusConfig[selectedSeller.approval_status].text}`}
                      >
                        {statusConfig[selectedSeller.approval_status].label}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Applied On:</span>
                      <span className="font-medium">
                        {new Date(selectedSeller.created_at).toLocaleString()}
                      </span>
                    </div>
                    {selectedSeller.approval_date && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Reviewed On:</span>
                        <span className="font-medium">
                          {new Date(selectedSeller.approval_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Commission Rate:</span>
                      <span className="font-medium">{selectedSeller.commission_rate}%</span>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedSeller.approval_status === 'pending' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide a reason if you're rejecting this application..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedSeller.approval_status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedSeller.id)}
                        disabled={actionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Approve Seller
                      </button>
                      <button
                        onClick={() => handleReject(selectedSeller.id)}
                        disabled={actionLoading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        Reject
                      </button>
                    </>
                  )}

                  {selectedSeller.approval_status === 'approved' && (
                    <button
                      onClick={() => handleSuspend(selectedSeller.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <Ban className="h-5 w-5 mr-2" />
                      Suspend Seller
                    </button>
                  )}

                  {selectedSeller.approval_status === 'suspended' && (
                    <button
                      onClick={() => handleReactivate(selectedSeller.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Reactivate Seller
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

export default Sellers;
