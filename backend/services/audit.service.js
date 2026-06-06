import AuditLog from '../models/AuditLog.js';

export const logAuditAction = async ({ admin, action, targetModel, targetId, changes, description, ip, userAgent }) => {
  try {
    await AuditLog.create({ admin, action, targetModel, targetId, changes, description, ip, userAgent });
  } catch (err) {
    console.error('Audit log creation failed (non-blocking):', err.message);
  }
};

export const getAuditLogs = async ({ page = 1, limit = 50, action, targetModel, admin }) => {
  const query = {};
  if (action) query.action = action;
  if (targetModel) query.targetModel = targetModel;
  if (admin) query.admin = admin;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('admin', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
};
