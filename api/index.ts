import express, { type Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import sharp from "sharp";

// ── Supabase client ──
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://gcfcdkzmfybiigbnlwvb.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZmNka3ptZnliaWlnYm5sd3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTU3OTQsImV4cCI6MjA4ODYzMTc5NH0.61Xs-82V1fW6ZoDq-Te44f31BDivuXvRQkO9SS-MpTc";
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Email (Resend) ──
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "Louis TATCHIDA <contact@louisfarm.com>";
const SITE_URL = process.env.SITE_URL || "https://louisfarm.com";

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
  const { data, error } = await supabase.from("comments").select("*").eq("post_id", Number(req.params.postId)).order("created_at", { ascending: true });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post("/api/posts/:postId/comments", async (req, res) => {
  const { author_name, content } = req.body;
  if (!author_name || !content) return res.status(400).json({ message: "author_name and content required" });
  const { data, error } = await supabase.from("comments").insert({ post_id: Number(req.params.postId), author_name, content, status: "approved" }).select().single();
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
  const { email, name, source } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });
  const { data, error } = await supabase.from("subscribers").insert({ email, name: name || null, source: source || "website" }).select().single();
  if (error) {
    if (error.code === "23505") return res.status(409).json({ message: "Already subscribed" });
    return res.status(400).json({ message: error.message });
  }
  // Send welcome email
  if (resend) {
    const greeting = name ? `Bonjour ${name},` : "Bonjour,";
    resend.emails.send({ from: FROM_EMAIL, to: email, subject: "Bienvenue dans la communauté — Louis TATCHIDA", html: welcomeEmailHtml(greeting, name) }).catch((e: any) => console.error("Welcome email error:", e));
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

app.get("/api/subscribers/count", async (_req, res) => {
  const { count, error } = await supabase.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "active");
  if (error) return res.status(500).json({ message: error.message });
  res.json({ count: count || 0 });
});

// ── Likes & Views ──
app.post("/api/posts/:id/like", async (req, res) => {
  await supabase.rpc("increment_counter", { p_table: "posts", p_column: "likes_count", p_id: Number(req.params.id) });
  res.json({ message: "Liked" });
});
app.post("/api/posts/:id/view", async (req, res) => {
  await supabase.rpc("increment_counter", { p_table: "posts", p_column: "views_count", p_id: Number(req.params.id) });
  res.json({ message: "Viewed" });
});
app.post("/api/publications/:id/like", async (req, res) => {
  await supabase.rpc("increment_counter", { p_table: "publications", p_column: "likes_count", p_id: Number(req.params.id) });
  res.json({ message: "Liked" });
});
app.post("/api/publications/:id/view", async (req, res) => {
  await supabase.rpc("increment_counter", { p_table: "publications", p_column: "views_count", p_id: Number(req.params.id) });
  res.json({ message: "Viewed" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── Testimonials (public) ──
app.get("/api/testimonials", async (_req, res) => {
  const { data, error } = await supabase.from("testimonials").select("*").eq("is_visible", true).order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// ── RSS Feed ──
app.get("/api/rss", async (_req, res) => {
  const { data: posts } = await supabase.from("posts").select("title, slug, summary, published_at, tags").order("published_at", { ascending: false }).limit(20);
  const items = (posts || []).map(p => `<item><title><![CDATA[${p.title}]]></title><link>${SITE_URL}/blog/${p.slug}</link><description><![CDATA[${p.summary || ""}]]></description><pubDate>${p.published_at ? new Date(p.published_at).toUTCString() : ""}</pubDate><guid>${SITE_URL}/blog/${p.slug}</guid>${p.tags?.map((t: string) => `<category>${t}</category>`).join("") || ""}</item>`).join("\n");
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Louis TATCHIDA — Blog</title><link>${SITE_URL}/blog</link><description>Articles et pensées sur l'agriculture durable, la finance agricole et la digitalisation rurale.</description><language>fr</language><atom:link href="${SITE_URL}/api/rss" rel="self" type="application/rss+xml"/>${items}</channel></rss>`);
});

// ── Sitemap ──
app.get("/api/sitemap.xml", async (_req, res) => {
  const staticPages = ["/", "/about", "/research", "/publications", "/blog", "/faq", "/booking", "/contact", "/stats"];
  const { data: posts } = await supabase.from("posts").select("slug, published_at").order("published_at", { ascending: false });
  const urls = staticPages.map(p => `<url><loc>${SITE_URL}${p}</loc><changefreq>${p === "/" ? "weekly" : "monthly"}</changefreq><priority>${p === "/" ? "1.0" : "0.8"}</priority></url>`);
  (posts || []).forEach(p => urls.push(`<url><loc>${SITE_URL}/blog/${p.slug}</loc><lastmod>${p.published_at ? new Date(p.published_at).toISOString().split("T")[0] : ""}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`));
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
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
  // Notify all active subscribers
  if (resend && data) {
    const { data: subs } = await supabase.from("subscribers").select("email, name").eq("status", "active");
    if (subs?.length) {
      for (let i = 0; i < subs.length; i += 50) {
        const batch = subs.slice(i, i + 50).map((s: any) => ({
          from: FROM_EMAIL, to: s.email,
          subject: `Nouvelle publication : ${title}`,
          html: publicationEmailHtml(s.name, { title, slug, summary, image_url }),
        }));
        resend.batch.send(batch).catch((e: any) => console.error("Notification error:", e));
      }
    }
  }
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
  // Get campaign content
  const { data: campaign } = await supabase.from("newsletter_campaigns").select("*").eq("id", Number(req.params.id)).single();
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const { data: subs } = await supabase.from("subscribers").select("email, name").eq("status", "active");
  const count = subs?.length || 0;

  // Send campaign emails via Resend
  if (resend && subs?.length) {
    for (let i = 0; i < subs.length; i += 50) {
      const batch = subs.slice(i, i + 50).map((s: any) => ({
        from: FROM_EMAIL, to: s.email,
        subject: campaign.subject,
        html: campaignEmailHtml(s.name, campaign.subject, campaign.content),
      }));
      resend.batch.send(batch).catch((e: any) => console.error("Campaign send error:", e));
    }
  }

  const { data, error } = await supabase.from("newsletter_campaigns").update({ status: "sent", recipients_count: count, sent_at: new Date().toISOString() }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json({ ...data, message: `Campagne envoyée à ${count} abonné${count > 1 ? "s" : ""}` });
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
  const [posts, pubs, appts, msgs, subs, comments, testimonials] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("publications").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }),
    supabase.from("subscribers").select("id", { count: "exact", head: true }),
    supabase.from("comments").select("id", { count: "exact", head: true }),
    supabase.from("testimonials").select("id", { count: "exact", head: true }),
  ]);
  res.json({
    posts: posts.count || 0, publications: pubs.count || 0, appointments: appts.count || 0,
    messages: msgs.count || 0, subscribers: subs.count || 0, comments: comments.count || 0,
    testimonials: testimonials.count || 0,
  });
});

// ── Admin Testimonials CRUD ──
app.get("/api/admin/testimonials", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});
app.post("/api/admin/testimonials", requireAuth, async (req, res) => {
  const { name, title, organization, content, photo_url, rating, is_visible } = req.body;
  const { data, error } = await supabase.from("testimonials").insert({ name, title, organization, content, photo_url, rating: rating || 5, is_visible: is_visible !== false }).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});
app.put("/api/admin/testimonials/:id", requireAuth, async (req, res) => {
  const { name, title, organization, content, photo_url, rating, is_visible } = req.body;
  const { data, error } = await supabase.from("testimonials").update({ name, title, organization, content, photo_url, rating, is_visible }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});
app.delete("/api/admin/testimonials/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("testimonials").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Deleted" });
});

// ── File Upload ──
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const ALLOWED_DOCS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
const ALLOWED_IMAGES = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf", ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
};

app.post("/api/admin/upload/document", requireAuth, upload.single("file"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "No file provided" });
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_DOCS.includes(ext)) return res.status(400).json({ message: `Invalid file type. Allowed: ${ALLOWED_DOCS.join(", ")}` });
  const filename = `${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from("documents").upload(filename, req.file.buffer, { contentType: MIME_MAP[ext] || req.file.mimetype, upsert: false });
  if (error) return res.status(500).json({ message: error.message });
  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filename);
  res.json({ url: urlData.publicUrl, filename: req.file.originalname });
});

app.post("/api/admin/upload/image", requireAuth, upload.single("file"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "No file provided" });
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_IMAGES.includes(ext)) return res.status(400).json({ message: `Invalid file type. Allowed: ${ALLOWED_IMAGES.join(", ")}` });
  const filename = `${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from("images").upload(filename, req.file.buffer, { contentType: MIME_MAP[ext] || req.file.mimetype, upsert: false });
  if (error) return res.status(500).json({ message: error.message });
  const { data: urlData } = supabase.storage.from("images").getPublicUrl(filename);
  res.json({ url: urlData.publicUrl, filename: req.file.originalname });
});

// ── OG Image Proxy (converts any image to 1200x630 JPEG for social sharing) ──
const ogImageCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const OG_CACHE_TTL = 1000 * 60 * 60; // 1 hour

app.get("/api/og-image", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send("Missing url param");

  try {
    // Check cache
    const cached = ogImageCache.get(url);
    if (cached && Date.now() - cached.timestamp < OG_CACHE_TTL) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(cached.buffer);
    }

    // Fetch original image
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return res.status(404).send("Image not found");
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Convert to 1200x630 JPEG
    const outputBuffer = await sharp(inputBuffer)
      .resize(1200, 630, { fit: "cover", position: "center" })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Cache it
    ogImageCache.set(url, { buffer: outputBuffer, timestamp: Date.now() });

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(outputBuffer);
  } catch (e: any) {
    console.error("OG image error:", e.message);
    res.status(500).send("Image processing failed");
  }
});

// ── OG Meta for Publications (social sharing) ──
function escHtml(s: string) { return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, " "); }

app.get("/api/og/publication/:id", async (req, res) => {
  const { data: pub } = await supabase.from("publications").select("*").eq("id", Number(req.params.id)).single();
  if (!pub) return res.redirect(`${SITE_URL}/publications`);
  const title = escHtml(pub.title || "Publication");
  const desc = escHtml((pub.abstract || "").slice(0, 120));
  const image = pub.image_url ? `${SITE_URL}/api/og-image?url=${encodeURIComponent(pub.image_url)}` : `${SITE_URL}/favicon.svg`;
  const url = `${SITE_URL}/publications#pub-${pub.id}`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html lang="fr"><head>
<meta charset="utf-8">
<title>${title} — Louis TATCHIDA</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Louis TATCHIDA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
<meta http-equiv="refresh" content="0;url=${url}">
</head><body><p>Redirection vers <a href="${url}">${title}</a>...</p></body></html>`);
});

// ── OG Meta for Blog Posts (social sharing) ──
app.get("/api/og/blog/:slug", async (req, res) => {
  const { data: post } = await supabase.from("posts").select("*").eq("slug", req.params.slug).single();
  if (!post) return res.redirect(`${SITE_URL}/blog`);
  const title = escHtml(post.title || "Article");
  const desc = escHtml((post.summary || "").slice(0, 120));
  const image = post.image_url ? `${SITE_URL}/api/og-image?url=${encodeURIComponent(post.image_url)}` : `${SITE_URL}/favicon.svg`;
  const url = `${SITE_URL}/blog/${post.slug}`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html lang="fr"><head>
<meta charset="utf-8">
<title>${title} — Louis TATCHIDA</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Louis TATCHIDA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
<meta http-equiv="refresh" content="0;url=${url}">
</head><body><p>Redirection vers <a href="${url}">${title}</a>...</p></body></html>`);
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
  }
});

// ══════════════════════════════════════
// EMAIL TEMPLATES (inline for serverless)
// ══════════════════════════════════════

const PHOTO_URL = "https://gcfcdkzmfybiigbnlwvb.supabase.co/storage/v1/object/public/images/332d9e01-a89e-49f4-b078-60b4a133aa0a.jpeg";

function emailLayout(content: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.c{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)}.h{background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 32px;text-align:center}.h h1{color:#fff;font-size:24px;margin:0;font-weight:700}.h p{color:rgba(255,255,255,.85);font-size:14px;margin:8px 0 0}.av{width:64px;height:64px;border-radius:50%;border:3px solid #fff;object-fit:cover;margin-bottom:12px}.b{padding:32px}.b p{color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px}.cta{display:inline-block;background:#16a34a;color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;margin:8px 0 24px}.cd{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:16px 0}.cd h3{color:#111;font-size:17px;margin:0 0 8px}.cd p{color:#6b7280;font-size:14px;margin:0}.cd img{width:100%;height:200px;object-fit:cover;border-radius:8px;margin-bottom:12px}.f{padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb}.f p{color:#9ca3af;font-size:12px;margin:0 0 4px}.f a{color:#16a34a;text-decoration:none}.dv{height:1px;background:#e5e7eb;margin:24px 0}.bg{display:inline-block;background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:16px}</style></head><body><div class="c">${content}<div class="f"><img src="${PHOTO_URL}" alt="Louis TATCHIDA" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-bottom:8px"><p>Louis TATCHIDA — Agronome & Expert Finance Agricole</p><p>Lomé, Togo · <a href="mailto:contact@louisfarm.com">contact@louisfarm.com</a></p><p style="margin-top:12px"><a href="${SITE_URL}">Site</a> · <a href="${SITE_URL}/publications">Publications</a> · <a href="${SITE_URL}/blog">Blog</a></p><p style="margin-top:16px;font-size:11px;color:#d1d5db">Vous recevez cet email car vous êtes abonné(e) à la newsletter.</p></div></div></body></html>`;
}

function welcomeEmailHtml(greeting: string, _name?: string) {
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="Louis TATCHIDA" class="av"><h1>Bienvenue dans la communauté !</h1><p>Newsletter de Louis TATCHIDA</p></div><div class="b"><span class="bg">✨ Nouveau membre</span><p>${greeting}</p><p>Merci de rejoindre ma communauté de professionnels passionnés par le développement agricole durable en Afrique de l'Ouest.</p><p>En tant qu'abonné(e), vous recevrez :</p><div class="cd"><h3>📄 Nouvelles publications</h3><p>Notification dès qu'un nouvel article ou une pensée scientifique est publiée.</p></div><div class="cd"><h3>📊 Analyses exclusives</h3><p>Décryptages sur la finance agricole, la résilience climatique et la digitalisation rurale.</p></div><div class="cd"><h3>🌍 Actualités terrain</h3><p>Retours d'expérience de mes missions au Togo et en Afrique de l'Ouest.</p></div><div class="dv"></div><p>Découvrez mes dernières publications :</p><p style="text-align:center"><a href="${SITE_URL}/publications" class="cta">Voir les publications</a></p><p>À très bientôt,<br><strong>Louis TATCHIDA</strong><br><em>Agronome & Expert en Finance Agricole</em></p></div>`);
}

function publicationEmailHtml(name: string | undefined, post: { title: string; slug: string; summary?: string; image_url?: string }) {
  const g = name ? `Bonjour ${name},` : "Bonjour,";
  const img = post.image_url ? `<img src="${post.image_url}" alt="${post.title}">` : "";
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="Louis TATCHIDA" class="av"><h1>Nouvelle Publication</h1><p>Louis TATCHIDA vient de publier un nouvel article</p></div><div class="b"><span class="bg">📝 Nouveau contenu</span><p>${g}</p><p>Un nouvel article vient d'être publié. Je pense qu'il pourrait vous intéresser :</p><div class="cd">${img}<h3>${post.title}</h3>${post.summary ? `<p>${post.summary}</p>` : ""}</div><p style="text-align:center"><a href="${SITE_URL}/blog/${post.slug}" class="cta">Lire l'article complet</a></p><p>N'hésitez pas à commenter et partager !</p><p>Bonne lecture,<br><strong>Louis TATCHIDA</strong></p></div>`);
}

function campaignEmailHtml(name: string | undefined, subject: string, content: string) {
  const g = name ? `Bonjour ${name},` : "Bonjour,";
  const html = content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="Louis TATCHIDA" class="av"><h1>${subject}</h1><p>Newsletter de Louis TATCHIDA</p></div><div class="b"><p>${g}</p><p>${html}</p><div class="dv"></div><p style="text-align:center"><a href="${SITE_URL}" class="cta">Visiter le site</a></p><p>Cordialement,<br><strong>Louis TATCHIDA</strong></p></div>`);
}

export default app;
