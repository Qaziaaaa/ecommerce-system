import { describe, it, expect, vi, beforeEach } from 'vitest';

const swaggerJsdoc = vi.fn((options) => ({ openapi: '3.0.0', info: {}, paths: {}, components: options.swaggerDefinition.components }));
vi.mock('swagger-jsdoc', () => ({ default: swaggerJsdoc }));

beforeEach(() => {
  vi.clearAllMocks();
});

it('creates swagger spec with correct definition', async () => {
  const spec = (await import('./swagger.js')).default;
  expect(swaggerJsdoc).toHaveBeenCalled();
  const options = swaggerJsdoc.mock.calls[0][0];
  expect(options.swaggerDefinition.openapi).toBe('3.0.0');
  expect(options.swaggerDefinition.info.title).toBe('Nova E-Commerce API');
  expect(options.apis).toContain('./routes/*.js');
  expect(spec.openapi).toBe('3.0.0');
});

it('includes BearerAuth security scheme', async () => {
  const spec = (await import('./swagger.js')).default;
  const schemes = spec.components.securitySchemes;
  expect(schemes.BearerAuth).toBeDefined();
  expect(schemes.BearerAuth.scheme).toBe('bearer');
});
