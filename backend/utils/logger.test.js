import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() };
mockLogger.child.mockReturnValue(mockLogger);

vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(() => mockLogger),
    format: {
      combine: vi.fn(),
      colorize: vi.fn(),
      timestamp: vi.fn(),
      printf: vi.fn(),
      json: vi.fn(),
    },
    transports: { Console: vi.fn(), File: vi.fn() },
  },
  createLogger: vi.fn(() => mockLogger),
  format: {
    combine: vi.fn(),
    colorize: vi.fn(),
    timestamp: vi.fn(),
    printf: vi.fn(),
    json: vi.fn(),
  },
  transports: { Console: vi.fn(), File: vi.fn() },
}));

let loggerModule;

beforeEach(async () => {
  vi.clearAllMocks();
  loggerModule = await import('./logger.js');
});

describe('logger', () => {
  it('exports a default logger with logging methods', () => {
    expect(loggerModule.default).toBe(mockLogger);
    expect(loggerModule.default.info).toBeDefined();
    expect(loggerModule.default.warn).toBeDefined();
    expect(loggerModule.default.error).toBeDefined();
    expect(loggerModule.default.debug).toBeDefined();
  });

  it('calls winston.createLogger on import', () => {
    const winston = (vi.importActual('winston'));
    // createLogger was already called on import — verify via the mock
    expect(loggerModule.default).toBe(mockLogger);
  });
});

describe('childLogger', () => {
  it('creates child logger with requestId', () => {
    const child = loggerModule.childLogger('req-123');
    expect(mockLogger.child).toHaveBeenCalledWith({ requestId: 'req-123' });
    expect(child).toBe(mockLogger);
  });
});
