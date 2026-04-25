# Bugfix Requirements Document

## Introduction

This document captures the bugs, performance bottlenecks, and security issues identified through a thorough analysis of the Nova e-commerce application. The codebase is a Node.js/Express backend with a React/TypeScript frontend. The issues span multiple layers: race conditions in order processing, stock management vulnerabilities, frontend state inconsistencies, N+1 database query patterns, duplicate indexes, missing input validation, and insecure error handling. Each issue is documented with its current defective behavior, the expected correct behavior, and the existing behavior that must be preserved.

---

## Bug Analysis

### Current Behavior (Defect)

**Section 1 — Race Conditions & Data Integrity**

1.1 WHEN two users simultaneously place an order for the last unit of a product THEN the system decrements stock for both orders without atomic locking, resulting in stock going negative

1.2 WHEN `checkoutOrderService` validates stock and then saves the order in two separate non-atomic operations THEN the system allows a race window where another request can deplete stock between the check and the decrement

1.3 WHEN `deleteOrderService` restores stock for cancelled orders THEN the system issues individual `findByIdAndUpdate` calls per order item in a sequential loop, making the operation non-atomic and slow under concurrent cancellations

1.4 WHEN `addReview` in `review.controller.js` calculates the new average rating THEN the system fetches all reviews with `Review.find({ product: productId })` and computes the average in JavaScript, which is non-atomic and can produce incorrect averages under concurrent review submissions

**Section 2 — Performance: N+1 Queries & Missing Indexes**

2.1 WHEN `calculateOrderAmountService` is called with a cart of N items THEN the system executes N sequential `Product.findById` calls inside a `for` loop instead of a single batched query, causing N+1 database round-trips

2.2 WHEN `checkoutOrderService` is called THEN the system again executes N sequential `Product.findById` calls and then N sequential `Product.findByIdAndUpdate` calls for stock decrement, totalling 2N database round-trips per checkout

2.3 WHEN `deleteOrderService` restores stock THEN the system executes one `Product.findByIdAndUpdate` per order item in a sequential loop instead of a single bulk operation

2.4 WHEN the `Product` model is defined THEN the system registers two separate text indexes on `{ name, description }` — one without `brand` and one with `brand` — causing MongoDB to build a duplicate conflicting index

2.5 WHEN `Home.tsx` fetches products for the homepage THEN the system calls `/products` with no `limit` parameter, fetching all products (defaulting to 12 per page) and then slicing client-side with `products.slice(0, 4)` and `products.slice(4, 8)`, wasting bandwidth on unused data

2.6 WHEN `getAllOrdersService` is called by an admin THEN the system returns all orders with no pagination, which will degrade performance as the order count grows

**Section 3 — Security Issues**

3.1 WHEN `updateProductService` is called THEN the system passes `runValidators: false` to `findByIdAndUpdate`, disabling all Mongoose schema validators including the `discountPrice < price` constraint, allowing invalid data to be saved

3.2 WHEN `cart.controller.js` catches errors THEN the system returns raw `error.message` strings directly in the API response, potentially leaking internal implementation details to clients

3.3 WHEN `review.controller.js` catches errors THEN the system returns raw `error.message` strings directly in the API response instead of routing through the global error handler via `next(error)`

3.4 WHEN `coupon.controller.js` catches errors THEN the system returns raw `error.message` strings directly in the API response instead of routing through the global error handler

3.5 WHEN the CSRF token bootstrap endpoint `/api/v1/csrf-token` is called THEN the system checks `req.cookies['XSRF-TOKEN']` but does not validate whether the existing token is structurally valid (e.g., correct length/entropy), allowing a client to lock in a weak or attacker-supplied token

3.6 WHEN `updateQuantity` is called in `useCartStore.ts` with a delta that would reduce quantity to zero or below THEN the system silently keeps the item at its current quantity instead of removing it, leaving ghost items in the cart

**Section 4 — Frontend State & Logic Bugs**

4.1 WHEN `handleAddToCart` in `ProductDetail.tsx` is called with `quantity > 1` THEN the system calls `addToCart` in a loop `quantity` times, each call triggering a separate Zustand state update and re-render, instead of adding the correct quantity in a single operation

4.2 WHEN the `Checkout.tsx` payment intent `useEffect` runs THEN the system creates a new Stripe PaymentIntent every time the `cart` or `appliedCoupon` changes (including on initial mount), but does not cancel the previously created PaymentIntent, leaking abandoned payment intents in Stripe

4.3 WHEN `useAuthStore` persists state to `localStorage` via Zustand `persist` THEN the system stores the full user object including `addresses` in `localStorage`, which may contain sensitive address data that persists after logout if `clearStorage` is not called

4.4 WHEN `Shop.tsx` renders the category filter buttons THEN the system handles two possible API response shapes (`data.data` as an array vs `data.data.categories` as an array) with an inline ternary, indicating the API response shape is inconsistent

4.5 WHEN `ProductDetail.tsx` renders the product price THEN the system always displays `product.price` even when `product.discountPrice` exists, showing the full price instead of the discounted price to the customer

**Section 5 — Missing Validation & Edge Cases**

5.1 WHEN `addAddress` in `auth.controller.js` is called THEN the system does not validate or sanitize the `street`, `city`, `state`, `zipCode`, or `country` fields beyond checking that `street`, `city`, and `zipCode` are present, allowing excessively long strings or script injection via address fields

5.2 WHEN `createProductService` generates a slug from the product name THEN the system uses a basic regex replace that does not handle Unicode characters, consecutive hyphens, or leading/trailing hyphens, potentially generating malformed slugs

5.3 WHEN `applyCoupon` in `coupon.controller.js` is called without a `cartTotal` in the request body THEN the system skips the minimum order value check entirely (due to `if (cartTotal && ...)`) and returns a discount amount of `0` for percentage coupons, allowing coupons to be "validated" against an unknown cart total

5.4 WHEN `updateCartItemService` is called with a `newQuantity` of `0` THEN the system throws an error "Quantity must be greater than zero" but the cart controller does not handle this as a remove operation, forcing clients to call a separate endpoint

5.5 WHEN `auth.middleware.js` fetches the user on every protected request THEN the system executes `User.findById(decoded.userId)` with no field selection (`.select()`), fetching the entire user document including the `cart` array and `addresses` array on every authenticated API call

---

### Expected Behavior (Correct)

**Section 2 — Race Conditions & Data Integrity**

2.1 WHEN two users simultaneously place an order for the last unit of a product THEN the system SHALL use MongoDB's atomic `findOneAndUpdate` with a stock condition (`{ stock: { $gte: quantity } }`) to prevent overselling

2.2 WHEN `checkoutOrderService` validates and decrements stock THEN the system SHALL perform stock validation and decrement atomically in a single database operation per product using conditional updates

2.3 WHEN `deleteOrderService` restores stock for cancelled orders THEN the system SHALL use `bulkWrite` with a single database round-trip to restore all item quantities atomically

2.4 WHEN `addReview` calculates the new average rating THEN the system SHALL use a MongoDB aggregation pipeline (`$avg`) to compute the average atomically from the database, not from a JavaScript array

**Section 3 — Performance: N+1 Queries & Missing Indexes**

3.1 WHEN `calculateOrderAmountService` is called with N cart items THEN the system SHALL fetch all required products in a single `Product.find({ _id: { $in: productIds } })` query

3.2 WHEN `checkoutOrderService` processes cart items THEN the system SHALL fetch all products in one query and perform all stock decrements in a single `bulkWrite` operation

3.3 WHEN `deleteOrderService` restores stock THEN the system SHALL use a single `bulkWrite` call to restore all item quantities

3.4 WHEN the `Product` model is defined THEN the system SHALL have exactly one text index covering `{ name, description, brand }`, with the duplicate index removed

3.5 WHEN `Home.tsx` fetches featured products THEN the system SHALL request only the required number of products using `limit=8` (or two separate targeted queries) to avoid fetching and discarding unused data

3.6 WHEN `getAllOrdersService` is called THEN the system SHALL support pagination parameters to limit the result set

**Section 4 — Security Issues**

4.1 WHEN `updateProductService` is called THEN the system SHALL run validators on update operations to enforce schema constraints including `discountPrice < price`

4.2 WHEN any controller catches an error THEN the system SHALL route all errors through `next(error)` to the global error handler, which correctly suppresses internal details in production

4.3 WHEN the CSRF token bootstrap endpoint is called and a token already exists THEN the system SHALL verify the existing token meets minimum entropy requirements before reusing it

4.4 WHEN `updateQuantity` in `useCartStore.ts` results in a quantity of zero or below THEN the system SHALL remove the item from the cart automatically

**Section 5 — Frontend State & Logic Bugs**

5.1 WHEN `handleAddToCart` in `ProductDetail.tsx` is called with `quantity > 1` THEN the system SHALL add the product to the cart once with the correct quantity in a single state update

5.2 WHEN the Checkout payment intent `useEffect` detects a cart or coupon change THEN the system SHALL cancel any previously created PaymentIntent before creating a new one, or debounce the creation to avoid leaking intents

5.3 WHEN `ProductDetail.tsx` renders the product price THEN the system SHALL display `product.discountPrice` when it exists, with the original `product.price` shown as struck-through

5.4 WHEN `auth.middleware.js` fetches the user for authentication THEN the system SHALL select only the fields required for authorization (`_id`, `role`, `isVerified`) to reduce document size on every request

**Section 6 — Missing Validation & Edge Cases**

6.1 WHEN `applyCoupon` is called without a `cartTotal` THEN the system SHALL require `cartTotal` as a mandatory field and return a 400 error if it is missing

6.2 WHEN `createProductService` generates a slug THEN the system SHALL produce a slug that handles Unicode normalization, collapses consecutive hyphens, and trims leading/trailing hyphens

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user places a valid order with sufficient stock THEN the system SHALL CONTINUE TO create the order, decrement stock, and return a 201 response

3.2 WHEN a user applies a valid coupon with a cart total above the minimum order value THEN the system SHALL CONTINUE TO calculate and return the correct discount amount

3.3 WHEN an admin updates a product's name THEN the system SHALL CONTINUE TO auto-generate the slug from the new name

3.4 WHEN a user cancels a pending or processing order THEN the system SHALL CONTINUE TO restore the stock for all order items

3.5 WHEN a user adds a product to the cart from the product detail page with quantity 1 THEN the system SHALL CONTINUE TO add the item and open the cart drawer

3.6 WHEN the Stripe webhook receives a `payment_intent.succeeded` event THEN the system SHALL CONTINUE TO update the order's payment status to `paid` idempotently

3.7 WHEN an unauthenticated user browses the shop or product detail pages THEN the system SHALL CONTINUE TO serve product data without requiring authentication

3.8 WHEN an admin fetches all orders THEN the system SHALL CONTINUE TO return orders populated with user name and email

3.9 WHEN a user submits a review THEN the system SHALL CONTINUE TO prevent duplicate reviews from the same user for the same product

3.10 WHEN the refresh token interceptor in `axios.ts` detects a 401 response THEN the system SHALL CONTINUE TO queue concurrent failed requests and replay them after a successful token refresh

---

## Bug Condition Pseudocode

### Bug Condition 1 — Stock Race Condition

```pascal
FUNCTION isBugCondition_StockRace(X)
  INPUT: X of type { concurrentRequests: number, availableStock: number, requestedQuantity: number }
  OUTPUT: boolean
  RETURN X.concurrentRequests > 1 AND X.availableStock <= (X.requestedQuantity * X.concurrentRequests)
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_StockRace(X) DO
  result ← checkoutOrderService'(X)
  ASSERT stock(product) >= 0 AND only_one_order_succeeds(result)
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_StockRace(X) DO
  ASSERT checkoutOrderService(X) = checkoutOrderService'(X)
END FOR
```

### Bug Condition 2 — N+1 Query in Checkout

```pascal
FUNCTION isBugCondition_NPlus1(X)
  INPUT: X of type { cartItems: CartItem[] }
  OUTPUT: boolean
  RETURN X.cartItems.length > 1
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_NPlus1(X) DO
  result ← calculateOrderAmountService'(X)
  ASSERT db_query_count(result) = 1  // Single batched query
END FOR
```

### Bug Condition 3 — Add to Cart Loop

```pascal
FUNCTION isBugCondition_AddToCartLoop(X)
  INPUT: X of type { quantity: number }
  OUTPUT: boolean
  RETURN X.quantity > 1
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_AddToCartLoop(X) DO
  result ← handleAddToCart'(X)
  ASSERT state_updates_count(result) = 1 AND cart_item_quantity(result) = X.quantity
END FOR
```

### Bug Condition 4 — Discount Price Not Displayed

```pascal
FUNCTION isBugCondition_DiscountPrice(X)
  INPUT: X of type Product
  OUTPUT: boolean
  RETURN X.discountPrice != null AND X.discountPrice < X.price
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition_DiscountPrice(X) DO
  rendered ← ProductDetail'(X)
  ASSERT displayed_price(rendered) = X.discountPrice
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_DiscountPrice(X) DO
  ASSERT ProductDetail(X).displayed_price = ProductDetail'(X).displayed_price
END FOR
```
