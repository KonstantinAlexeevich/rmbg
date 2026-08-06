import { useEffect, useRef } from 'react';
import { useStudioStore } from '../state/store';
import { setVisibleIds } from '../state/orchestrator';
import { ItemCard } from './ItemCard';

export function Grid() {
  const allItems = useStudioStore((s) => s.items);
  const items = allItems.filter((i) => !i.ephemeral);
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
      className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 p-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-3 sm:p-4 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]"
    >
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
