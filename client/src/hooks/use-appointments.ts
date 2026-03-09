import { useMutation } from "@tanstack/react-query";

export function useCreateAppointment() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; date: Date; topic: string }) => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, date: data.date.toISOString() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to book");
      }
      return res.json();
    },
  });
}
