import { useMutation, useQuery } from "@tanstack/react-query";

interface SubscribeData {
  email: string;
  name?: string;
  source?: string;
}

export function useSubscribe() {
  return useMutation({
    mutationFn: async (data: SubscribeData) => {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Subscription failed");
      }
      return res.json();
    },
  });
}

export function useSubscriberCount() {
  return useQuery({
    queryKey: ["subscriber-count"],
    queryFn: async () => {
      const res = await fetch("/api/subscribers/count");
      if (!res.ok) return { count: 0 };
      return res.json() as Promise<{ count: number }>;
    },
    staleTime: 60000,
  });
}
