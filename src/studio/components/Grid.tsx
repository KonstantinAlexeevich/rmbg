import { useEffect, useRef } from 'react';
import { useStudioStore } from '../state/store';
import { setVisibleIds } from '../state/orchestrator';
import { ItemCard } from './ItemCard';

export function Grid() {
  const items = useStudioStore((s) => s.items);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(new Set<string>());

  // видимые карточки перекомпозируются первыми
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset['itemId'];
          if (id === undefined) continue;
          if (entry.isIntersecting) visibleRef.current.add(id);
          else visibleRef.current.delete(id);
        }
        setVisibleIds(new Set(visibleRef.current));
      },
      { root: container.closest('main') },
    );
    for (const card of container.querySelectorAll('[data-item-id]')) {
      observer.observe(card);
    }
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 p-4"
    >
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
