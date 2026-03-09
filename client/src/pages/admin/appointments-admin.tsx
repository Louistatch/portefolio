import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminAppointments() {
  const qc = useQueryClient();
  const { data: appts, isLoading } = useQuery({
    queryKey: ["admin-appts"],
    queryFn: async () => { const r = await adminFetch("/api/admin/appointments"); return r.json(); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await adminFetch(`/api/admin/appointments/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-appts"] }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await adminFetch(`/api/admin/appointments/${id}`, { method: "DELETE" }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-appts"] }),
  });

  const statusColor: Record<string, string> = { pending: "bg-amber-100 text-amber-800", confirmed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Appointments</h1>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="space-y-4">
          {appts?.map((a: any) => (
            <div key={a.id} className="bg-card p-6 rounded-2xl border border-border/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold">{a.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] || "bg-muted"}`}>{a.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.email}</p>
                <p className="text-sm mt-1">{a.topic}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.date ? format(new Date(a.date), "PPP") : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => updateStatus.mutate({ id: a.id, status: "confirmed" })}><CheckCircle2 className="w-3 h-3" /> Confirm</Button>
                <Button size="sm" variant="outline" className="gap-1 text-amber-600" onClick={() => updateStatus.mutate({ id: a.id, status: "pending" })}><Clock className="w-3 h-3" /> Pending</Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => updateStatus.mutate({ id: a.id, status: "cancelled" })}><XCircle className="w-3 h-3" /> Cancel</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) del.mutate(a.id); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
          {appts?.length === 0 && <p className="text-muted-foreground text-center py-12">No appointments yet.</p>}
        </div>
      )}
    </div>
  );
}
