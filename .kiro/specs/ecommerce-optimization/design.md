# Nova E-Commerce Optimization Bugfix Design

## Overview

This document formalizes the fix strategy for 27 identified bugs, performance bottlenecks, and security issues in the Nova e-commerce application. The issues span five categories: race conditions and data integrity, N+1 query performance, security vulnerabilities, frontend state and logic bugs, and missing validation/edge cases.

The fix approach is **targeted and minimal**: each change addresses exactly the identified defect without restructuring surrounding code. The bug condition methodology is used throughout — for each issue we define C(X) (the condition that triggers the bug), the expected correct behavior P(result), and the preservation requirement (what must not change).

**Stack:** Node.js/Express backend with MongoDB/Mongoose, React/TypeScript frontend with Zustand and React Query.

---

## Glossary

- **Bug_Condition (C)**: A predicate over inputs that returns `true` when the defective code path is exercised.
- **Property (P)**: The desired correct behavior that must hold for all inputs where C(X) is true.
- **Preservation**: Existing correct behavior for inputs where C(X) is false — must be unchanged by the fix.
- **F**: The original (unfixed) function.
- **F'**: The fixed function.
- **Atomic operation**: A database operation that completes as a single indivisible unit, preventing race conditions.
- **bulkWrite**: MongoDB operation that batches multiple write operations into a single round-trip.
- **N+1 query**: A pattern where one query fetches N records and then N additional queries are issued, one per record.
- **runValidators**: Mongoose option that controls whether schema validators run on `findByIdAndUpdate` calls.
- **PaymentIntent**: A Stripe object representing a payment lifecycle; leaked intents accumulate cost and noise.
- **isBugCondition**: Pseudocode function that identifies whether a given input triggers the bug.
- **checkoutOrderService**: `backend/services/order.service.js` — handles order creation and stock decrement.
- **calculateOrderAmountService**: `backend/services/order.service.js` — computes order total for PaymentIntent creation.
- **deleteOrderService**: `backend/services/order.service.js` — cancels an order and restores stock.
- **updateProductService**: `backend/services/product.service.js` — updates a product document.
- **createProductService**: `backend/services/product.service.js` — creates a product and generates its slug.
- **addReview**: `backend/controllers/review.controller.js` — creates a review and recalculates product rating.
- **protect**: `backend/middlewares/auth.middleware.js` — JWT authentication middleware.
- **applyCoupon**: `backend/controllers/coupon.controller.js` — validates a coupon and calculates discount.
- **handleAddToCart**: `frontend/src/pages/ProductDetail.tsx` — adds selected quantity to cart.
- **updateQuantity**: `frontend/src/store/useCartStore.ts` — adjusts cart item quantity by delta.

---

## Bug Details

### Category 1 — Race Conditions & Data Integrity

#### Bug 1.1 & 1.2 — Stock Overselling in `checkoutOrderService`

The checkout flow performs stock validation and stock decrement as two separate, non-atomic operations. Between the `if (product.stock < item.quantity)` check and the subsequent `Product.findByIdAndUpdate(..., { $inc: { stock: -item.quantity } })`, another concurrent request can pass the same check and also decrement stock, driving it negative.

**Formal Specification:**
```
FUNCTION isBugCondition_StockRace(X)
  INPUT: X of type { concurrentRequests: number, availableStock: number, requestedQuantity: number }
  OUTPUT: boolean

  RETURN X.concurrentRequests > 1
         AND X.availableStock <= (X.requestedQuantity * X.concurrentRequests)
         AND stockDecrementIsNonAtomic()
END FUNCTION
```

**Examples:**
- Two users simultaneously buy the last unit: both pass the `stock >= 1` check, both decrement → `stock = -1` (BUG)
- One user buys 3 units while another buys 2, stock = 4: both pass check, combined decrement → `stock = -1` (BUG)
- Single user buys last unit with no concurrency: check passes, decrement runs → `stock = 0` (correct, not a bug condition)

#### Bug 1.3 — Non-Atomic Stock Restoration in `deleteOrderService`

When an order is cancelled, stock is restored via a `for` loop issuing one `Product.findByIdAndUpdate` per item. Under concurrent cancellations of orders sharing products, increments can be lost.

**Formal Specification:**
```
FUNCTION isBugCondition_StockRestore(X)
  INPUT: X of type { orderItems: OrderItem[], concurrentCancellations: number }
  OUTPUT: boolean

  RETURN X.orderItems.length > 0
         AND X.concurrentCancellations > 1
         AND stockRestoreIsSequentialLoop()
END FUNCTION
```

**Examples:**
- Admin cancels two orders for the same product simultaneously: one increment may be lost (BUG)
- Single order with 3 items cancelled: sequential loop runs without contention (not a bug condition in isolation, but still slow)

#### Bug 1.4 — Non-Atomic Review Rating Calculation in `addReview`

After creating a review, the controller fetches all reviews with `Review.find({ product: productId })` and computes the average in JavaScript. Under concurrent review submissions, two requests can both fetch the same stale review list and both save the same (incorrect) average.

**Formal Specification:**
```
FUNCTION isBugCondition_RatingRace(X)
  INPUT: X of type { concurrentReviews: number, productId: ObjectId }
  OUTPUT: boolean

  RETURN X.concurrentReviews > 1
         AND ratingComputedInJavaScript()
         AND NOT ratingComputedAtomicallyInDB()
END FUNCTION
```

**Examples:**
- Two users submit reviews simultaneously: both fetch 5 reviews, both compute avg of 5 reviews, one save overwrites the other → count stays at 5 instead of 6 (BUG)
- Single review submission: fetch → compute → save is sequential, result is correct (not a bug condition)

---

### Category 2 — Performance: N+1 Queries & Missing Indexes

#### Bug 2.1 & 2.2 — N+1 `Product.findById` in `calculateOrderAmountService` and `checkoutOrderService`

Both services iterate over cart items with a `for` loop and call `Product.findById(item.product)` inside each iteration. For a cart with N items, this produces N sequential database round-trips.

**Formal Specification:**
```
FUNCTION isBugCondition_NPlus1(X)
  INPUT: X of type { cartItems: CartItem[] }
  OUTPUT: boolean

  RETURN X.cartItems.length > 1
         AND productsAreQueriedInLoop()
END FUNCTION
```

**Examples:**
- Cart with 5 items: 5 `findById` calls issued sequentially (BUG — should be 1 `find` with `$in`)
- Cart with 1 item: 1 `findById` call (not a bug condition, but still benefits from the fix)

#### Bug 2.3 — Sequential Stock Restoration Loop in `deleteOrderService`

Same N+1 pattern: one `findByIdAndUpdate` per order item instead of a single `bulkWrite`.

#### Bug 2.4 — Duplicate Conflicting Text Index on `Product` Model

`Product.js` registers two text indexes:
```js
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
```
MongoDB only allows one text index per collection. The second definition conflicts with the first, causing a startup warning and potentially preventing the intended `brand` field from being searchable.

**Formal Specification:**
```
FUNCTION isBugCondition_DuplicateIndex(X)
  INPUT: X of type ProductSchema
  OUTPUT: boolean

  RETURN countTextIndexDefinitions(X) > 1
END FUNCTION
```

#### Bug 2.5 — `Home.tsx` Fetches All Products Then Slices Client-Side

`Home.tsx` calls `GET /products` with no `limit` parameter (defaults to 12), then slices the result:
```js
const trendingProducts = products.slice(0, 4);
const newArrivals = products.slice(4, 8);
```
This fetches up to 12 products over the network but only uses 8, wasting bandwidth.

**Formal Specification:**
```
FUNCTION isBugCondition_OverFetch(X)
  INPUT: X of type HomePageRequest
  OUTPUT: boolean

  RETURN requestedProductCount(X) > neededProductCount(X)
         AND slicingDoneClientSide(X)
END FUNCTION
```

#### Bug 2.6 — `getAllOrdersService` Has No Pagination

The admin orders endpoint returns all orders with no limit, which will degrade as order volume grows.

---

### Category 3 — Security Issues

#### Bug 3.1 — `updateProductService` Sets `runValidators: false`

```js
const product = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: false  // BUG
});
```
This disables the `discountPrice < price` validator and all other schema validators, allowing invalid data to be persisted.

**Formal Specification:**
```
FUNCTION isBugCondition_NoValidators(X)
  INPUT: X of type ProductUpdatePayload
  OUTPUT: boolean

  RETURN X.discountPrice != null
         AND X.discountPrice >= X.price
         AND runValidatorsIsFalse()
END FUNCTION
```

**Examples:**
- Admin sets `discountPrice = 100`, `price = 50`: validator would reject this, but `runValidators: false` allows it (BUG)
- Admin sets `discountPrice = 30`, `price = 50`: valid data, passes regardless (not a bug condition)

#### Bug 3.2, 3.3, 3.4 — Raw `error.message` Leaked in API Responses

`cart.controller.js`, `review.controller.js`, and `coupon.controller.js` all catch errors and return `error.message` directly:
```js
} catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
}
```
This bypasses the global error handler (`error.middleware.js`) which correctly suppresses internal details in production. Internal stack traces, database error messages, or implementation details can leak to clients.

**Formal Specification:**
```
FUNCTION isBugCondition_ErrorLeak(X)
  INPUT: X of type ControllerError
  OUTPUT: boolean

  RETURN errorCaughtLocally(X)
         AND rawMessageReturnedToClient(X)
         AND NOT routedThroughGlobalHandler(X)
END FUNCTION
```

#### Bug 3.5 — CSRF Token Bootstrap Does Not Validate Existing Token Entropy

The `/api/v1/csrf-token` endpoint reuses an existing `XSRF-TOKEN` cookie without validating its structure or entropy. An attacker who can set a weak or predictable cookie value can lock it in.

#### Bug 3.6 — `updateQuantity` Silently Keeps Item at Zero Delta

In `useCartStore.ts`:
```ts
return newQ > 0 ? { ...item, quantity: newQ } : item;  // BUG: returns item unchanged instead of removing
```
When `delta` would reduce quantity to 0 or below, the item is silently kept at its current quantity instead of being removed.

**Formal Specification:**
```
FUNCTION isBugCondition_ZeroDelta(X)
  INPUT: X of type { currentQuantity: number, delta: number }
  OUTPUT: boolean

  RETURN (X.currentQuantity + X.delta) <= 0
END FUNCTION
```

**Examples:**
- Item with quantity 1, delta -1: result should be item removed, but item stays at quantity 1 (BUG)
- Item with quantity 3, delta -1: result is quantity 2 (correct, not a bug condition)

---

### Category 4 — Frontend State & Logic Bugs

#### Bug 4.1 — `handleAddToCart` Calls `addToCart` in a Loop

```tsx
const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {  // BUG
        addToCart(cartItem);
    }
};
```
Each `addToCart` call triggers a Zustand state update and re-render. For `quantity = 5`, this causes 5 state updates and 5 re-renders instead of 1.

**Formal Specification:**
```
FUNCTION isBugCondition_AddToCartLoop(X)
  INPUT: X of type { quantity: number }
  OUTPUT: boolean

  RETURN X.quantity > 1
END FUNCTION
```

**Examples:**
- User selects quantity 3 and clicks "Add to Cart": 3 `addToCart` calls, 3 re-renders, cart shows quantity 3 (BUG — should be 1 call)
- User selects quantity 1: 1 `addToCart` call (not a bug condition)

#### Bug 4.2 — Checkout Leaks Stripe PaymentIntents on Cart/Coupon Changes

The `useEffect` in `Checkout.tsx` creates a new PaymentIntent every time `cart` or `appliedCoupon` changes, but never cancels the previous one. The 500ms debounce reduces frequency but does not cancel abandoned intents.

**Formal Specification:**
```
FUNCTION isBugCondition_PaymentIntentLeak(X)
  INPUT: X of type { cartChanges: number, couponChanges: number }
  OUTPUT: boolean

  RETURN (X.cartChanges + X.couponChanges) > 1
         AND previousPaymentIntentNotCancelled()
END FUNCTION
```

#### Bug 4.3 — `useAuthStore` Persists Full User Object Including Addresses to `localStorage`

The Zustand `persist` middleware stores the entire user object (including `addresses`) in `localStorage`. If `clearStorage` is not called on logout, sensitive address data persists.

#### Bug 4.4 — `ProductDetail.tsx` Always Shows `product.price` Even When `discountPrice` Exists

```tsx
<p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
```
The discounted price is never displayed. Customers see the full price even when a discount applies.

**Formal Specification:**
```
FUNCTION isBugCondition_DiscountPrice(X)
  INPUT: X of type Product
  OUTPUT: boolean

  RETURN X.discountPrice != null AND X.discountPrice < X.price
END FUNCTION
```

**Examples:**
- Product with `price = 100`, `discountPrice = 75`: displays `$100.00` (BUG — should show `$75.00` with `$100.00` struck through)
- Product with `price = 100`, no `discountPrice`: displays `$100.00` (correct, not a bug condition)

---

### Category 5 — Validation & Edge Cases

#### Bug 5.1 — `addAddress` Has No Length/Sanitization Validation

The `addAddress` controller only checks that `street`, `city`, and `zipCode` are present. It does not enforce maximum lengths or sanitize against script injection.

**Formal Specification:**
```
FUNCTION isBugCondition_AddressValidation(X)
  INPUT: X of type AddressPayload
  OUTPUT: boolean

  RETURN (length(X.street) > MAX_FIELD_LENGTH
         OR length(X.city) > MAX_FIELD_LENGTH
         OR containsScriptTags(X.street)
         OR containsScriptTags(X.city))
         AND noLengthValidationEnforced()
END FUNCTION
```

#### Bug 5.2 — Slug Generation Doesn't Handle Unicode/Consecutive Hyphens

```js
productData.slug = productData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
```
This does not normalize Unicode (e.g., `"Café"` → `"caf-"` instead of `"cafe"`), does not collapse consecutive hyphens (`"hello--world"`), and does not trim leading/trailing hyphens.

**Formal Specification:**
```
FUNCTION isBugCondition_SlugGeneration(X)
  INPUT: X of type { name: string }
  OUTPUT: boolean

  RETURN containsUnicode(X.name)
         OR wouldProduceConsecutiveHyphens(X.name)
         OR wouldProduceLeadingOrTrailingHyphens(X.name)
END FUNCTION
```

**Examples:**
- `"Café Latte"` → `"caf-latte"` (BUG — should be `"cafe-latte"`)
- `"Hello  World"` (double space) → `"hello--world"` (BUG — should be `"hello-world"`)
- `"-Cool Product-"` → `"-cool-product-"` (BUG — should be `"cool-product"`)
- `"Simple Name"` → `"simple-name"` (correct, not a bug condition)

#### Bug 5.3 — `applyCoupon` Skips Minimum Order Value Check When `cartTotal` Is Absent

```js
if (cartTotal && cartTotal < coupon.minOrderValue) { ... }  // BUG: skips check when cartTotal is falsy
```
When `cartTotal` is `0` or absent, the minimum order check is skipped entirely. A percentage coupon then returns `discountAmount = 0` (since `0 * rate / 100 = 0`), but the coupon is still marked as "applied successfully".

**Formal Specification:**
```
FUNCTION isBugCondition_CouponValidation(X)
  INPUT: X of type { cartTotal: number | undefined, coupon: Coupon }
  OUTPUT: boolean

  RETURN (X.cartTotal == null OR X.cartTotal == 0)
         AND X.coupon.minOrderValue > 0
END FUNCTION
```

#### Bug 5.4 — `auth.middleware.js` Fetches Full User Document With No Field Projection

```js
const currentUser = await User.findById(decoded.userId);  // BUG: no .select()
```
Every authenticated request fetches the full user document including the `cart` array and `addresses` array, which can be large.

**Formal Specification:**
```
FUNCTION isBugCondition_AuthProjection(X)
  INPUT: X of type AuthenticatedRequest
  OUTPUT: boolean

  RETURN noFieldProjectionOnUserFetch()
         AND userHasLargeCartOrAddresses(X.userId)
END FUNCTION
```

---

## Expected Behavior

### Preservation Requirements

The following behaviors are correct today and must remain unchanged after all fixes are applied:

**Unchanged Behaviors:**
- A valid order with sufficient stock creates the order, decrements stock, and returns 201 (Requirement 3.1)
- A valid coupon applied to a cart total above the minimum order value returns the correct discount (Requirement 3.2)
- Admin updating a product name auto-generates the slug from the new name (Requirement 3.3)
- Cancelling a pending or processing order restores stock for all order items (Requirement 3.4)
- Adding a product with quantity 1 from the product detail page adds the item and opens the cart drawer (Requirement 3.5)
- The Stripe webhook `payment_intent.succeeded` event updates the order payment status to `paid` idempotently (Requirement 3.6)
- Unauthenticated users can browse the shop and product detail pages without authentication (Requirement 3.7)
- Admin fetching all orders receives orders populated with user name and email (Requirement 3.8)
- A user cannot submit a duplicate review for the same product (Requirement 3.9)
- The refresh token interceptor in `axios.ts` queues concurrent 401 failures and replays them after token refresh (Requirement 3.10)

**Scope of Non-Affected Inputs:**
All inputs that do NOT satisfy any of the bug conditions above should be completely unaffected by the fixes. This includes:
- Single-item checkouts with no concurrency
- Product updates with valid `discountPrice < price`
- Cart operations with quantity > 0
- Coupon applications with a provided, non-zero `cartTotal`
- Product names containing only ASCII alphanumeric characters and spaces
- Auth middleware requests for users with small carts

---

## Hypothesized Root Cause

### Category 1 — Race Conditions

1. **Non-Atomic Read-Modify-Write in Checkout**: `checkoutOrderService` reads `product.stock`, checks it in JavaScript, then issues a separate `findByIdAndUpdate`. The gap between read and write is the race window. Fix: use a single atomic `findOneAndUpdate` with a `{ stock: { $gte: quantity } }` filter condition.

2. **Sequential Loop for Bulk Writes**: Both `deleteOrderService` and `checkoutOrderService` use `for` loops with `await` inside, issuing one DB call per item. Fix: collect all operations and issue a single `bulkWrite`.

3. **JavaScript-Side Aggregation for Rating**: `addReview` fetches all reviews into memory and computes the average in JavaScript. Fix: use MongoDB's `$avg` aggregation operator to compute the average atomically in the database.

### Category 2 — Performance

4. **Missing `$in` Query**: Both order amount services call `Product.findById` inside a loop. The fix is straightforward: collect all product IDs, issue one `Product.find({ _id: { $in: ids } })`, then build a lookup map.

5. **Duplicate Index Declaration**: Two `productSchema.index()` calls both declare text indexes. MongoDB silently ignores or errors on the second. Fix: remove the first (narrower) declaration and keep only the one covering `{ name, description, brand }`.

6. **Missing `limit` Parameter on Home Fetch**: `Home.tsx` calls `/products` without `?limit=8`. The backend defaults to 12. Fix: pass `?limit=8` (or two separate `?limit=4` calls with different sort/filter criteria for trending vs. new arrivals).

7. **Missing Pagination on Admin Orders**: `getAllOrdersService` calls `Order.find()` with no limit. Fix: add `page` and `limit` query parameter support mirroring the pattern already used in `getAllProductsService`.

### Category 3 — Security

8. **Intentionally Disabled Validators**: The comment in `updateProductService` reads `"Temporarily disabled to see if discountPrice validator is causing issues"` — this was a debugging shortcut that was never reverted. Fix: set `runValidators: true` and fix the validator's `this` context issue for updates by using a `context: 'query'` option or a pre-hook.

9. **Missing `next(error)` in Catch Blocks**: Three controllers (`cart`, `review`, `coupon`) use local `res.status(400).json(...)` in catch blocks instead of `next(error)`. Fix: replace with `next(error)` to route through the global error handler.

10. **No Entropy Check on CSRF Token Reuse**: The bootstrap endpoint checks for cookie existence but not validity. Fix: add a minimum length check (e.g., 32 hex characters) before reusing an existing token.

### Category 4 — Frontend

11. **Loop Instead of Single Call with Quantity**: `handleAddToCart` was likely written before `addToCart` supported a `quantity` parameter, or the developer misunderstood the API. Fix: pass `quantity` directly to a single `addToCart` call (requires updating `addToCart` to accept an optional quantity).

12. **No PaymentIntent Cancellation**: The `useEffect` cleanup function only clears the debounce timeout but does not cancel the in-flight or completed PaymentIntent. Fix: store the `paymentIntentId` in a ref and call `POST /orders/cancel-payment-intent` (or use the Stripe API directly) in the cleanup function, or track the intent ID server-side and cancel on new intent creation.

13. **Hardcoded `product.price` in JSX**: The price display in `ProductDetail.tsx` was never updated to handle the `discountPrice` field. Fix: conditionally render `discountPrice` as the primary price with `price` struck through.

14. **`updateQuantity` Returns Item Instead of Removing**: The ternary `return newQ > 0 ? { ...item, quantity: newQ } : item` should be `return newQ > 0 ? { ...item, quantity: newQ } : null` followed by filtering out nulls, or the item should be removed via `filter`.

### Category 5 — Validation

15. **Missing Field-Level Validation in `addAddress`**: The controller only checks presence of three fields. Fix: add `maxlength` checks and basic sanitization (strip HTML tags) for all address fields.

16. **Naive Slug Regex**: The slug generation regex was written for simple ASCII names. Fix: use `String.prototype.normalize('NFD')` to decompose Unicode, strip diacritics, then collapse hyphens and trim.

17. **Falsy Check Instead of Explicit `null` Check for `cartTotal`**: `if (cartTotal && ...)` treats `0` as falsy, skipping the minimum order check. Fix: use `if (cartTotal != null && ...)` or make `cartTotal` a required field with explicit validation.

18. **No Field Projection in Auth Middleware**: `User.findById(decoded.userId)` fetches the entire document. Fix: add `.select('_id name email role isVerified addresses')` — enough for authorization and profile display, excluding the large `cart` array.

---

## Correctness Properties

Property 1: Bug Condition — Atomic Stock Decrement Prevents Overselling

_For any_ checkout request where `isBugCondition_StockRace` holds (concurrent requests competing for limited stock), the fixed `checkoutOrderService` SHALL use a single atomic `findOneAndUpdate` with a stock guard condition such that `stock` never goes below zero and at most one concurrent request succeeds when stock is insufficient for all.

**Validates: Requirements 2.1, 2.2**

---

Property 2: Preservation — Valid Single-User Checkout Unchanged

_For any_ checkout request where `isBugCondition_StockRace` does NOT hold (sufficient stock, no concurrency), the fixed `checkoutOrderService` SHALL produce the same order creation result, stock decrement, and 201 response as the original function.

**Validates: Requirements 3.1**

---

Property 3: Bug Condition — Batched Product Queries Replace N+1 Loop

_For any_ cart with N > 1 items, the fixed `calculateOrderAmountService` and `checkoutOrderService` SHALL issue exactly 1 `Product.find` query (plus 1 `bulkWrite` for stock decrement in checkout) regardless of N, rather than N individual `findById` calls.

**Validates: Requirements 3.1, 3.2**

---

Property 4: Preservation — Order Amount Calculation Correctness Unchanged

_For any_ cart input where `isBugCondition_NPlus1` holds, the fixed services SHALL return the same computed `totalAmount` as the original services — only the number of database round-trips changes, not the result.

**Validates: Requirements 3.1, 3.2**

---

Property 5: Bug Condition — Atomic Rating Recalculation

_For any_ concurrent review submission where `isBugCondition_RatingRace` holds, the fixed `addReview` SHALL compute `ratingsAverage` and `ratingsCount` using a MongoDB aggregation pipeline, ensuring the final stored values reflect all submitted reviews without lost updates.

**Validates: Requirements 2.4**

---

Property 6: Preservation — Single Review Submission Unchanged

_For any_ single (non-concurrent) review submission, the fixed `addReview` SHALL produce the same `ratingsAverage`, `ratingsCount`, and review document as the original function.

**Validates: Requirements 3.9**

---

Property 7: Bug Condition — Schema Validators Enforced on Product Update

_For any_ product update payload where `isBugCondition_NoValidators` holds (i.e., `discountPrice >= price`), the fixed `updateProductService` SHALL reject the update with a validation error rather than persisting invalid data.

**Validates: Requirements 4.1**

---

Property 8: Preservation — Valid Product Updates Still Succeed

_For any_ product update payload where `isBugCondition_NoValidators` does NOT hold (valid data), the fixed `updateProductService` SHALL update the product and return the updated document, identical to the original behavior.

**Validates: Requirements 3.3**

---

Property 9: Bug Condition — Errors Routed Through Global Handler

_For any_ error thrown in `cart.controller.js`, `review.controller.js`, or `coupon.controller.js`, the fixed controllers SHALL call `next(error)` so the global error handler suppresses internal details in production responses.

**Validates: Requirements 4.2**

---

Property 10: Preservation — Successful Controller Responses Unchanged

_For any_ request that does NOT throw an error in the affected controllers, the fixed controllers SHALL return the same response shape and status code as the original controllers.

**Validates: Requirements 3.2, 3.9**

---

Property 11: Bug Condition — `updateQuantity` Removes Item at Zero

_For any_ cart state where `isBugCondition_ZeroDelta` holds (quantity + delta <= 0), the fixed `updateQuantity` SHALL remove the item from the cart rather than keeping it at its current quantity.

**Validates: Requirements 4.4**

---

Property 12: Preservation — Positive Delta Updates Unchanged

_For any_ cart state where `isBugCondition_ZeroDelta` does NOT hold (quantity + delta > 0), the fixed `updateQuantity` SHALL produce the same updated quantity as the original function.

**Validates: Requirements 3.5**

---

Property 13: Bug Condition — Single `addToCart` Call for Any Quantity

_For any_ `handleAddToCart` invocation where `isBugCondition_AddToCartLoop` holds (quantity > 1), the fixed handler SHALL call `addToCart` exactly once with the correct quantity, producing a single Zustand state update and a cart item with `quantity = selectedQuantity`.

**Validates: Requirements 5.1**

---

Property 14: Preservation — Quantity-1 Add to Cart Unchanged

_For any_ `handleAddToCart` invocation where `isBugCondition_AddToCartLoop` does NOT hold (quantity = 1), the fixed handler SHALL produce the same cart state as the original handler.

**Validates: Requirements 3.5**

---

Property 15: Bug Condition — Discount Price Displayed When Present

_For any_ product where `isBugCondition_DiscountPrice` holds (`discountPrice` exists and is less than `price`), the fixed `ProductDetail` component SHALL display `discountPrice` as the primary price and `price` as a struck-through secondary price.

**Validates: Requirements 5.3**

---

Property 16: Preservation — Full Price Display Unchanged When No Discount

_For any_ product where `isBugCondition_DiscountPrice` does NOT hold (no `discountPrice`), the fixed `ProductDetail` component SHALL display `price` exactly as the original component does.

**Validates: Requirements 3.7**

---

Property 17: Bug Condition — `applyCoupon` Requires `cartTotal`

_For any_ coupon application request where `isBugCondition_CouponValidation` holds (`cartTotal` is absent or zero), the fixed `applyCoupon` SHALL return a 400 error requiring `cartTotal` rather than silently applying a zero discount.

**Validates: Requirements 6.1**

---

Property 18: Preservation — Valid Coupon Application Unchanged

_For any_ coupon application request where `isBugCondition_CouponValidation` does NOT hold (valid `cartTotal` provided), the fixed `applyCoupon` SHALL return the same discount calculation as the original function.

**Validates: Requirements 3.2**

---

Property 19: Bug Condition — Slug Handles Unicode and Hyphen Edge Cases

_For any_ product name where `isBugCondition_SlugGeneration` holds (contains Unicode, double spaces, or leading/trailing hyphens), the fixed `createProductService` SHALL produce a slug that is normalized, has no consecutive hyphens, and has no leading or trailing hyphens.

**Validates: Requirements 6.2**

---

Property 20: Preservation — ASCII Product Name Slugs Unchanged

_For any_ product name where `isBugCondition_SlugGeneration` does NOT hold (pure ASCII, single spaces, no edge cases), the fixed slug generation SHALL produce the same slug as the original function.

**Validates: Requirements 3.3**

---

## Fix Implementation

### Changes Required

Assuming the root cause analysis above is correct, the following specific changes are needed:

---

#### Fix 1 — Atomic Stock Decrement in `checkoutOrderService`

**File:** `backend/services/order.service.js`

**Function:** `checkoutOrderService`

**Specific Changes:**

1. **Batch product fetch**: Replace the `for` loop with a single `Product.find({ _id: { $in: productIds } })` call. Build a `Map<id, product>` for O(1) lookup during validation.

2. **Atomic stock decrement**: Replace the post-save `for` loop of `findByIdAndUpdate` calls with a single `bulkWrite` using `updateOne` operations with a stock guard:
   ```js
   { updateOne: { filter: { _id: item.product, stock: { $gte: item.quantity } }, update: { $inc: { stock: -item.quantity } } } }
   ```
   After `bulkWrite`, check `result.modifiedCount === orderItems.length`. If not, some stock was insufficient — throw an error and do not save the order (or implement compensating logic to restore already-decremented items).

3. **Apply same batch pattern to `calculateOrderAmountService`**: Replace the `for` loop with a single `Product.find({ _id: { $in: ids } })`.

---

#### Fix 2 — Atomic Stock Restoration in `deleteOrderService`

**File:** `backend/services/order.service.js`

**Function:** `deleteOrderService`

**Specific Changes:**

1. Replace the `for` loop with a single `bulkWrite`:
   ```js
   const bulkOps = order.orderItems.map(item => ({
       updateOne: {
           filter: { _id: item.product },
           update: { $inc: { stock: item.quantity } }
       }
   }));
   await Product.bulkWrite(bulkOps);
   ```

---

#### Fix 3 — Atomic Rating Calculation in `addReview`

**File:** `backend/controllers/review.controller.js`

**Function:** `addReview`

**Specific Changes:**

1. Replace the `Review.find` + JavaScript reduce with a MongoDB aggregation:
   ```js
   const stats = await Review.aggregate([
       { $match: { product: mongoose.Types.ObjectId(productId) } },
       { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
   ]);
   ```
2. Update `product.ratingsAverage` and `product.ratingsCount` from `stats[0]`.
3. Replace `next` parameter usage — add `next` to the function signature and replace all local `res.status(400).json(...)` catch blocks with `next(error)`.

---

#### Fix 4 — Remove Duplicate Text Index

**File:** `backend/models/Product.js`

**Specific Changes:**

1. Remove the first (narrower) text index declaration:
   ```js
   // DELETE this line:
   productSchema.index({ name: 'text', description: 'text' });
   ```
2. Keep only:
   ```js
   productSchema.index({ name: 'text', description: 'text', brand: 'text' });
   ```
3. Drop the old index from the running MongoDB instance (migration step): `db.products.dropIndex('name_text_description_text')`.

---

#### Fix 5 — Add `limit=8` to Home.tsx Product Fetch

**File:** `frontend/src/pages/Home.tsx`

**Specific Changes:**

1. Change the query URL from `/products` to `/products?limit=8`:
   ```ts
   const { data } = await axiosInstance.get('/products?limit=8');
   ```
2. The `slice` calls remain valid as a safety measure but will now operate on at most 8 items.

---

#### Fix 6 — Add Pagination to `getAllOrdersService`

**File:** `backend/services/order.service.js`

**Function:** `getAllOrdersService`

**Specific Changes:**

1. Accept `page` and `limit` parameters:
   ```js
   export const getAllOrdersService = async ({ page = 1, limit = 20 } = {}) => {
       const skip = (page - 1) * limit;
       const [orders, total] = await Promise.all([
           Order.find().populate('user', 'name email').sort('-createdAt').skip(skip).limit(limit),
           Order.countDocuments()
       ]);
       return { orders, total, totalPages: Math.ceil(total / limit), currentPage: page };
   };
   ```
2. Update `order.controller.js` to pass `req.query` page/limit to the service.

---

#### Fix 7 — Enable `runValidators` in `updateProductService`

**File:** `backend/services/product.service.js`

**Function:** `updateProductService`

**Specific Changes:**

1. Change `runValidators: false` to `runValidators: true`.
2. Add `context: 'query'` to make `this` refer to the query in validators (required for the `discountPrice < price` validator to work on updates):
   ```js
   const product = await Product.findByIdAndUpdate(id, updateData, {
       new: true,
       runValidators: true,
       context: 'query'
   });
   ```
3. Update the `discountPrice` validator in `Product.js` to handle the query context:
   ```js
   validator: function(val) {
       // 'this' is the query in update context; use this.get('price') or pass price in update
       return val < this.price || val < this.get('price');
   }
   ```
   Alternatively, use a pre-save hook or a custom validator that reads from the document being updated.

---

#### Fix 8 — Route Errors Through Global Handler in Cart, Review, Coupon Controllers

**Files:**
- `backend/controllers/cart.controller.js`
- `backend/controllers/review.controller.js`
- `backend/controllers/coupon.controller.js`

**Specific Changes:**

For each `catch (error)` block that currently does `res.status(400).json(...)`:
1. Replace with `next(error)`.
2. Ensure the function signature includes `next` as the third parameter (already present in `cart.controller.js` but unused in catch blocks).

---

#### Fix 9 — Add Entropy Validation to CSRF Token Bootstrap

**File:** `backend/middlewares/csrf.middleware.js` (or the route handler for `/api/v1/csrf-token`)

**Specific Changes:**

1. When an existing `XSRF-TOKEN` cookie is found, validate it meets minimum entropy:
   ```js
   const MIN_TOKEN_LENGTH = 32;
   const existingToken = req.cookies['XSRF-TOKEN'];
   if (existingToken && /^[a-f0-9]{32,}$/i.test(existingToken)) {
       return res.json({ csrfToken: existingToken }); // reuse valid token
   }
   // Otherwise generate a new one
   ```

---

#### Fix 10 — Fix `updateQuantity` to Remove Item at Zero

**File:** `frontend/src/store/useCartStore.ts`

**Function:** `updateQuantity`

**Specific Changes:**

1. Change the map to return `null` when `newQ <= 0`, then filter:
   ```ts
   updateQuantity: (id, delta) => {
       const { cart } = get();
       const newCart = cart
           .map(item => {
               const itemId = item._id || item.id;
               if (itemId === id) {
                   const newQ = item.quantity + delta;
                   return newQ > 0 ? { ...item, quantity: newQ } : null;
               }
               return item;
           })
           .filter(Boolean) as CartItem[];
       set({ cart: newCart });
   },
   ```

---

#### Fix 11 — Fix `handleAddToCart` to Use Single Call

**File:** `frontend/src/pages/ProductDetail.tsx`

**Function:** `handleAddToCart`

**Specific Changes:**

1. Update `addToCart` in `useCartStore.ts` to accept an optional `quantity` parameter:
   ```ts
   addToCart: (product, qty = 1) => {
       // ...existing logic but use qty instead of hardcoded 1
       newCart = [...cart, { ...product, id, quantity: qty }];
       // or if existing: quantity: item.quantity + qty
   }
   ```
2. Replace the loop in `handleAddToCart`:
   ```tsx
   const handleAddToCart = () => {
       const cartItem = { ...product, id: product._id, img: product.images?.[0] || '/placeholder.png' };
       addToCart(cartItem, quantity);
   };
   ```

---

#### Fix 12 — Cancel Previous PaymentIntent on Cart/Coupon Change

**File:** `frontend/src/pages/Checkout.tsx`

**Specific Changes:**

1. Store the current `paymentIntentId` in a `useRef`.
2. In the `useEffect` cleanup (or before creating a new intent), cancel the previous one via a backend endpoint:
   ```ts
   const paymentIntentIdRef = useRef<string | null>(null);

   useEffect(() => {
       if (cart.length === 0) return;
       const timeoutId = setTimeout(async () => {
           // Cancel previous intent if exists
           if (paymentIntentIdRef.current) {
               try {
                   await axiosInstance.post('/orders/cancel-payment-intent', {
                       paymentIntentId: paymentIntentIdRef.current
                   });
               } catch { /* best-effort */ }
           }
           const { data } = await axiosInstance.post('/orders/create-payment-intent', { ... });
           paymentIntentIdRef.current = data.paymentIntentId; // backend must return this
           setClientSecret(data.clientSecret);
       }, 500);
       return () => clearTimeout(timeoutId);
   }, [cart, appliedCoupon]);
   ```
3. Add a `POST /orders/cancel-payment-intent` backend endpoint that calls `stripe.paymentIntents.cancel(id)`.

---

#### Fix 13 — Display Discount Price in `ProductDetail.tsx`

**File:** `frontend/src/pages/ProductDetail.tsx`

**Specific Changes:**

1. Replace the static price display:
   ```tsx
   <div className="flex flex-col items-start gap-1 mb-8">
       {product.discountPrice ? (
           <>
               <p className="text-2xl font-bold">${product.discountPrice.toFixed(2)}</p>
               <p className="text-base line-through opacity-50">${product.price.toFixed(2)}</p>
           </>
       ) : (
           <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
       )}
   </div>
   ```

---

#### Fix 14 — Add Address Validation in `addAddress`

**File:** `backend/controllers/auth.controller.js`

**Function:** `addAddress`

**Specific Changes:**

1. Add length and basic sanitization checks:
   ```js
   const MAX_LEN = 200;
   const sanitize = (str) => str?.replace(/<[^>]*>/g, '').trim();
   
   if (street.length > MAX_LEN || city.length > MAX_LEN || (zipCode && zipCode.length > 20)) {
       return next(new AppError('Address fields exceed maximum allowed length', 400));
   }
   const newAddress = {
       street: sanitize(street),
       city: sanitize(city),
       state: sanitize(state) || 'N/A',
       zipCode: sanitize(zipCode),
       country: sanitize(country) || 'N/A',
       isDefault: isDefault || false
   };
   ```

---

#### Fix 15 — Robust Slug Generation in `createProductService`

**File:** `backend/services/product.service.js`

**Function:** `createProductService` (and `updateProductService` for name-based slug regeneration)

**Specific Changes:**

1. Replace the naive regex with a Unicode-aware slug generator:
   ```js
   function generateSlug(name) {
       return name
           .normalize('NFD')                    // decompose Unicode (e.g., é → e + combining accent)
           .replace(/[\u0300-\u036f]/g, '')     // strip combining diacritics
           .toLowerCase()
           .replace(/[^a-z0-9\s-]/g, '')        // remove non-alphanumeric (except spaces and hyphens)
           .trim()
           .replace(/[\s-]+/g, '-')             // collapse spaces and hyphens to single hyphen
           .replace(/^-+|-+$/g, '');            // trim leading/trailing hyphens
   }
   ```

---

#### Fix 16 — Require `cartTotal` in `applyCoupon`

**File:** `backend/controllers/coupon.controller.js`

**Function:** `applyCoupon`

**Specific Changes:**

1. Change the guard from `if (cartTotal && ...)` to an explicit required check:
   ```js
   if (cartTotal == null) {
       return res.status(400).json({ status: 'error', message: 'cartTotal is required' });
   }
   if (cartTotal < coupon.minOrderValue) {
       return res.status(400).json({ ... });
   }
   ```
2. Replace the local catch block with `next(error)`.

---

#### Fix 17 — Add Field Projection to Auth Middleware

**File:** `backend/middlewares/auth.middleware.js`

**Function:** `protect`

**Specific Changes:**

1. Add `.select()` to the user fetch:
   ```js
   const currentUser = await User.findById(decoded.userId)
       .select('_id name email role isVerified addresses');
   ```
   This excludes the `cart` array (which can be large) and `refreshToken` from every authenticated request.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach:
1. **Exploratory (pre-fix)**: Write tests that demonstrate the bug on unfixed code. These tests are expected to fail and confirm the root cause.
2. **Fix + Preservation Checking (post-fix)**: Verify the fix works for all buggy inputs (Property 1, 3, 5, 7, etc.) and that existing correct behavior is unchanged (Property 2, 4, 6, 8, etc.).

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit and integration tests that exercise each bug condition. Run on UNFIXED code to observe failures.

**Test Cases:**

1. **Stock Race Condition Test** (will fail on unfixed code)
   - Simulate two concurrent `checkoutOrderService` calls for the last unit of a product
   - Assert that `product.stock >= 0` after both complete
   - Expected counterexample: `stock = -1`

2. **N+1 Query Count Test** (will fail on unfixed code)
   - Mock `Product.findById` and count invocations
   - Call `calculateOrderAmountService` with a 3-item cart
   - Assert `findById` was called exactly 1 time
   - Expected counterexample: `findById` called 3 times

3. **Rating Race Condition Test** (will fail on unfixed code)
   - Simulate two concurrent `addReview` calls for the same product
   - Assert `product.ratingsCount === 2` after both complete
   - Expected counterexample: `ratingsCount === 1` (one update overwrites the other)

4. **Duplicate Index Test** (will fail on unfixed code)
   - Inspect `Product` schema index definitions
   - Assert there is exactly 1 text index
   - Expected counterexample: 2 text index definitions found

5. **Add to Cart Loop Test** (will fail on unfixed code)
   - Spy on `addToCart` in `useCartStore`
   - Call `handleAddToCart` with `quantity = 3`
   - Assert `addToCart` was called exactly 1 time
   - Expected counterexample: called 3 times

6. **Discount Price Display Test** (will fail on unfixed code)
   - Render `ProductDetail` with a product having `price = 100`, `discountPrice = 75`
   - Assert the rendered price text is `$75.00`
   - Expected counterexample: renders `$100.00`

7. **Zero Delta Cart Test** (will fail on unfixed code)
   - Initialize cart with one item at quantity 1
   - Call `updateQuantity(id, -1)`
   - Assert cart is empty
   - Expected counterexample: cart still contains the item at quantity 1

8. **Coupon Without cartTotal Test** (will fail on unfixed code)
   - Call `applyCoupon` with `{ code: 'SAVE10' }` (no `cartTotal`)
   - Assert response status is 400
   - Expected counterexample: status 200 with `calculatedDiscount = 0`

9. **Unicode Slug Test** (will fail on unfixed code)
   - Call `createProductService` with `name = "Café Latte"`
   - Assert `product.slug === 'cafe-latte'`
   - Expected counterexample: `slug = 'caf-latte'`

10. **runValidators Test** (will fail on unfixed code)
    - Call `updateProductService` with `{ price: 50, discountPrice: 100 }`
    - Assert the call throws a validation error
    - Expected counterexample: update succeeds, invalid data persisted

**Expected Counterexamples Summary:**
- Stock goes negative under concurrency
- `findById` called N times instead of 1
- Rating count is wrong under concurrent reviews
- Two text index definitions on Product schema
- `addToCart` called multiple times for quantity > 1
- Full price shown instead of discount price
- Cart item not removed when delta reaches zero
- Coupon applied with zero discount when `cartTotal` missing
- Unicode characters not normalized in slug
- Invalid `discountPrice > price` accepted without error

---

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed function produces the expected behavior.

**Pseudocode (general form):**
```
FOR ALL input WHERE isBugCondition_X(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior_X(result)
END FOR
```

**Specific Fix Checks:**

```
// Fix 1: Atomic stock decrement
FOR ALL { concurrentRequests, availableStock, requestedQuantity }
  WHERE isBugCondition_StockRace DO
  results := Promise.all(concurrentRequests.map(r => checkoutOrderService'(r)))
  ASSERT product.stock >= 0
  ASSERT results.filter(r => r.success).length <= floor(availableStock / requestedQuantity)
END FOR

// Fix 3: Batched queries
FOR ALL { cartItems } WHERE isBugCondition_NPlus1 DO
  result := calculateOrderAmountService'({ cartItems })
  ASSERT dbQueryCount(result) = 1
END FOR

// Fix 11: Single addToCart call
FOR ALL { quantity } WHERE isBugCondition_AddToCartLoop DO
  result := handleAddToCart'({ quantity })
  ASSERT addToCartCallCount(result) = 1
  ASSERT cartItemQuantity(result) = quantity
END FOR

// Fix 15: Discount price display
FOR ALL product WHERE isBugCondition_DiscountPrice DO
  rendered := ProductDetail'(product)
  ASSERT displayedPrice(rendered) = product.discountPrice
  ASSERT struckThroughPrice(rendered) = product.price
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where each bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode (general form):**
```
FOR ALL input WHERE NOT isBugCondition_X(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Specific Preservation Checks:**

```
// Preservation 2: Valid checkout unchanged
FOR ALL { userId, checkoutData }
  WHERE NOT isBugCondition_StockRace DO
  ASSERT checkoutOrderService(userId, checkoutData)
       = checkoutOrderService'(userId, checkoutData)
END FOR

// Preservation 4: Order amount calculation unchanged
FOR ALL { cartItems } WHERE cartItems.length = 1 DO
  ASSERT calculateOrderAmountService({ cartItems })
       = calculateOrderAmountService'({ cartItems })
END FOR

// Preservation 12: Positive delta cart update unchanged
FOR ALL { id, delta } WHERE currentQuantity + delta > 0 DO
  ASSERT updateQuantity(id, delta) = updateQuantity'(id, delta)
END FOR

// Preservation 14: Quantity-1 add to cart unchanged
FOR ALL { product } WHERE quantity = 1 DO
  ASSERT handleAddToCart(product, 1) = handleAddToCart'(product, 1)
END FOR

// Preservation 16: Full price display unchanged when no discount
FOR ALL product WHERE product.discountPrice = null DO
  ASSERT ProductDetail(product).displayedPrice
       = ProductDetail'(product).displayedPrice
END FOR
```

**Test Plan**: Observe behavior on UNFIXED code first for non-buggy inputs, then write property-based tests capturing that behavior.

**Preservation Test Cases:**
1. **Valid Checkout Preservation**: Single-user checkout with sufficient stock — verify order created, stock decremented correctly
2. **Order Amount Preservation**: Single-item cart — verify total amount matches `price * quantity`
3. **Cart Positive Delta Preservation**: Increment cart item quantity — verify quantity increases correctly
4. **Add to Cart Quantity-1 Preservation**: Add single item — verify cart opens and item added
5. **Full Price Display Preservation**: Product without `discountPrice` — verify price display unchanged
6. **Valid Coupon Preservation**: Coupon with valid `cartTotal` — verify discount calculated correctly
7. **ASCII Slug Preservation**: Product name with only ASCII — verify slug unchanged
8. **Valid Product Update Preservation**: Update with valid `discountPrice < price` — verify update succeeds

---

### Unit Tests

**Backend:**
- `checkoutOrderService`: test atomic stock decrement with mock concurrent requests; test `bulkWrite` is called instead of loop
- `calculateOrderAmountService`: test single `Product.find` call for multi-item cart; test correct total calculation
- `deleteOrderService`: test `bulkWrite` called for stock restoration; test correct quantity increments
- `addReview`: test aggregation pipeline used for rating; test correct `ratingsAverage` and `ratingsCount`
- `updateProductService`: test validation error thrown for `discountPrice >= price`; test valid update succeeds
- `applyCoupon`: test 400 returned when `cartTotal` missing; test correct discount for valid `cartTotal`
- `createProductService`: test Unicode slug normalization; test consecutive hyphen collapse; test leading/trailing hyphen trim
- `protect` middleware: test `.select()` projection excludes `cart` array; test authentication still works
- Cart/review/coupon controllers: test `next(error)` called on error; test successful responses unchanged

**Frontend:**
- `useCartStore.updateQuantity`: test item removed when delta reaches zero; test positive delta updates quantity
- `useCartStore.addToCart`: test quantity parameter respected; test existing item quantity incremented correctly
- `ProductDetail.handleAddToCart`: test `addToCart` called once for quantity > 1; test correct quantity passed
- `ProductDetail` price display: test `discountPrice` shown when present; test `price` shown when no discount
- `Checkout` PaymentIntent: test previous intent cancelled before new one created

---

### Property-Based Tests

- **Stock atomicity**: Generate random `(concurrentRequests, stock, quantity)` tuples where `isBugCondition_StockRace` holds; assert `stock >= 0` after all requests complete with fixed code
- **Order amount correctness**: Generate random cart arrays (1–20 items, random prices/quantities); assert fixed service returns same total as original for non-buggy inputs
- **Slug generation**: Generate random product names including Unicode, special characters, multiple spaces; assert fixed slug is always lowercase, no consecutive hyphens, no leading/trailing hyphens, no non-ASCII characters
- **Cart quantity invariant**: Generate random sequences of `addToCart` and `updateQuantity` operations; assert cart never contains items with `quantity <= 0` after any operation with fixed code
- **Coupon discount bounds**: Generate random `(cartTotal, coupon)` pairs; assert `discountAmount <= cartTotal` always holds with fixed code
- **Preservation of order amount**: Generate random single-item carts; assert fixed `calculateOrderAmountService` returns identical result to original

---

### Integration Tests

- **Full checkout flow**: Add items to cart → apply coupon → checkout (COD) → verify order created, stock decremented, cart cleared
- **Concurrent checkout**: Simulate two simultaneous checkouts for the last unit → verify only one succeeds, stock = 0
- **Review submission flow**: Submit review → verify `ratingsAverage` and `ratingsCount` updated correctly on product
- **Admin product update**: Update product with valid `discountPrice` → verify saved; update with invalid `discountPrice >= price` → verify rejected
- **Home page product fetch**: Load home page → verify network request includes `limit=8`; verify trending and new arrivals sections populated
- **Cart quantity edge cases**: Add item, reduce to 0 via `-` button → verify item removed from cart
- **Discount price display**: Navigate to product with `discountPrice` → verify discounted price shown with original struck through
- **Coupon without cartTotal**: POST to `/coupons/apply` without `cartTotal` → verify 400 response
- **Unicode product creation**: Create product with Unicode name → verify slug is clean ASCII
- **Auth middleware projection**: Make authenticated request → verify response does not include `cart` array in user object
