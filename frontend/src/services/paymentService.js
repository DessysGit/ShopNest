import api from './api';

export const paymentService = {
  // Get Stripe public key
  getPublicKey: async () => {
    const response = await api.get('/payments/public-key');
    return response.data.public_key;
  },

  // Create payment intent
  createPaymentIntent: async (amount, orderId) => {
    const response = await api.post('/payments/create-intent', {
      amount,
      order_id: orderId,
      currency: 'usd'
    });
    return response.data;
  },

  // Confirm payment
  confirmPayment: async (paymentIntentId, orderId) => {
    const response = await api.post('/payments/confirm', {
      payment_intent_id: paymentIntentId,
      order_id: orderId
    });
    return response.data;
  },
};

export default paymentService;
