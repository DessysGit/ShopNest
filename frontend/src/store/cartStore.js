import { create } from 'zustand';

// Helper to get user-specific cart key
const getCartKey = (userId) => {
  return userId ? `cart_${userId}` : 'cart_guest';
};

// Helper to get current user ID from auth
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || null;
  } catch {
    return null;
  }
};

// Helper to load cart for current user
const loadCart = () => {
  const userId = getCurrentUserId();
  const cartKey = getCartKey(userId);
  try {
    return JSON.parse(localStorage.getItem(cartKey) || '[]');
  } catch {
    return [];
  }
};

const useCartStore = create((set, get) => ({
  items: loadCart(),

  // Initialize cart for logged-in user
  initializeCart: () => {
    set({ items: loadCart() });
  },

  addItem: (product, quantity = 1) => {
    const items = get().items;
    const existingItem = items.find((item) => item.id === product.id);

    let newItems;
    if (existingItem) {
      newItems = items.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newItems = [...items, { ...product, quantity }];
    }

    const userId = getCurrentUserId();
    const cartKey = getCartKey(userId);
    localStorage.setItem(cartKey, JSON.stringify(newItems));
    set({ items: newItems });
  },

  removeItem: (productId) => {
    const newItems = get().items.filter((item) => item.id !== productId);
    const userId = getCurrentUserId();
    const cartKey = getCartKey(userId);
    localStorage.setItem(cartKey, JSON.stringify(newItems));
    set({ items: newItems });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const newItems = get().items.map((item) =>
      item.id === productId ? { ...item, quantity } : item
    );
    const userId = getCurrentUserId();
    const cartKey = getCartKey(userId);
    localStorage.setItem(cartKey, JSON.stringify(newItems));
    set({ items: newItems });
  },

  clearCart: () => {
    const userId = getCurrentUserId();
    const cartKey = getCartKey(userId);
    localStorage.removeItem(cartKey);
    set({ items: [] });
  },

  // Clear cart on logout
  clearOnLogout: () => {
    set({ items: [] });
  },

  getTotal: () => {
    return get().items.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0
    );
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));

export default useCartStore;
