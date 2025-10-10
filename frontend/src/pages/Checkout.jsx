import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  Check, 
  ArrowLeft,
  AlertCircle,
  Package,
  Loader
} from 'lucide-react';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  // Shipping Information
  const [shippingInfo, setShippingInfo] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Ghana',
  });

  // Payment Information
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardInfo, setCardInfo] = useState({
    card_number: '',
    expiry_date: '',
    cvv: '',
    cardholder_name: '',
  });

  const [billingAddressSame, setBillingAddressSame] = useState(true);
  const [billingInfo, setBillingInfo] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Ghana',
  });

  useEffect(() => {
    if (items.length === 0 && !orderCreated) {
      navigate('/cart');
    }
  }, [items, navigate, orderCreated]);

  const subtotal = getTotal();
  const shippingCost = subtotal > 100 ? 0 : 15; // Free shipping over $100
  const tax = subtotal * 0.125; // 12.5% VAT
  const total = subtotal + shippingCost + tax;

  const validateShipping = () => {
    const required = ['first_name', 'last_name', 'email', 'phone', 'address_line1', 'city', 'state', 'postal_code'];
    for (const field of required) {
      if (!shippingInfo[field]?.trim()) {
        toast.error(`Please fill in ${field.replace('_', ' ')}`);
        return false;
      }
    }
    return true;
  };

  const validatePayment = () => {
    if (paymentMethod === 'card') {
      if (!cardInfo.card_number || !cardInfo.expiry_date || !cardInfo.cvv || !cardInfo.cardholder_name) {
        toast.error('Please fill in all card details');
        return false;
      }
      // Basic card number validation (16 digits)
      if (cardInfo.card_number.replace(/\s/g, '').length !== 16) {
        toast.error('Please enter a valid card number');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateShipping()) return;
    if (step === 2 && !validatePayment()) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderData = {
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: parseFloat(item.price)
        })),
        shipping_address: shippingInfo,
        billing_address: billingAddressSame ? shippingInfo : billingInfo,
        payment_method: paymentMethod,
        subtotal: subtotal,
        shipping_cost: shippingCost,
        tax: tax,
        total: total
      };

      const order = await orderService.createOrder(orderData);
      
      toast.success('Order placed successfully!');
      setOrderCreated(true);
      clearCart();
      
      // Redirect to order confirmation
      navigate(`/orders/${order.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleCardChange = (e) => {
    let { name, value } = e.target;
    
    // Format card number with spaces
    if (name === 'card_number') {
      value = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      if (value.length > 19) return;
    }
    
    // Format expiry date
    if (name === 'expiry_date') {
      value = value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      if (value.length > 5) return;
    }
    
    // Limit CVV to 3-4 digits
    if (name === 'cvv') {
      value = value.replace(/\D/g, '');
      if (value.length > 4) return;
    }
    
    setCardInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingInfo(prev => ({ ...prev, [name]: value }));
  };

  if (items.length === 0 && !orderCreated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Cart
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Checkout</h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[
              { num: 1, label: 'Shipping', icon: MapPin },
              { num: 2, label: 'Payment', icon: CreditCard },
              { num: 3, label: 'Review', icon: Check }
            ].map((item, index) => {
              const Icon = item.icon;
              const isActive = step === item.num;
              const isComplete = step > item.num;
              
              return (
                <div key={item.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-colors ${
                        isComplete
                          ? 'bg-green-600 text-white'
                          : isActive
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isComplete ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>
                    <span
                      className={`mt-2 text-sm font-medium ${
                        isActive ? 'text-primary-600' : 'text-gray-600'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={`w-24 h-1 mx-4 ${
                        isComplete ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Information */}
            {step === 1 && (
              <div className="card">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <MapPin className="h-6 w-6 mr-2 text-primary-600" />
                  Shipping Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={shippingInfo.first_name}
                      onChange={handleShippingChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={shippingInfo.last_name}
                      onChange={handleShippingChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={shippingInfo.email}
                      onChange={handleShippingChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={shippingInfo.phone}
                      onChange={handleShippingChange}
                      className="input-field"
                      placeholder="+233 XX XXX XXXX"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      name="address_line1"
                      value={shippingInfo.address_line1}
                      onChange={handleShippingChange}
                      className="input-field"
                      placeholder="Street address, P.O. box"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      name="address_line2"
                      value={shippingInfo.address_line2}
                      onChange={handleShippingChange}
                      className="input-field"
                      placeholder="Apartment, suite, unit, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={shippingInfo.city}
                      onChange={handleShippingChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Region *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={shippingInfo.state}
                      onChange={handleShippingChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      value={shippingInfo.postal_code}
                      onChange={handleShippingChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={shippingInfo.country}
                      onChange={handleShippingChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button onClick={handleNext} className="btn-primary">
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Information */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <CreditCard className="h-6 w-6 mr-2 text-primary-600" />
                    Payment Method
                  </h2>

                  <div className="space-y-4 mb-6">
                    <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <CreditCard className="h-5 w-5 mr-2 text-gray-600" />
                      <span className="font-medium">Credit/Debit Card</span>
                    </label>

                    <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="mobile_money"
                        checked={paymentMethod === 'mobile_money'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <Package className="h-5 w-5 mr-2 text-gray-600" />
                      <span className="font-medium">Mobile Money</span>
                    </label>
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cardholder Name *
                        </label>
                        <input
                          type="text"
                          name="cardholder_name"
                          value={cardInfo.cardholder_name}
                          onChange={handleCardChange}
                          className="input-field"
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          name="card_number"
                          value={cardInfo.card_number}
                          onChange={handleCardChange}
                          className="input-field"
                          placeholder="1234 5678 9012 3456"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Date *
                          </label>
                          <input
                            type="text"
                            name="expiry_date"
                            value={cardInfo.expiry_date}
                            onChange={handleCardChange}
                            className="input-field"
                            placeholder="MM/YY"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            name="cvv"
                            value={cardInfo.cvv}
                            onChange={handleCardChange}
                            className="input-field"
                            placeholder="123"
                            required
                          />
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                          <p className="text-sm text-blue-900">
                            Your payment information is encrypted and secure. We never store your full card details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'mobile_money' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-900">
                        You will be redirected to complete your mobile money payment after placing the order.
                      </p>
                    </div>
                  )}
                </div>

                {/* Billing Address */}
                <div className="card">
                  <h3 className="text-xl font-bold mb-4">Billing Address</h3>
                  
                  <label className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={billingAddressSame}
                      onChange={(e) => setBillingAddressSame(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Same as shipping address</span>
                  </label>

                  {!billingAddressSame && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address Line 1
                        </label>
                        <input
                          type="text"
                          name="address_line1"
                          value={billingInfo.address_line1}
                          onChange={handleBillingChange}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={billingInfo.city}
                          onChange={handleBillingChange}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          name="postal_code"
                          value={billingInfo.postal_code}
                          onChange={handleBillingChange}
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button onClick={handleBack} className="btn-secondary">
                    Back
                  </button>
                  <button onClick={handleNext} className="btn-primary">
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review Order */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <Check className="h-6 w-6 mr-2 text-primary-600" />
                    Review Your Order
                  </h2>

                  {/* Shipping Address */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">Shipping Address</h3>
                      <button
                        onClick={() => setStep(1)}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm">
                      <p className="font-medium">
                        {shippingInfo.first_name} {shippingInfo.last_name}
                      </p>
                      <p className="text-gray-600">{shippingInfo.address_line1}</p>
                      {shippingInfo.address_line2 && (
                        <p className="text-gray-600">{shippingInfo.address_line2}</p>
                      )}
                      <p className="text-gray-600">
                        {shippingInfo.city}, {shippingInfo.state} {shippingInfo.postal_code}
                      </p>
                      <p className="text-gray-600">{shippingInfo.country}</p>
                      <p className="text-gray-600 mt-2">{shippingInfo.phone}</p>
                      <p className="text-gray-600">{shippingInfo.email}</p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">Payment Method</h3>
                      <button
                        onClick={() => setStep(2)}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm">
                      <p className="font-medium capitalize">
                        {paymentMethod.replace('_', ' ')}
                      </p>
                      {paymentMethod === 'card' && cardInfo.card_number && (
                        <p className="text-gray-600">
                          **** **** **** {cardInfo.card_number.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Order Items</h3>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                        >
                          {item.images?.[0]?.image_url ? (
                            <img
                              src={item.images[0].image_url}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button onClick={handleBack} className="btn-secondary">
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="btn-primary flex items-center"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin h-5 w-5 mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-5 w-5 mr-2" />
                        Place Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h3 className="text-xl font-bold mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({items.length} items)</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (VAT 12.5%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-lg text-primary-600">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {shippingCost === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    You qualify for FREE shipping!
                  </p>
                </div>
              )}

              <div className="space-y-2 text-xs text-gray-600">
                <p className="flex items-start">
                  <Check className="h-4 w-4 mr-1 mt-0.5 text-green-600" />
                  Secure checkout
                </p>
                <p className="flex items-start">
                  <Check className="h-4 w-4 mr-1 mt-0.5 text-green-600" />
                  Free returns within 30 days
                </p>
                <p className="flex items-start">
                  <Check className="h-4 w-4 mr-1 mt-0.5 text-green-600" />
                  Buyer protection guaranteed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
