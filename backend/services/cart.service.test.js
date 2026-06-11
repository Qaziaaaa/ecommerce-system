import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/User.js', () => ({ default: { findById: vi.fn() } }));
vi.mock('../models/Product.js', () => ({ default: { findOne: vi.fn() } }));

let cartService, Product, User;

beforeEach(async () => {
  vi.clearAllMocks();
  User = (await import('../models/User.js')).default;
  Product = (await import('../models/Product.js')).default;
  cartService = await import('./cart.service.js');
});

function makeUser(cart = []) {
  return { _id: 'u1', cart, save: vi.fn().mockResolvedValue(true) };
}

function makeProduct(overrides = {}) {
  return { _id: 'p1', name: 'Test', price: 50, stock: 10, isActive: true, ...overrides };
}

describe('addToCartService', () => {
  it('adds new item to cart', async () => {
    const product = makeProduct();
    Product.findOne.mockResolvedValue(product);
    const user = makeUser([]);
    User.findById.mockResolvedValue(user);

    const result = await cartService.addToCartService('u1', 'p1', 2);
    expect(user.cart).toHaveLength(1);
    expect(user.cart[0]).toEqual({ product: 'p1', quantity: 2 });
    expect(user.save).toHaveBeenCalled();
    expect(result).toBe(user.cart);
  });

  it('updates quantity for existing cart item', async () => {
    const product = makeProduct();
    Product.findOne.mockResolvedValue(product);
    const user = makeUser([{ product: 'p1', quantity: 1, toString: () => 'p1' }]);
    user.cart.findIndex = vi.fn((fn) => { for (let i = 0; i < user.cart.length; i++) { if (fn(user.cart[i])) return i; } return -1; });
    // Override cart items to make .toString() work
    user.cart[0].product = { toString: () => 'p1' };
    User.findById.mockResolvedValue(user);

    const result = await cartService.addToCartService('u1', 'p1', 3);
    expect(user.cart[0].quantity).toBe(4);
    expect(user.save).toHaveBeenCalled();
  });

  it('throws if product not found or inactive', async () => {
    Product.findOne.mockResolvedValue(null);
    await expect(cartService.addToCartService('u1', 'bad', 1)).rejects.toThrow('Product not found or inactive');
  });

  it('throws if stock insufficient', async () => {
    Product.findOne.mockResolvedValue(makeProduct({ stock: 1 }));
    User.findById.mockResolvedValue(makeUser([]));
    await expect(cartService.addToCartService('u1', 'p1', 5)).rejects.toThrow(/Only 1 items left/);
  });

  it('throws if user not found', async () => {
    Product.findOne.mockResolvedValue(makeProduct());
    User.findById.mockResolvedValue(null);
    await expect(cartService.addToCartService('u1', 'p1', 1)).rejects.toThrow('User not found');
  });

  it('throws if combined quantity exceeds stock', async () => {
    const product = makeProduct({ stock: 5 });
    Product.findOne.mockResolvedValue(product);
    const user = makeUser([{ product: 'p1', quantity: 4, toString: () => 'p1' }]);
    User.findById.mockResolvedValue(user);

    await expect(cartService.addToCartService('u1', 'p1', 2)).rejects.toThrow(/Cannot add more/);
  });
});

describe('getCartService', () => {
  function populatedUser(cartItems = []) {
    return { _id: 'u1', cart: cartItems, save: vi.fn().mockResolvedValue(true) };
  }

  it('returns cart items and total price', async () => {
    const user = populatedUser([
      { product: { _id: 'p1', name: 'A', price: 10, discountPrice: null, stock: 5, isActive: true }, quantity: 2 },
      { product: { _id: 'p2', name: 'B', price: 20, discountPrice: 15, stock: 3, isActive: true }, quantity: 1 },
    ]);
    User.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue(user) });

    const result = await cartService.getCartService('u1');
    expect(result.cartItems).toHaveLength(2);
    expect(result.totalPrice).toBe(35);
  });

  it('filters out inactive or deleted products', async () => {
    const user = populatedUser([
      { product: { _id: 'p1', name: 'Active', price: 10, discountPrice: null, stock: 5, isActive: true }, quantity: 1 },
      { product: null },
    ]);
    User.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue(user) });

    const result = await cartService.getCartService('u1');
    expect(result.cartItems).toHaveLength(1);
    expect(result.totalPrice).toBe(10);
    expect(user.save).toHaveBeenCalled();
  });

  it('throws if user not found', async () => {
    User.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue(null) });
    await expect(cartService.getCartService('bad')).rejects.toThrow('User not found');
  });
});

describe('updateCartItemService', () => {
  it('updates item quantity', async () => {
    Product.findOne.mockResolvedValue(makeProduct());
    const user = makeUser([{ product: { toString: () => 'p1' }, quantity: 2 }]);
    User.findById.mockResolvedValue(user);

    const result = await cartService.updateCartItemService('u1', 'p1', 5);
    expect(user.cart[0].quantity).toBe(5);
    expect(user.save).toHaveBeenCalled();
    expect(result).toBe(user.cart);
  });

  it('throws if quantity is <= 0', async () => {
    await expect(cartService.updateCartItemService('u1', 'p1', 0)).rejects.toThrow('Quantity must be greater than zero');
  });

  it('throws if product not found', async () => {
    Product.findOne.mockResolvedValue(null);
    await expect(cartService.updateCartItemService('u1', 'bad', 1)).rejects.toThrow('Product not found or inactive');
  });

  it('throws if stock insufficient', async () => {
    Product.findOne.mockResolvedValue(makeProduct({ stock: 2 }));
    await expect(cartService.updateCartItemService('u1', 'p1', 10)).rejects.toThrow(/Only 2 items left/);
  });

  it('throws if item not in cart', async () => {
    Product.findOne.mockResolvedValue(makeProduct());
    User.findById.mockResolvedValue(makeUser([]));
    await expect(cartService.updateCartItemService('u1', 'p1', 3)).rejects.toThrow('Item not found in cart');
  });
});

describe('removeCartItemService', () => {
  it('removes item from cart', async () => {
    const user = makeUser([{ product: { toString: () => 'p1' }, quantity: 2 }]);
    User.findById.mockResolvedValue(user);

    const result = await cartService.removeCartItemService('u1', 'p1');
    expect(user.cart).toHaveLength(0);
    expect(user.save).toHaveBeenCalled();
    expect(result).toBe(user.cart);
  });

  it('does nothing if item not in cart', async () => {
    const user = makeUser([{ product: { toString: () => 'p2' }, quantity: 1 }]);
    User.findById.mockResolvedValue(user);

    const result = await cartService.removeCartItemService('u1', 'p1');
    expect(user.cart).toHaveLength(1);
    expect(user.save).toHaveBeenCalled();
  });
});
