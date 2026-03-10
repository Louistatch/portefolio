import { useState, useEffect } from "react";
import { List } from "lucide-react";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({ content }: { content: string }) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    // Parse markdown headings
    const lines = content.split("\n");
    const items: TOCItem[] = [];
    lines.forEach((line, i) => {
      const match = line.match(/^(#{2,3})\s+(.+)/);
      if (match) {
        const id = `heading-${i}`;
        items.push({ id, text: match[2].trim(), level: match[1].length });
      }
    });
    setHeadings(items);
  }, [content]);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav className="hidden xl:block fixed right-8 top-32 w-56 max-h-[60vh] overflow-y-auto">
      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <List className="w-3.5 h-3.5" /> Sommaire
        </p>
        <ul className="space-y-1">
          {headings.map(h => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`block text-xs py-1 transition-colors leading-snug ${
                  h.level === 3 ? "pl-4" : ""
                } ${activeId === h.id ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
