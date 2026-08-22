import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin";
import { Link } from "wouter";
import { FileText, BookOpen, Calendar, Mail, Users, MessageSquare } from "lucide-react";

function useStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/stats");
      return res.json();
    },
  });
}

export default function Dashboard() {
  const { data: stats } = useStats();

  const cards = [
    { label: "Posts", value: stats?.posts ?? "—", icon: FileText, href: "/admin/posts", color: "text-blue-500" },
    { label: "Publications", value: stats?.publications ?? "—", icon: BookOpen, href: "/admin/publications", color: "text-emerald-500" },
    { label: "Appointments", value: stats?.appointments ?? "—", icon: Calendar, href: "/admin/appointments", color: "text-amber-500" },
    { label: "Messages", value: stats?.messages ?? "—", icon: Mail, href: "/admin/messages", color: "text-purple-500" },
    { label: "Subscribers", value: stats?.subscribers ?? "—", icon: Users, href: "/admin/subscribers", color: "text-pink-500" },
    { label: "Comments", value: stats?.comments ?? "—", icon: MessageSquare, href: "/admin/comments", color: "text-cyan-500" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => (
          <Link key={card.label} href={card.href} className="bg-card p-6 rounded-2xl border border-border/50 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <card.icon className={`w-8 h-8 ${card.color}`} />
              <span className="text-3xl font-bold">{card.value}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
