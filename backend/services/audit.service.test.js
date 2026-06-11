import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/AuditLog.js', () => ({ default: { create: vi.fn(), find: vi.fn(), countDocuments: vi.fn() } }));

let auditService, AuditLog;

beforeEach(async () => {
  vi.clearAllMocks();
  AuditLog = (await import('../models/AuditLog.js')).default;
  auditService = await import('./audit.service.js');
});

describe('logAuditAction', () => {
  it('creates an audit log entry', async () => {
    AuditLog.create.mockResolvedValue({});
    const entry = { admin: 'a1', action: 'USER_ROLE_CHANGED', targetModel: 'User', targetId: 'u1' };
    await auditService.logAuditAction(entry);
    expect(AuditLog.create).toHaveBeenCalledWith(entry);
  });

  it('does not throw on failure (non-blocking)', async () => {
    AuditLog.create.mockRejectedValue(new Error('DB error'));
    const entry = { admin: 'a1', action: 'TEST' };
    await expect(auditService.logAuditAction(entry)).resolves.toBeUndefined();
  });
});

describe('getAuditLogs', () => {
  it('returns paginated logs', async () => {
    const logs = [{ _id: 'log1', admin: 'a1' }];
    const populateFn = vi.fn().mockReturnThis();
    const sortFn = vi.fn().mockReturnThis();
    const skipFn = vi.fn().mockReturnThis();
    const limitFn = vi.fn().mockReturnThis();
    const leanFn = vi.fn().mockResolvedValue(logs);
    AuditLog.find.mockReturnValue({ populate: populateFn, sort: sortFn, skip: skipFn, limit: limitFn, lean: leanFn });
    AuditLog.countDocuments.mockResolvedValue(1);

    const result = await auditService.getAuditLogs({ page: 1, limit: 50 });
    expect(result.logs).toEqual(logs);
    expect(result.total).toBe(1);
  });

  it('filters by action', async () => {
    const findObj = {};
    AuditLog.find.mockImplementation((q) => {
      Object.assign(findObj, q);
      return { populate: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) };
    });
    AuditLog.countDocuments.mockResolvedValue(0);

    await auditService.getAuditLogs({ action: 'USER_ROLE_CHANGED' });
    expect(findObj.action).toBe('USER_ROLE_CHANGED');
  });
});
