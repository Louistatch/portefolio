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
        const text = await res.text();
        let msg = "Subscription failed";
        try { msg = JSON.parse(text).message || msg; } catch { msg = text || msg; }
        throw new Error(msg);
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
