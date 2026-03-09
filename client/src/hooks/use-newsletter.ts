import { useMutation } from "@tanstack/react-query";

export function useSubscribe() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Subscription failed");
      }
      return res.json();
    },
  });
}
