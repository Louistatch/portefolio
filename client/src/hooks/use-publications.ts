import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function usePublications() {
  return useQuery({
    queryKey: [api.publications.list.path],
    queryFn: async () => {
      const res = await fetch(api.publications.list.path);
      if (!res.ok) throw new Error("Failed to fetch publications");
      const data = await res.json();
      return api.publications.list.responses[200].parse(data);
    },
  });
}
