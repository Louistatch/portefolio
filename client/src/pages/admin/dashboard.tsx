import { useQuery } from "@tanstack/react-query";
import { adminFetch, clearToken } from "@/lib/admin";
import { Link, useLocation } from "wouter";
import { FileText, BookOpen, Calendar, Mail, Users, MessageSquare, LogOut, LayoutDashboard, UserCircle, Newspaper, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

function useStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/stats");
      return res.json();
    },
  });
}

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/profile", label: "Profile / CV", icon: UserCircle },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/publications", label: "Publications", icon: BookOpen },
  { href: "/admin/appointments", label: "Appointments", icon: Calendar },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/subscribers", label: "Subscribers", icon: Users },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/newsletter", label: "Newsletter", icon: Newspaper },
  { href: "/admin/testimonials", label: "Témoignages", icon: Star },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();

  const logout = () => {
    clearToken();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-card border-r border-border/50 p-4 flex flex-col shrink-0">
        <div className="mb-8">
          <h2 className="font-bold text-lg">Admin Panel</h2>
          <p className="text-xs text-muted-foreground">Louis Tatchida</p>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border/50 pt-4 space-y-2">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted">
            ← Back to Site
          </Link>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-xl w-full">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
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
