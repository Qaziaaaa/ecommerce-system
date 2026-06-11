import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Category.js', () => ({ default: { find: vi.fn(), create: vi.fn() } }));

let categoryService, Category;

beforeEach(async () => {
  vi.clearAllMocks();
  Category = (await import('../models/Category.js')).default;
  categoryService = await import('./category.service.js');
});

describe('getAllCategoriesService', () => {
  it('returns active categories sorted by name', async () => {
    const cats = [{ name: 'A' }, { name: 'B' }];
    Category.find.mockReturnValue({ sort: vi.fn().mockResolvedValue(cats) });
    const result = await categoryService.getAllCategoriesService();
    expect(result).toEqual(cats);
    expect(Category.find).toHaveBeenCalledWith({ isActive: true });
  });
});

describe('createCategoryService', () => {
  it('creates category with provided data', async () => {
    const data = { name: 'Electronics' };
    Category.create.mockResolvedValue({ _id: 'c1', name: 'Electronics', slug: 'electronics' });
    const result = await categoryService.createCategoryService(data);
    expect(Category.create).toHaveBeenCalledWith(data);
    expect(result.name).toBe('Electronics');
  });

  it('generates slug from name if slug not provided', async () => {
    const data = { name: 'Home & Garden!' };
    Category.create.mockResolvedValue({ name: 'Home & Garden!', slug: 'home--garden' });
    await categoryService.createCategoryService(data);
    expect(Category.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'home--garden' }));
  });

  it('does not overwrite provided slug', async () => {
    const data = { name: 'Electronics', slug: 'custom-slug' };
    Category.create.mockResolvedValue({ name: 'Electronics', slug: 'custom-slug' });
    await categoryService.createCategoryService(data);
    expect(Category.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'custom-slug' }));
  });
});
