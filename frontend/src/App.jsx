import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import ReviewProduct from './pages/ReviewProduct';
import TrackOrder from './pages/TrackOrder';

// Seller Pages
import SellerDashboard from './pages/seller/Dashboard';
import SellerProducts from './pages/seller/Products';
import CreateProduct from './pages/seller/CreateProduct';
import EditProduct from './pages/seller/EditProduct';
import SellerOrders from './pages/seller/Orders';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminSellers from './pages/admin/Sellers';
import AdminCategories from './pages/admin/Categories';
import AdminSettings from './pages/admin/Settings';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import DemoBanner from './components/DemoBanner';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <DemoBanner />
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />

            {/* Buyer Routes */}
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:orderId/review"
              element={
                <ProtectedRoute>
                  <ReviewProduct />
                </ProtectedRoute>
              }
            />

            {/* Seller Routes */}
            <Route
              path="/seller/dashboard"
              element={
                <ProtectedRoute role="seller">
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/products"
              element={
                <ProtectedRoute role="seller">
                  <SellerProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/products/create"
              element={
                <ProtectedRoute role="seller">
                  <CreateProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/products/edit/:id"
              element={
                <ProtectedRoute role="seller">
                  <EditProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/orders"
              element={
                <ProtectedRoute role="seller">
                  <SellerOrders />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sellers"
              element={
                <ProtectedRoute role="admin">
                  <AdminSellers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute role="admin">
                  <AdminCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute role="admin">
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
