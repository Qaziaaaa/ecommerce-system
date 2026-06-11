import React, { useState, useRef, useEffect, useCallback } from 'react';
import { isCloudinaryUrl, getOptimizedImageUrl, generateSrcSet } from '../utils/imageOptimization';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: 'blur' | 'skeleton' | 'none';
  rootMargin?: string;
  threshold?: number;
  width?: number | string;
  height?: number | string;
  /** Display width in CSS pixels — used for Cloudinary optimization */
  displayWidth?: number;
  onLoad?: () => void;
  onError?: () => void;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  style?: React.CSSProperties;
}

/**
 * LazyImage component with intersection observer, skeleton placeholder,
 * and blur-up effect for smooth loading experience.
 * Requirements: 1.6 - lazy loading for images below the fold
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'skeleton',
  rootMargin = '200px',
  threshold = 0.01,
  width,
  height,
  displayWidth,
  onLoad,
  onError,
  referrerPolicy = 'no-referrer',
  decoding = 'async',
  fetchPriority = 'auto',
  style,
}) => {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    },
    []
  );

  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    // Use native lazy loading as fallback for browsers without IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, rootMargin, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width,
    height,
    ...style,
  };

  return (
    <div ref={imgRef} style={containerStyle} className={!className.includes('absolute') ? '' : undefined}>
      {/* Skeleton / blur placeholder shown while not loaded */}
      {!isLoaded && placeholder !== 'none' && (
        <div
          aria-hidden="true"
          className={
            placeholder === 'skeleton'
              ? 'absolute inset-0 bg-gray-200 animate-pulse'
              : 'absolute inset-0 bg-gray-100 backdrop-blur-sm'
          }
        />
      )}

      {/* Actual image — only rendered once in viewport */}
      {isInView && !hasError && (
        <img
          src={isCloudinaryUrl(src) && displayWidth
            ? getOptimizedImageUrl(src, displayWidth)
            : src}
          srcSet={isCloudinaryUrl(src) ? generateSrcSet(src) : undefined}
          sizes={isCloudinaryUrl(src) ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' : undefined}
          alt={alt}
          className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
          referrerPolicy={referrerPolicy}
          decoding={decoding}
          fetchPriority={fetchPriority}
          width={width}
          height={height}
          style={style}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
          Image unavailable
        </div>
      )}
    </div>
  );
};

export default LazyImage;
