import { useMutation } from "@tanstack/react-query";

export function useContactForm() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; subject: string; message: string }) => {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send");
      }
      return res.json();
    },
  });
}
