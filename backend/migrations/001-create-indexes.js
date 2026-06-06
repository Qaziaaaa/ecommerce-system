export async function up(db) {
  await db.collection('products').createIndex({ name: 'text', description: 'text', brand: 'text' });
  await db.collection('products').createIndex({ category: 1 });
  await db.collection('products').createIndex({ slug: 1 }, { unique: true });
  await db.collection('products').createIndex({ isActive: 1, createdAt: -1 });

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1 });

  await db.collection('orders').createIndex({ user: 1, createdAt: -1 });
  await db.collection('orders').createIndex({ orderStatus: 1 });
  await db.collection('orders').createIndex({ paymentStatus: 1 });

  await db.collection('categories').createIndex({ slug: 1 }, { unique: true });

  await db.collection('coupons').createIndex({ code: 1 }, { unique: true });

  await db.collection('otps').createIndex({ email: 1 });
  await db.collection('otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

export async function down(db) {
  await db.collection('products').dropIndex('name_text_description_text_brand_text');
  await db.collection('products').dropIndex('category_1');
  await db.collection('products').dropIndex('slug_1');
  await db.collection('products').dropIndex('isActive_1_createdAt_-1');

  await db.collection('users').dropIndex('email_1');
  await db.collection('users').dropIndex('role_1');

  await db.collection('orders').dropIndex('user_1_createdAt_-1');
  await db.collection('orders').dropIndex('orderStatus_1');
  await db.collection('orders').dropIndex('paymentStatus_1');

  await db.collection('categories').dropIndex('slug_1');

  await db.collection('coupons').dropIndex('code_1');

  await db.collection('otps').dropIndex('email_1');
  await db.collection('otps').dropIndex('expiresAt_1');
}
