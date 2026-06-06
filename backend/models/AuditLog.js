import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Audit log must have an admin'],
  },
  action: {
    type: String,
    required: [true, 'Audit log must have an action'],
    enum: [
      'USER_ROLE_CHANGED',
      'PRODUCT_CREATED',
      'PRODUCT_UPDATED',
      'PRODUCT_DELETED',
      'ORDER_STATUS_CHANGED',
      'CATEGORY_CREATED',
      'COUPON_CREATED',
      'COUPON_UPDATED',
      'COUPON_DELETED',
    ],
  },
  targetModel: {
    type: String,
    required: [true, 'Audit log must have a target model'],
    enum: ['User', 'Product', 'Order', 'Category', 'Coupon'],
  },
  targetId: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Audit log must have a target ID'],
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  description: {
    type: String,
    required: [true, 'Audit log must have a description'],
  },
  ip: String,
  userAgent: String,
}, {
  timestamps: true,
});

auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ action: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
