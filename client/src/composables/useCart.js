import { computed, ref, watch } from 'vue';

const loadSavedCart = () => {
  try {
    return JSON.parse(localStorage.getItem('alula-cart') || '[]');
  } catch {
    return [];
  }
};

const cart = ref(loadSavedCart());

const selectionKey = (productId, option, tags = []) => {
  const optionTitle = option?.title || '';
  const tagTitles = tags.map((tag) => tag.title).sort().join('|');
  return `${productId}:${optionTitle}:${tagTitles}`;
};

const cartItemKey = (item) => item.key || selectionKey(item._id, item.option, item.tags || []);

watch(cart, (value) => {
  localStorage.setItem('alula-cart', JSON.stringify(value));
}, { deep: true });

export const useCart = () => {
  const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0));
  const cartTotal = computed(() => cart.value.reduce((total, item) => total + item.price * item.quantity, 0));

  const addToCart = (product, quantity = 1, selection = {}) => {
    const option = selection.option || null;
    const tags = selection.tags || [];
    const key = selectionKey(product._id, option, tags);
    const existing = cart.value.find((item) => cartItemKey(item) === key);
    const price = Number(selection.price ?? product.price ?? 0);

    if (existing) {
      existing.quantity += quantity;
      return;
    }

    cart.value.push({
      key,
      _id: product._id,
      name: product.name,
      price,
      image: product.image,
      option,
      tags,
      quantity,
    });
  };

  const updateQuantity = (itemKey, amount) => {
    const item = cart.value.find((cartItem) => cartItemKey(cartItem) === itemKey);
    if (!item) return;

    item.quantity += amount;
    if (item.quantity <= 0) removeFromCart(itemKey);
  };

  const removeFromCart = (itemKey) => {
    cart.value = cart.value.filter((item) => cartItemKey(item) !== itemKey);
  };

  const clearCart = () => {
    cart.value = [];
  };

  return {
    cart,
    cartCount,
    cartTotal,
    addToCart,
    clearCart,
    updateQuantity,
    removeFromCart,
  };
};
