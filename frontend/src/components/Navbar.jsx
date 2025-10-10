import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Store, LayoutDashboard, ShoppingBag } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((state) => state.getItemCount());

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Store className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">ShopNest</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/products" className="text-gray-700 hover:text-primary-600 font-medium">
              Products
            </Link>
            {isAuthenticated && (
              <Link to="/orders" className="text-gray-700 hover:text-primary-600 font-medium flex items-center">
                <ShoppingBag className="h-4 w-4 mr-1" />
                My Orders
              </Link>
            )}
            {isAuthenticated && user?.role === 'seller' && (
              <Link to="/seller/dashboard" className="text-gray-700 hover:text-primary-600 font-medium">
                Seller Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin/dashboard" className="text-gray-700 hover:text-primary-600 font-medium">
                Admin Panel
              </Link>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-gray-700 hover:text-primary-600">
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100">
                  <User className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.first_name || user?.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-700 hover:text-red-600"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
