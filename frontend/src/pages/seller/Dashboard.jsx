import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, DollarSign, Star, TrendingUp, Plus, AlertCircle } from 'lucide-react';
import sellerService from '../../services/sellerService';
import productService from '../../services/productService';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileData, setProfileData] = useState({
    business_name: '',
    business_description: '',
    business_address: '',
    tax_id: '',
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Try to get seller profile
      const dashboardData = await sellerService.getDashboard();
      setProfile(dashboardData.profile);
      setStats(dashboardData.stats);

      // Get products
      const productsData = await productService.getMyProducts();
      setProducts(productsData.slice(0, 5)); // Show only 5 recent products
    } catch (error) {
      if (error.response?.status === 404) {
        // No profile yet
        setShowProfileForm(true);
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await sellerService.createProfile(profileData);
      toast.success('Profile created! Waiting for admin approval.');
      fetchDashboardData();
      setShowProfileForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create profile');
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
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

  // Show profile creation form
  if (showProfileForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="card">
            <h1 className="text-2xl font-bold mb-2">Create Seller Profile</h1>
            <p className="text-gray-600 mb-6">
              Complete your seller profile to start listing products. Your profile will be reviewed by our admin team.
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="business_name"
                  required
                  value={profileData.business_name}
                  onChange={handleProfileChange}
                  className="input-field"
                  placeholder="My Awesome Store"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description
                </label>
                <textarea
                  name="business_description"
                  value={profileData.business_description}
                  onChange={handleProfileChange}
                  className="input-field"
                  rows="4"
                  placeholder="Tell us about your business..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <input
                  type="text"
                  name="business_address"
                  value={profileData.business_address}
                  onChange={handleProfileChange}
                  className="input-field"
                  placeholder="123 Main St, Accra, Ghana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID (Optional)
                </label>
                <input
                  type="text"
                  name="tax_id"
                  value={profileData.tax_id}
                  onChange={handleProfileChange}
                  className="input-field"
                  placeholder="TAX123456"
                />
              </div>

              <button type="submit" className="w-full btn-primary">
                Submit for Review
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show pending approval message
  if (profile?.approval_status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="card text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Profile Under Review</h1>
            <p className="text-gray-600 mb-4">
              Your seller profile is currently being reviewed by our admin team. You'll be able to list products once your profile is approved.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h3 className="font-semibold mb-2">Profile Details:</h3>
              <p><strong>Business Name:</strong> {profile.business_name}</p>
              <p><strong>Status:</strong> <span className="text-yellow-600 font-medium">Pending</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show rejected message
  if (profile?.approval_status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="card text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Profile Rejected</h1>
            <p className="text-gray-600 mb-4">
              Unfortunately, your seller profile was not approved.
            </p>
            {profile.rejection_reason && (
              <div className="bg-red-50 p-4 rounded-lg text-left mb-4">
                <h3 className="font-semibold text-red-900 mb-2">Reason:</h3>
                <p className="text-red-800">{profile.rejection_reason}</p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Please contact support if you believe this was a mistake.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard (Approved Seller)
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Seller Dashboard</h1>
          <p className="text-gray-600">Welcome back, {profile?.business_name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_products || 0}</p>
              </div>
              <Package className="h-12 w-12 text-primary-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_orders || 0}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900">${stats?.total_sales?.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.rating?.toFixed(1) || '0.0'}</p>
              </div>
              <Star className="h-12 w-12 text-yellow-500 fill-current" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/seller/products/create"
              className="btn-primary flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Product
            </Link>
            <Link
              to="/seller/products"
              className="btn-secondary flex items-center justify-center"
            >
              <Package className="h-5 w-5 mr-2" />
              View All Products
            </Link>
            <button className="btn-secondary flex items-center justify-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              View Orders
            </button>
          </div>
        </div>

        {/* Recent Products */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Products</h2>
            <Link to="/seller/products" className="text-primary-600 hover:text-primary-700 font-medium">
              View All →
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      ${parseFloat(product.price).toFixed(2)} • Stock: {product.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No products yet</p>
              <Link to="/seller/products/create" className="btn-primary inline-flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Product
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
