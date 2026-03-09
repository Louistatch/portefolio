import express, { type Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// ── Supabase client ──
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://gcfcdkzmfybiigbnlwvb.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZmNka3ptZnliaWlnYm5sd3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTU3OTQsImV4cCI6MjA4ODYzMTc5NH0.61Xs-82V1fW6ZoDq-Te44f31BDivuXvRQkO9SS-MpTc";
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Auth helpers ──
const JWT_SECRET = process.env.JWT_SECRET || "lt-portfolio-admin-secret-change-me";

function generateToken(userId: number, username: string): string {
  return jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: "24h" });
}

async function verifyCredentials(username: string, password: string) {
  const { data } = await supabase.from("admin_users").select("*").eq("username", username).single();
  if (!data) return null;
  const valid = await bcrypt.compare(password, data.password_hash);
  return valid ? { id: data.id, username: data.username } : null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try {
    (req as any).admin = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ══════════════════════════════════════
// PUBLIC ROUTES
// ══════════════════════════════════════

app.get("/api/posts", async (_req, res) => {
  const { data, error } = await supabase.from("posts").select("*").order("published_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.get("/api/posts/:slug", async (req, res) => {
  const { data, error } = await supabase.from("posts").select("*").eq("slug", req.params.slug).single();
  if (error) return res.status(404).json({ message: "Post not found" });
  res.json(data);
});

app.get("/api/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.length < 2) return res.json([]);
  const { data, error } = await supabase.rpc("search_posts", { search_query: q });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.get("/api/posts/:postId/comments", async (req, res) => {
  const { data, error } = await supabase.from("comments").select("*").eq("post_id", Number(req.params.postId)).eq("status", "approved").order("created_at", { ascending: true });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post("/api/posts/:postId/comments", async (req, res) => {
  const { author_name, content } = req.body;
  if (!author_name || !content) return res.status(400).json({ message: "author_name and content required" });
  const { data, error } = await supabase.from("comments").insert({ post_id: Number(req.params.postId), author_name, content }).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

app.get("/api/publications", async (_req, res) => {
  const { data, error } = await supabase.from("publications").select("*").order("year", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post("/api/appointments", async (req, res) => {
  const { name, email, date, topic } = req.body;
  if (!name || !email || !date || !topic) return res.status(400).json({ message: "All fields required" });
  const { data, error } = await supabase.from("appointments").insert({ name, email, date, topic }).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });
  const { data, error } = await supabase.from("subscribers").insert({ email }).select().single();
  if (error) {
    if (error.code === "23505") return res.status(409).json({ message: "Already subscribed" });
    return res.status(400).json({ message: error.message });
  }
  res.status(201).json(data);
});

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) return res.status(400).json({ message: "All fields required" });
  const { data, error } = await supabase.from("contact_messages").insert({ name, email, subject, message }).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

app.get("/api/profile", async (_req, res) => {
  const { data, error } = await supabase.from("profile").select("*").eq("id", 1).single();
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});


// ══════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await verifyCredentials(username, password);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  res.json({ token: generateToken(user.id, user.username), username: user.username });
});

app.get("/api/admin/me", requireAuth, (req, res) => { res.json((req as any).admin); });

app.post("/api/admin/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = (req as any).admin;
  const user = await verifyCredentials(admin.username, currentPassword);
  if (!user) return res.status(400).json({ message: "Current password incorrect" });
  const hash = await bcrypt.hash(newPassword, 10);
  await supabase.from("admin_users").update({ password_hash: hash }).eq("id", admin.id);
  res.json({ message: "Password changed" });
});

// Posts CRUD
app.post("/api/admin/posts", requireAuth, async (req, res) => {
  const { title, slug, content, summary, tags, image_url } = req.body;
  const { data, error } = await supabase.from("posts").insert({ title, slug, content, summary, tags, image_url }).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});
app.put("/api/admin/posts/:id", requireAuth, async (req, res) => {
  const { title, slug, content, summary, tags, image_url } = req.body;
  const { data, error } = await supabase.from("posts").update({ title, slug, content, summary, tags, image_url }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.delete("/api/admin/posts/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("posts").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Deleted" });
});

// Publications CRUD
app.post("/api/admin/publications", requireAuth, async (req, res) => {
  const { title, abstract, pdf_url, citation, category, year, image_url } = req.body;
  const { data, error } = await supabase.from("publications").insert({ title, abstract, pdf_url, citation, category, year, image_url }).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});
app.put("/api/admin/publications/:id", requireAuth, async (req, res) => {
  const { title, abstract, pdf_url, citation, category, year, image_url } = req.body;
  const { data, error } = await supabase.from("publications").update({ title, abstract, pdf_url, citation, category, year, image_url }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.delete("/api/admin/publications/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("publications").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Deleted" });
});

// Appointments
app.get("/api/admin/appointments", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("appointments").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});
app.put("/api/admin/appointments/:id", requireAuth, async (req, res) => {
  const { status } = req.body;
  const { data, error } = await supabase.from("appointments").update({ status }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.delete("/api/admin/appointments/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("appointments").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Deleted" });
});


// Messages management
app.get("/api/admin/messages", requireAuth, async (req, res) => {
  const filter = req.query.filter as string;
  let query = supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (filter === "unread") query = query.eq("is_read", false);
  if (filter === "read") query = query.eq("is_read", true);
  if (filter === "archived") query = query.eq("is_archived", true);
  if (filter !== "archived") query = query.eq("is_archived", false);
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});
app.put("/api/admin/messages/:id/read", requireAuth, async (req, res) => {
  const { is_read } = req.body;
  const { data, error } = await supabase.from("contact_messages").update({ is_read }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.put("/api/admin/messages/:id/archive", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("contact_messages").update({ is_archived: true }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.put("/api/admin/messages/:id/reply", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("contact_messages").update({ replied_at: new Date().toISOString(), is_read: true }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.post("/api/admin/messages/bulk", requireAuth, async (req, res) => {
  const { ids, action } = req.body;
  if (!ids?.length) return res.status(400).json({ message: "No IDs provided" });
  let error;
  if (action === "read") ({ error } = await supabase.from("contact_messages").update({ is_read: true }).in("id", ids));
  else if (action === "unread") ({ error } = await supabase.from("contact_messages").update({ is_read: false }).in("id", ids));
  else if (action === "archive") ({ error } = await supabase.from("contact_messages").update({ is_archived: true }).in("id", ids));
  else if (action === "delete") ({ error } = await supabase.from("contact_messages").delete().in("id", ids));
  else return res.status(400).json({ message: "Invalid action" });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Done" });
});
app.delete("/api/admin/messages/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("contact_messages").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Deleted" });
});

// Subscribers management
app.get("/api/admin/subscribers", requireAuth, async (req, res) => {
  const filter = req.query.filter as string;
  let query = supabase.from("subscribers").select("*").order("created_at", { ascending: false });
  if (filter === "active") query = query.eq("status", "active");
  if (filter === "unsubscribed") query = query.eq("status", "unsubscribed");
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});
app.get("/api/admin/subscribers/export", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("subscribers").select("*").eq("status", "active").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  const csv = "email,name,source,subscribed_at\n" + (data || []).map((s: any) => `"${s.email}","${s.name || ""}","${s.source}","${s.created_at}"`).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=subscribers.csv");
  res.send(csv);
});
app.put("/api/admin/subscribers/:id", requireAuth, async (req, res) => {
  const { status } = req.body;
  const { data, error } = await supabase.from("subscribers").update({ status }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.post("/api/admin/subscribers/bulk", requireAuth, async (req, res) => {
  const { ids, action } = req.body;
  if (!ids?.length) return res.status(400).json({ message: "No IDs provided" });
  let error;
  if (action === "unsubscribe") ({ error } = await supabase.from("subscribers").update({ status: "unsubscribed" }).in("id", ids));
  else if (action === "activate") ({ error } = await supabase.from("subscribers").update({ status: "active" }).in("id", ids));
  else if (action === "delete") ({ error } = await supabase.from("subscribers").delete().in("id", ids));
  else return res.status(400).json({ message: "Invalid action" });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Done" });
});
app.delete("/api/admin/subscribers/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("subscribers").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Deleted" });
});


// Comments moderation
app.get("/api/admin/comments", requireAuth, async (req, res) => {
  const filter = req.query.filter as string;
  let query = supabase.from("comments").select("*, posts(title)").order("created_at", { ascending: false });
  if (filter === "pending") query = query.eq("status", "pending");
  if (filter === "approved") query = query.eq("status", "approved");
  if (filter === "rejected") query = query.eq("status", "rejected");
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});
app.put("/api/admin/comments/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  const { data, error } = await supabase.from("comments").update({ status }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.post("/api/admin/comments/bulk", requireAuth, async (req, res) => {
  const { ids, action } = req.body;
  if (!ids?.length) return res.status(400).json({ message: "No IDs provided" });
  let error;
  if (action === "approve") ({ error } = await supabase.from("comments").update({ status: "approved" }).in("id", ids));
  else if (action === "reject") ({ error } = await supabase.from("comments").update({ status: "rejected" }).in("id", ids));
  else if (action === "delete") ({ error } = await supabase.from("comments").delete().in("id", ids));
  else return res.status(400).json({ message: "Invalid action" });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Done" });
});
app.delete("/api/admin/comments/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("comments").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Deleted" });
});

// Newsletter Campaigns
app.get("/api/admin/campaigns", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("newsletter_campaigns").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});
app.post("/api/admin/campaigns", requireAuth, async (req, res) => {
  const { subject, content } = req.body;
  if (!subject || !content) return res.status(400).json({ message: "Subject and content required" });
  const { data, error } = await supabase.from("newsletter_campaigns").insert({ subject, content }).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});
app.put("/api/admin/campaigns/:id", requireAuth, async (req, res) => {
  const { subject, content } = req.body;
  const { data, error } = await supabase.from("newsletter_campaigns").update({ subject, content }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.post("/api/admin/campaigns/:id/send", requireAuth, async (req, res) => {
  const { data: subs } = await supabase.from("subscribers").select("email").eq("status", "active");
  const count = subs?.length || 0;
  const { data, error } = await supabase.from("newsletter_campaigns").update({ status: "sent", recipients_count: count, sent_at: new Date().toISOString() }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json({ ...data, message: `Campaign marked as sent to ${count} subscribers` });
});
app.delete("/api/admin/campaigns/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("newsletter_campaigns").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Deleted" });
});

// Profile
app.get("/api/admin/profile", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("profile").select("*").eq("id", 1).single();
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});
app.put("/api/admin/profile", requireAuth, async (req, res) => {
  const { full_name, title, bio, photo_url, cv_pdf_url, email, phone, location, linkedin, researchgate, orcid, education, experience, skills, awards, languages, certifications } = req.body;
  const { data, error } = await supabase.from("profile").update({
    full_name, title, bio, photo_url, cv_pdf_url, email, phone, location,
    linkedin, researchgate, orcid, education, experience, skills, awards, languages, certifications,
    updated_at: new Date().toISOString()
  }).eq("id", 1).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

// Dashboard stats
app.get("/api/admin/stats", requireAuth, async (_req, res) => {
  const [posts, pubs, appts, msgs, subs, comments] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("publications").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase.from("subscribers").select("id", { count: "exact", head: true }),
    supabase.from("comments").select("id", { count: "exact", head: true }),
  ]);
  res.json({
    posts: posts.count || 0, publications: pubs.count || 0, appointments: appts.count || 0,
    messages: msgs.count || 0, subscribers: subs.count || 0, comments: comments.count || 0,
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
  }
});

export default app;
