import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, ShoppingBag, DollarSign, TrendingUp, AlertCircle, Settings } from 'lucide-react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await adminService.getDashboard();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your marketplace</p>
        </div>

        {/* Alert for Pending Sellers */}
        {stats?.sellers?.pending > 0 && (
          <Link to="/admin/sellers" className="block mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between hover:bg-yellow-100 transition-colors">
              <div className="flex items-center">
                <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
                <div>
                  <p className="font-semibold text-yellow-900">
                    {stats.sellers.pending} seller{stats.sellers.pending !== 1 ? 's' : ''} awaiting approval
                  </p>
                  <p className="text-sm text-yellow-700">Click to review pending applications</p>
                </div>
              </div>
              <span className="text-yellow-600 font-medium">Review →</span>
            </div>
          </Link>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Users */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.users?.total || 0}</p>
              </div>
              <Users className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          {/* Products */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.products?.total || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.products?.active || 0} active
                </p>
              </div>
              <Package className="h-12 w-12 text-green-600" />
            </div>
          </div>

          {/* Orders */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.orders?.total || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.orders?.pending || 0} pending
                </p>
              </div>
              <ShoppingBag className="h-12 w-12 text-purple-600" />
            </div>
          </div>

          {/* Revenue */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Platform Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${stats?.revenue?.platform_revenue 
                    ? stats.revenue.platform_revenue.toFixed(2) 
                    : '0.00'}
                </p>
                {stats?.revenue?.platform_revenue > 0 ? (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stats?.revenue?.avg_commission_rate?.toFixed(1)}% avg commission
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    No completed orders yet
                  </p>
                )}
              </div>
              <DollarSign className="h-12 w-12 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        {stats?.revenue && stats.revenue.platform_revenue > 0 && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold mb-4">Revenue Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-700 mb-1">Platform Commission</p>
                <p className="text-2xl font-bold text-yellow-900">
                  ${stats.revenue.platform_revenue.toFixed(2)}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Your earnings from {stats?.orders?.total || 0} orders
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Seller Earnings</p>
                <p className="text-2xl font-bold text-green-900">
                  ${stats.revenue.seller_earnings.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Total paid to sellers
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Total Sales Volume</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${stats.revenue.total_sales.toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Combined marketplace revenue
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seller Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Seller Statistics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Total Sellers</span>
                <span className="font-bold text-gray-900">{stats?.sellers?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-green-700">Approved</span>
                <span className="font-bold text-green-900">{stats?.sellers?.approved || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-yellow-700">Pending</span>
                <span className="font-bold text-yellow-900">{stats?.sellers?.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-red-700">Rejected</span>
                <span className="font-bold text-red-900">{stats?.sellers?.rejected || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Suspended</span>
                <span className="font-bold text-gray-900">{stats?.sellers?.suspended || 0}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/admin/sellers"
                className="block p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-primary-900">Manage Sellers</p>
                    <p className="text-sm text-primary-700">Review and approve sellers</p>
                  </div>
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
              </Link>

              <Link
                to="/admin/settings"
                className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-purple-900">Platform Settings</p>
                    <p className="text-sm text-purple-700">Configure commission, thresholds, and more</p>
                  </div>
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
              </Link>

              <Link
                to="/admin/categories"
                className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-900">Manage Categories</p>
                    <p className="text-sm text-green-700">Add or edit product categories</p>
                  </div>
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </Link>

              <Link
                to="/products"
                className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">View All Products</p>
                    <p className="text-sm text-blue-700">Browse marketplace products</p>
                  </div>
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">API Status: <span className="font-semibold">Online</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">Database: <span className="font-semibold">Connected</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">Payments: <span className="font-semibold">Ready</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
