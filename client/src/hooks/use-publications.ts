import { useQuery } from "@tanstack/react-query";

export interface Publication {
  id: number;
  title: string;
  abstract: string;
  pdf_url: string;
  citation: string;
  category: string;
  year: number;
  image_url: string | null;
  views_count: number;
  likes_count: number;
}

export function usePublications() {
  return useQuery({
    queryKey: ["publications"],
    queryFn: async () => {
      const res = await fetch("/api/publications");
      if (!res.ok) throw new Error("Failed to fetch publications");
      return res.json() as Promise<Publication[]>;
    },
  });
}
