import { describe, it, expect } from 'vitest';
import {
  isCloudinaryUrl,
  extractPublicId,
  buildCloudinaryUrl,
  getOptimizedImageUrl,
  generateSrcSet,
  getResponsiveImageSet,
  getThumbnailUrl,
  getBlurPlaceholder,
} from '../utils/imageOptimization';

const CLOUDINARY_URL = 'https://res.cloudinary.com/demo/image/upload/v123456/product.jpg';
const NON_CLOUDINARY_URL = 'https://example.com/image.jpg';

describe('isCloudinaryUrl', () => {
  it('returns true for res.cloudinary.com URLs', () => {
    expect(isCloudinaryUrl(CLOUDINARY_URL)).toBe(true);
  });

  it('returns true for cloudinary.com URLs', () => {
    expect(isCloudinaryUrl('https://cloudinary.com/demo/image/upload/v1/test.jpg')).toBe(true);
  });

  it('returns false for non-Cloudinary URLs', () => {
    expect(isCloudinaryUrl(NON_CLOUDINARY_URL)).toBe(false);
  });
});

describe('extractPublicId', () => {
  it('extracts public ID from Cloudinary URL', () => {
    expect(extractPublicId(CLOUDINARY_URL)).toBe('product');
  });

  it('returns null for non-Cloudinary URL', () => {
    expect(extractPublicId(NON_CLOUDINARY_URL)).toBeNull();
  });
});

describe('buildCloudinaryUrl', () => {
  it('returns URL unchanged for non-Cloudinary URLs', () => {
    expect(buildCloudinaryUrl(NON_CLOUDINARY_URL, { width: 200 })).toBe(NON_CLOUDINARY_URL);
  });

  it('adds default transformations when no options provided', () => {
    const result = buildCloudinaryUrl(CLOUDINARY_URL);
    expect(result).toContain('c_limit');
    expect(result).toContain('q_auto');
    expect(result).toContain('f_auto');
  });

  it('adds width transformation', () => {
    const result = buildCloudinaryUrl(CLOUDINARY_URL, { width: 400 });
    expect(result).toContain('w_400');
    expect(result).toContain('c_limit');
  });

  it('adds quality transformation', () => {
    const result = buildCloudinaryUrl(CLOUDINARY_URL, { width: 200, quality: 'auto' });
    expect(result).toContain('q_auto');
  });

  it('adds format transformation', () => {
    const result = buildCloudinaryUrl(CLOUDINARY_URL, { width: 200, format: 'webp' });
    expect(result).toContain('f_webp');
  });

  it('adds dpr transformation', () => {
    const result = buildCloudinaryUrl(CLOUDINARY_URL, { width: 200, dpr: 2 });
    expect(result).toContain('dpr_2');
  });

  it('combines multiple transformations', () => {
    const result = buildCloudinaryUrl(CLOUDINARY_URL, { width: 300, height: 300, crop: 'fill', gravity: 'auto', quality: 'auto:best', format: 'avif' });
    expect(result).toContain('w_300,h_300,c_fill,g_auto,q_auto:best,f_avif');
  });
});

describe('getOptimizedImageUrl', () => {
  it('returns URL unchanged for non-Cloudinary URLs', () => {
    expect(getOptimizedImageUrl(NON_CLOUDINARY_URL, 800)).toBe(NON_CLOUDINARY_URL);
  });

  it('generates optimized URL with width matching container', () => {
    const result = getOptimizedImageUrl(CLOUDINARY_URL, 640);
    expect(result).toContain('w_640');
  });

  it('rounds up width to nearest breakpoint', () => {
    const result = getOptimizedImageUrl(CLOUDINARY_URL, 700);
    expect(result).toContain('w_768');
  });

  it('uses maximum breakpoint for very large widths', () => {
    const result = getOptimizedImageUrl(CLOUDINARY_URL, 2000);
    expect(result).toContain('w_1536');
  });
});

describe('generateSrcSet', () => {
  it('returns empty string for non-Cloudinary URLs', () => {
    expect(generateSrcSet(NON_CLOUDINARY_URL)).toBe('');
  });

  it('generates srcSet with multiple widths', () => {
    const result = generateSrcSet(CLOUDINARY_URL, [200, 400, 600]);
    expect(result).toContain('200w');
    expect(result).toContain('400w');
    expect(result).toContain('600w');
  });

  it('uses default widths when not provided', () => {
    const result = generateSrcSet(CLOUDINARY_URL);
    expect(result).toContain('320w');
    expect(result).toContain('1536w');
  });
});

describe('getResponsiveImageSet', () => {
  it('returns src, srcSet, and sizes', () => {
    const result = getResponsiveImageSet(CLOUDINARY_URL);
    expect(result.src).toContain('w_800');
    expect(result.srcSet).toContain('320w');
    expect(result.sizes).toContain('100vw');
  });

  it('uses custom sizes when provided', () => {
    const result = getResponsiveImageSet(CLOUDINARY_URL, '50vw');
    expect(result.sizes).toBe('50vw');
  });
});

describe('getThumbnailUrl', () => {
  it('generates thumbnail URL with default size', () => {
    const result = getThumbnailUrl(CLOUDINARY_URL);
    expect(result).toContain('w_200');
    expect(result).toContain('h_200');
    expect(result).toContain('c_fill');
    expect(result).toContain('g_auto');
  });

  it('generates thumbnail URL with custom size', () => {
    const result = getThumbnailUrl(CLOUDINARY_URL, 100);
    expect(result).toContain('w_100');
    expect(result).toContain('h_100');
  });
});

describe('getBlurPlaceholder', () => {
  it('generates tiny blur placeholder URL', () => {
    const result = getBlurPlaceholder(CLOUDINARY_URL);
    expect(result).toContain('w_20');
    expect(result).toContain('q_10');
    expect(result).toContain('c_scale');
  });
});
