import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import VirtualList from './VirtualList';

describe('VirtualList', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i, label: `Item ${i}` }));
  const renderItem = (item: { id: number; label: string }) => <div data-testid={`item-${item.id}`}>{item.label}</div>;

  it('renders all items when count below threshold', () => {
    const smallItems = Array.from({ length: 10 }, (_, i) => ({ id: i, label: `Small ${i}` }));
    render(
      <VirtualList items={smallItems} itemHeight={50} containerHeight={400} renderItem={({ id, label }) => <div key={id}>{label}</div>} />
    );
    expect(screen.getByText('Small 0')).toBeInTheDocument();
    expect(screen.getByText('Small 9')).toBeInTheDocument();
  });

  it('renders only visible items when count above threshold', () => {
    render(
      <VirtualList items={items} itemHeight={50} containerHeight={200} renderItem={renderItem} />
    );
    const rendered = screen.queryAllByTestId(/^item-/);
    expect(rendered.length).toBeLessThan(items.length);
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
  });

  it('applies className to container', () => {
    const { container } = render(
      <VirtualList items={items.slice(0, 5)} itemHeight={50} containerHeight={200} className="test-class" renderItem={renderItem} />
    );
    const outer = container.firstElementChild;
    expect(outer?.classList.contains('test-class')).toBe(true);
  });

  it('has overflow-auto style for scrollable container', () => {
    const { container } = render(
      <VirtualList items={Array.from({ length: 100 }, (_, i) => ({ id: i }))} itemHeight={50} containerHeight={200} renderItem={({ id }) => <div key={id}>x</div>} />
    );
    const scrollContainer = container.firstElementChild;
    expect(scrollContainer?.classList.contains('overflow-auto')).toBe(true);
    expect((scrollContainer as HTMLElement).style.height).toBe('200px');
  });
});
