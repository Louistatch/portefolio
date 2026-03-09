import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  tags: string[] | null;
  published_at: string | null;
  image_url: string | null;
  views_count: number;
  likes_count: number;
}

export interface Comment {
  id: number;
  post_id: number;
  author_name: string;
  content: string;
  created_at: string | null;
}

export function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json() as Promise<Post[]>;
    },
  });
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: ["posts", slug],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${slug}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch post");
      return res.json() as Promise<Post>;
    },
  });
}

export function useComments(postId: number | undefined) {
  return useQuery({
    queryKey: ["comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json() as Promise<Comment[]>;
    },
  });
}

export function useCreateComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { author_name: string; content: string }) => {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json() as Promise<Comment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });
}

export function useSearchPosts(query: string) {
  return useQuery({
    queryKey: ["search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<Post[]>;
    },
  });
}
