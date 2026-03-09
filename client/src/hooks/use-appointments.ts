import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { insertAppointmentSchema } from "@shared/schema";
import { z } from "zod";

export function useCreateAppointment() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertAppointmentSchema>) => {
      const res = await fetch(api.appointments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid input");
        }
        throw new Error("Failed to book appointment");
      }
      return api.appointments.create.responses[201].parse(await res.json());
    },
  });
}
