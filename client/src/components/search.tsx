import { useState } from "react";
import { useSearchPosts } from "@/hooks/use-posts";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { Link } from "wouter";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useSearchPosts(query);
  const showResults = query.length >= 2;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher un article..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10 bg-background"
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      {showResults && results && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {results.map(post => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="block px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-0"
              onClick={() => setQuery("")}
            >
              <p className="font-medium text-sm">{post.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{post.summary}</p>
            </Link>
          ))}
        </div>
      )}
      {showResults && results && results.length === 0 && !isLoading && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl z-50 p-4 text-center text-sm text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  );
}
