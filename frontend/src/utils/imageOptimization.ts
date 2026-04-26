/**
 * Image optimization utilities for Cloudinary CDN.
 * Generates device-optimized URLs with automatic format selection,
 * responsive sizing, and quality optimization.
 *
 * Requirements: 8.2 — Property 32: Image Optimization by Device
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'thumb';
  gravity?: 'auto' | 'face' | 'center';
  dpr?: number; // Device pixel ratio
}

export interface ResponsiveImageSet {
  src: string;
  srcSet: string;
  sizes: string;
}

// Cloudinary cloud name from env
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

// Breakpoints for responsive images
const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536];

/**
 * Check if a URL is a Cloudinary URL.
 */
export const isCloudinaryUrl = (url: string): boolean => {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
};

/**
 * Extract the public ID from a Cloudinary URL.
 */
export const extractPublicId = (url: string): string | null => {
  if (!isCloudinaryUrl(url)) return null;
  // Match: /upload/[transformations/]v[version]/[public_id].[ext]
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
  return match ? match[1] : null;
};

/**
 * Build a Cloudinary transformation URL.
 * Requirements: 8.2 — device-based image format and size optimization
 *
 * @param url - Original Cloudinary URL or public ID
 * @param options - Transformation options
 */
export const buildCloudinaryUrl = (url: string, options: ImageOptimizationOptions = {}): string => {
  if (!isCloudinaryUrl(url)) return url; // Return as-is for non-Cloudinary URLs

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
    gravity = 'auto',
    dpr,
  } = options;

  // Build transformation string
  const transforms: string[] = [];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  if (gravity && (crop === 'fill' || crop === 'thumb')) transforms.push(`g_${gravity}`);
  if (quality) transforms.push(`q_${quality}`);
  if (format) transforms.push(`f_${format}`);
  if (dpr) transforms.push(`dpr_${dpr}`);

  if (transforms.length === 0) return url;

  const transformStr = transforms.join(',');

  // Insert transformation after /upload/
  return url.replace('/upload/', `/upload/${transformStr}/`);
};

/**
 * Get device-appropriate image URL based on viewport width.
 * Requirements: 8.2
 *
 * @param url - Cloudinary image URL
 * @param containerWidth - Target display width in CSS pixels
 * @param devicePixelRatio - Screen DPR (default: window.devicePixelRatio)
 */
export const getOptimizedImageUrl = (
  url: string,
  containerWidth: number,
  devicePixelRatio?: number
): string => {
  if (!isCloudinaryUrl(url)) return url;

  const dpr = devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  const physicalWidth = Math.round(containerWidth * dpr);

  // Round up to nearest breakpoint to maximize cache hits
  const targetWidth = RESPONSIVE_WIDTHS.find((w) => w >= physicalWidth) || RESPONSIVE_WIDTHS[RESPONSIVE_WIDTHS.length - 1];

  return buildCloudinaryUrl(url, {
    width: targetWidth,
    quality: 'auto',
    format: 'auto', // Cloudinary auto-selects WebP/AVIF based on browser support
    crop: 'limit',
  });
};

/**
 * Generate a responsive srcSet for a Cloudinary image.
 * Requirements: 8.2
 *
 * @param url - Cloudinary image URL
 * @param widths - Array of widths to generate (defaults to RESPONSIVE_WIDTHS)
 */
export const generateSrcSet = (url: string, widths: number[] = RESPONSIVE_WIDTHS): string => {
  if (!isCloudinaryUrl(url)) return '';

  return widths
    .map((w) => {
      const optimizedUrl = buildCloudinaryUrl(url, {
        width: w,
        quality: 'auto',
        format: 'auto',
        crop: 'limit',
      });
      return `${optimizedUrl} ${w}w`;
    })
    .join(', ');
};

/**
 * Generate a complete responsive image set (src + srcSet + sizes).
 * Requirements: 8.2
 *
 * @param url - Cloudinary image URL
 * @param sizes - CSS sizes attribute (e.g. "(max-width: 768px) 100vw, 50vw")
 */
export const getResponsiveImageSet = (
  url: string,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
): ResponsiveImageSet => {
  const src = buildCloudinaryUrl(url, { width: 800, quality: 'auto', format: 'auto' });
  const srcSet = generateSrcSet(url);

  return { src, srcSet, sizes };
};

/**
 * Get a thumbnail URL for product images.
 */
export const getThumbnailUrl = (url: string, size = 200): string => {
  return buildCloudinaryUrl(url, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:eco',
    format: 'auto',
  });
};

/**
 * Get a blur placeholder (tiny low-quality image for blur-up effect).
 */
export const getBlurPlaceholder = (url: string): string => {
  return buildCloudinaryUrl(url, {
    width: 20,
    quality: 10,
    format: 'auto',
    crop: 'scale',
  });
};
