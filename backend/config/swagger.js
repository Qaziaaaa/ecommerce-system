import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Nova E-Commerce API',
    version: '1.0.0',
    description: 'Production-grade e-commerce API with authentication, product management, cart, orders, payments, and admin dashboard.',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 (relative path)',
    },
    {
      url: 'http://localhost:5001/api/v1',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from /auth/login',
      },
      CSRFToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-XSRF-Token',
        description: 'CSRF token obtained from GET /csrf-token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Something went wrong' },
          code: { type: 'integer', example: 400 },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          addresses: {
            type: 'array',
            items: { $ref: '#/components/schemas/Address' },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Address: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zip: { type: 'string' },
          country: { type: 'string' },
          isDefault: { type: 'boolean' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          category: { type: 'string' },
          brand: { type: 'string' },
          stock: { type: 'integer' },
          images: {
            type: 'array',
            items: { type: 'object', properties: { url: { type: 'string' }, alt: { type: 'string' } } },
          },
          ratings: {
            type: 'object',
            properties: { average: { type: 'number' }, count: { type: 'integer' } },
          },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
                quantity: { type: 'integer' },
                image: { type: 'string' },
              },
            },
          },
          shippingAddress: { $ref: '#/components/schemas/Address' },
          paymentMethod: { type: 'string', enum: ['card', 'cod'] },
          paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
          orderStatus: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
          subtotal: { type: 'number' },
          shipping: { type: 'number' },
          discount: { type: 'number' },
          total: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product: { type: 'string' },
                quantity: { type: 'integer' },
                price: { type: 'number' },
              },
            },
          },
          total: { type: 'number' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      Coupon: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          code: { type: 'string' },
          discountPercent: { type: 'number' },
          maxUses: { type: 'integer' },
          currentUses: { type: 'integer' },
          expiresAt: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean' },
        },
      },
    },
  },
  paths: {},
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
