import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  /** Full array of items to render */
  items: T[];
  /** Height of each item in pixels (must be fixed) */
  itemHeight: number;
  /** Height of the scrollable container in pixels */
  containerHeight: number;
  /** Number of extra items to render above/below the visible area */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Optional className for the outer container */
  className?: string;
  /** Threshold: only activate virtual scrolling above this count (default: 50) */
  threshold?: number;
}

/**
 * VirtualList — renders only the visible items in a large list,
 * dramatically reducing DOM nodes for long lists.
 *
 * Requirements: 8.7 — Property 34: Virtual Scrolling for Large Lists
 *
 * Falls back to normal rendering when item count is below threshold.
 */
function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  renderItem,
  className = '',
  threshold = 50,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // If below threshold, render all items normally
  if (items.length < threshold) {
    return (
      <div className={className}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  const totalHeight = items.length * itemHeight;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items positioned absolutely */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;

/**
 * useVirtualScroll hook — for cases where you need more control
 * over the virtual scrolling logic.
 */
export const useVirtualScroll = <T,>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount);

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1).map((item, i) => ({
      item,
      index: startIndex + i,
      offsetY: (startIndex + i) * itemHeight,
    })),
    [items, startIndex, endIndex, itemHeight]
  );

  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    startIndex,
    endIndex,
  };
};
