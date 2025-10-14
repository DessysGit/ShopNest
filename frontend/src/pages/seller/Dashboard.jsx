import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, DollarSign, Star, TrendingUp, Plus, AlertCircle } from 'lucide-react';
import sellerService from '../../services/sellerService';
import productService from '../../services/productService';
import toast from 'react-hot-toast';

/**
 * Seller Dashboard Component
 * 
 * This component serves as the main dashboard for approved sellers.
 * It displays:
 * - Seller profile information and approval status
 * - Key business metrics (products, orders, earnings, ratings)
 * - Commission rate transparency
 * - Recent products list
 * - Quick action buttons for common tasks
 * 
 * Flow:
 * 1. If no profile exists → Show profile creation form
 * 2. If profile pending → Show waiting message
 * 3. If profile rejected → Show rejection reason
 * 4. If profile approved → Show full dashboard
 */
const Dashboard = () => {
  // State management for dashboard data
  const [profile, setProfile] = useState(null);         // Seller profile (business info, status)
  const [stats, setStats] = useState(null);             // Dashboard statistics
  const [products, setProducts] = useState([]);         // Recent products list
  const [loading, setLoading] = useState(true);         // Loading state
  const [showProfileForm, setShowProfileForm] = useState(false);  // Show/hide profile form
  
  // Form data for profile creation
  const [profileData, setProfileData] = useState({
    business_name: '',
    business_description: '',
    business_address: '',
    tax_id: '',
  });

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  /**
   * Fetches all dashboard data including:
   * - Seller profile and stats from backend
   * - Recent products (limited to 5)
   * 
   * Handles 404 error by showing profile creation form
   */
  const fetchDashboardData = async () => {
    try {
      // Try to get seller profile and statistics
      const dashboardData = await sellerService.getDashboard();
      setProfile(dashboardData.profile);  // Business name, status, commission rate
      setStats(dashboardData.stats);      // Products, orders, sales, ratings

      // Get seller's products (show only 5 most recent)
      const productsData = await productService.getMyProducts();
      setProducts(productsData.slice(0, 5));
    } catch (error) {
      if (error.response?.status === 404) {
        // No profile found - seller needs to create one
        setShowProfileForm(true);
      } else {
        // Other errors (network, server, etc.)
        toast.error('Failed to load dashboard data');
      }
    } finally {
      // Always stop loading, regardless of success/failure
      setLoading(false);
    }
  };

  /**
   * Handles seller profile creation form submission
   * 
   * Process:
   * 1. Sends profile data to backend
   * 2. Sets status to 'pending' (admin needs to approve)
   * 3. Shows success message
   * 4. Refetches dashboard data to show pending status
   */
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await sellerService.createProfile(profileData);
      toast.success('Profile created! Waiting for admin approval.');
      fetchDashboardData();      // Reload to show pending status
      setShowProfileForm(false); // Hide form
    } catch (error) {
      // Show specific error message from backend or generic message
      toast.error(error.response?.data?.detail || 'Failed to create profile');
    }
  };

  /**
   * Handles form input changes for profile data
   * Updates state as user types
   */
  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  /**
   * Loading State
   * Shows spinner while fetching dashboard data
   */
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

  /**
   * Profile Creation Form
   * Shown when seller doesn't have a profile yet
   * After submission, profile status will be 'pending' for admin approval
   */
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

  /**
   * Pending Approval State
   * Shown after seller creates profile but before admin approves
   * Seller cannot list products during this state
   */
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

  /**
   * Rejected State
   * Shown when admin rejects seller's profile
   * Displays rejection reason if provided
   * Seller cannot list products - must contact support
   */
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

  /**
   * Main Dashboard - Approved Seller
   * Full dashboard with all features for approved sellers
   * Shows:
   * - Stats cards (products, orders, earnings, rating)
   * - Earnings overview (commission transparency)
   * - Quick actions
   * - Recent products list
   */
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Seller Dashboard</h1>
          <p className="text-gray-600">Welcome back, {profile?.business_name}!</p>
        </div>

        {/* Stats Cards */}
        {/* Display key metrics: products, orders, earnings, and ratings */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Products Card */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_products || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Listed on marketplace</p>
              </div>
              <Package className="h-12 w-12 text-primary-600" />
            </div>
          </div>

          {/* Total Orders Card - Shows badge for pending orders */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_orders || 0}</p>
                {stats?.pending_orders > 0 && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    {stats.pending_orders} pending action
                  </p>
                )}
              </div>
              <TrendingUp className="h-12 w-12 text-green-600" />
            </div>
          </div>

          {/* Total Earnings Card - Shows seller's earnings after commission */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Your Earnings</p>
                <p className="text-3xl font-bold text-gray-900">${stats?.total_sales?.toFixed(2) || '0.00'}</p>
                <p className="text-xs text-gray-500 mt-1">After platform commission</p>
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

        {/* Commission & Earnings Breakdown */}
        {/* Shows seller's commission rate and earnings transparency */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Earnings Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Commission Rate Card */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-purple-700 font-medium">Your Commission Rate</p>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900">
                {profile?.commission_rate || 10}%
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Platform keeps this from each sale
              </p>
            </div>

            {/* Total Earnings Card */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-700 font-medium">You Keep</p>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">
                {profile?.commission_rate 
                  ? (100 - parseFloat(profile.commission_rate)).toFixed(0)
                  : 90}%
              </p>
              <p className="text-xs text-green-600 mt-1">
                Of every sale you make
              </p>
            </div>

            {/* Pending Orders Alert */}
            <div className={`p-4 rounded-lg ${
              stats?.pending_orders > 0 
                ? 'bg-orange-50' 
                : 'bg-blue-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-medium ${
                  stats?.pending_orders > 0 
                    ? 'text-orange-700' 
                    : 'text-blue-700'
                }`}>
                  {stats?.pending_orders > 0 ? 'Pending Orders' : 'All Caught Up!'}
                </p>
                {stats?.pending_orders > 0 ? (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                ) : (
                  <Star className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <p className={`text-3xl font-bold ${
                stats?.pending_orders > 0 
                  ? 'text-orange-900' 
                  : 'text-blue-900'
              }`}>
                {stats?.pending_orders || 0}
              </p>
              <p className={`text-xs mt-1 ${
                stats?.pending_orders > 0 
                  ? 'text-orange-600' 
                  : 'text-blue-600'
              }`}>
                {stats?.pending_orders > 0 
                  ? 'Orders need your attention' 
                  : 'No pending actions'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {/* Provides quick access to common seller tasks */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Add New Product Button */}
            <Link
              to="/seller/products/create"
              className="btn-primary flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Product
            </Link>
            
            {/* View All Products Button */}
            <Link
              to="/seller/products"
              className="btn-secondary flex items-center justify-center"
            >
              <Package className="h-5 w-5 mr-2" />
              View All Products
            </Link>
            
            {/* View Orders Button - Shows badge if there are pending orders */}
            <Link
              to="/seller/orders"
              className="btn-secondary flex items-center justify-center relative"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              View Orders
              {/* Pending orders notification badge */}
              {stats?.pending_orders > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                  {stats.pending_orders}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Recent Products */}
        {/* Displays up to 5 most recent products with quick stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Products</h2>
            <Link to="/seller/products" className="text-primary-600 hover:text-primary-700 font-medium">
              View All →
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="space-y-4">
              {/* Map through recent products and display each one */}
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  {/* Product Image or Placeholder */}
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      /* Show package icon if no image */
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <span className="font-medium">${parseFloat(product.price).toFixed(2)}</span>
                      <span>•</span>
                      <span>Stock: {product.quantity}</span>
                      {/* Show sales count if product has any sales */}
                      {product.sales_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 font-medium">
                            {product.sales_count} sold
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Active/Inactive Status Badge */}
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {/* Low stock warning */}
                    {product.quantity < 5 && product.quantity > 0 && (
                      <p className="text-xs text-orange-600 mt-1 font-medium">
                        Low stock!
                      </p>
                    )}
                    {product.quantity === 0 && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        Out of stock
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State - No products yet */
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
