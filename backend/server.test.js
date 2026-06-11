import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

const { mockAppListen, mockMongooseConnect, mockMongoose } = vi.hoisted(() => {
  const listen = vi.fn((port, cb) => { if (cb) setTimeout(cb, 0); return { close: vi.fn() }; });
  const connect = vi.fn().mockResolvedValue();
  class MockSchema {
    constructor(def, opts) { this.paths = {}; this.options = opts || {}; }
    pre() { return this; }
    post() { return this; }
    index() { return this; }
    virtual() { return this; }
    methods() { return this; }
    static() { return this; }
    add() { return this; }
    eachPath() { return this; }
    path() { return this; }
    remove() { return this; }
    plugin() { return this; }
    set() { return this; }
  }
  MockSchema.ObjectId = 'ObjectId';
  MockSchema.Types = { Mixed: 'Mixed' };
  return {
    mockAppListen: listen,
    mockMongooseConnect: connect,
    mockMongoose: {
      Schema: MockSchema,
      SchemaType: class {},
      connect,
      connection: { on: vi.fn(), close: vi.fn() },
      model: vi.fn(() => ({})),
      Types: { ObjectId: 'ObjectId', Mixed: 'Mixed' },
    },
  };
});

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('./utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('./app.js', () => ({ default: { listen: mockAppListen } }));
vi.mock('mongoose', () => ({ default: mockMongoose }));
vi.mock('./utils/database-performance.js', () => ({}));
vi.mock('./services/performance.service.js', () => ({ default: {} }));
vi.mock('./services/alerting.service.js', () => ({ default: {} }));
vi.mock('./services/cache.service.js', () => ({ default: { warmCache: vi.fn().mockResolvedValue() } }));
vi.mock('./services/deployment.service.js', () => ({ default: {} }));
vi.mock('dns', () => ({ default: { setServers: vi.fn(), setDefaultResultOrder: vi.fn() } }));
vi.mock('./config/env.js', () => ({ validateEnv: vi.fn() }));

const originalExit = process.exit;
beforeAll(() => {
  process.exit = vi.fn();
});

afterAll(() => {
  process.exit = originalExit;
});

describe('Server', () => {
  it('should connect to MongoDB and call app.listen on startup', async () => {
    mockMongooseConnect.mockResolvedValue();
    mockAppListen.mockImplementation((port, cb) => { if (cb) setTimeout(cb, 0); return { close: vi.fn() }; });

    await import('./server.js');

    await vi.waitFor(() => {
      expect(mockMongooseConnect).toHaveBeenCalled();
    }, { timeout: 2000 });

    await vi.waitFor(() => {
      expect(mockAppListen).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
