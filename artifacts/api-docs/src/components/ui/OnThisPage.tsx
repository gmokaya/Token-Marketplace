import { useEffect, useState } from 'react';

export function OnThisPage({ items }: { items: { id: string; title: string }[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <div className="fixed top-12 right-8 w-64 hidden xl:block">
      <h4 className="text-sm font-semibold mb-4 text-foreground">On this page</h4>
      <ul className="space-y-2.5 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`transition-colors hover:text-primary ${
                activeId === item.id ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
