import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Product.js', () => ({ default: { find: vi.fn(), create: vi.fn(), findOne: vi.fn(), findByIdAndUpdate: vi.fn(), findByIdAndDelete: vi.fn(), countDocuments: vi.fn() } }));
vi.mock('../models/Category.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('./pagination.service.js', () => ({
  parsePaginationParams: vi.fn(() => ({ page: 1, limit: 10, skip: 0 })),
  buildPaginationMeta: vi.fn(() => ({ currentPage: 1, totalPages: 1, total: 1, limit: 10 })),
}));

let productService, Product, Category, pagination;

beforeEach(async () => {
  vi.clearAllMocks();
  Product = (await import('../models/Product.js')).default;
  Category = (await import('../models/Category.js')).default;
  pagination = await import('./pagination.service.js');
  productService = await import('./product.service.js');
});

function makeProduct(overrides = {}) {
  return { _id: 'p1', name: 'Test Product', price: 50, slug: 'test-product', images: [{ url: '/img.jpg' }], brand: 'Test', ...overrides };
}

describe('searchProductsTypeahead', () => {
  it('returns empty array for short search term', async () => {
    const result = await productService.searchProductsTypeahead('a');
    expect(result).toEqual([]);
  });

  it('returns products for valid search', async () => {
    const product = makeProduct();
    Product.find.mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([product]),
          }),
        }),
      }),
    });
    const result = await productService.searchProductsTypeahead('test');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Product');
  });
});

describe('createProductService', () => {
  it('creates product with provided data', async () => {
    const data = { name: 'New', price: 100, description: 'Desc', category: 'cat1' };
    Product.create.mockResolvedValue(makeProduct({ name: 'New', price: 100, slug: 'new' }));
    const result = await productService.createProductService(data);
    expect(Product.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'New', price: 100 }));
    expect(result.name).toBe('New');
  });

  it('generates slug if not provided', async () => {
    const data = { name: 'My Cool Product!', price: 100 };
    Product.create.mockResolvedValue(makeProduct({ ...data, slug: 'my-cool-product' }));
    await productService.createProductService(data);
    expect(Product.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'my-cool-product' }));
  });
});

describe('getAllProductsService', () => {
  it('returns products with pagination', async () => {
    const products = [makeProduct()];
    const query = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      find: vi.fn().mockReturnThis(),
    };
    Product.find.mockReturnValue(query);
    Product.countDocuments.mockResolvedValue(1);
    query.populate.mockResolvedValue(products);

    const result = await productService.getAllProductsService({}, { role: 'user' });
    expect(result.products).toEqual(products);
    expect(result.pagination).toBeDefined();
  });

  it('filters by category slug', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      find: vi.fn().mockReturnThis(),
    };
    Product.find.mockReturnValue(query);
    Product.countDocuments.mockResolvedValue(0);
    query.populate.mockResolvedValue([]);
    Category.findOne.mockResolvedValue({ _id: 'cat1' });

    await productService.getAllProductsService({ category: 'shoes' }, { role: 'user' });
    expect(Category.findOne).toHaveBeenCalledWith({ slug: 'shoes' });
  });

  it('isActive: true for non-admin users', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      find: vi.fn().mockReturnThis(),
    };
    Product.find.mockReturnValue(query);
    Product.countDocuments.mockResolvedValue(0);
    query.populate.mockResolvedValue([]);

    await productService.getAllProductsService({}, { role: 'user' });
    expect(Product.find).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
  });
});

describe('getProductByIdService', () => {
  it('returns product by id for admin', async () => {
    const product = makeProduct();
    Product.findOne.mockReturnValue({ populate: vi.fn().mockResolvedValue(product) });
    const result = await productService.getProductByIdService('p1', { role: 'admin' });
    expect(result).toEqual(product);
  });

  it('restricts to active for non-admin', async () => {
    Product.findOne.mockReturnValue({ populate: vi.fn().mockResolvedValue(null) });
    await productService.getProductByIdService('p1', { role: 'user' });
    expect(Product.findOne).toHaveBeenCalledWith({ _id: 'p1', isActive: true });
  });
});

describe('updateProductService', () => {
  it('updates product and returns updated doc', async () => {
    const updated = makeProduct({ name: 'Updated' });
    Product.findByIdAndUpdate.mockResolvedValue(updated);
    const result = await productService.updateProductService('p1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('generates slug when name changes', async () => {
    Product.findByIdAndUpdate.mockResolvedValue(makeProduct({ name: 'New Name', slug: 'new-name' }));
    await productService.updateProductService('p1', { name: 'New Name' });
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('p1', { name: 'New Name', slug: 'new-name' }, expect.any(Object));
  });

  it('normalizes image field to images array', async () => {
    Product.findByIdAndUpdate.mockResolvedValue(makeProduct());
    await productService.updateProductService('p1', { image: '/img.jpg' });
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('p1', { images: ['/img.jpg'] }, expect.any(Object));
  });
});

describe('deleteProductService', () => {
  it('deletes product by id', async () => {
    Product.findByIdAndDelete.mockResolvedValue(makeProduct());
    const result = await productService.deleteProductService('p1');
    expect(Product.findByIdAndDelete).toHaveBeenCalledWith('p1');
    expect(result._id).toBe('p1');
  });
});
