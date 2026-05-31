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

// ── Clé de réponses du test d'admission (SERVEUR — jamais exposée au client) ──
const ADMISSION_ANSWER_KEY: number[] = [1, 2, 1, 3, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1];
const ADMISSION_PASS_SCORE = 21;

// ── Auth helpers ──
const JWT_SECRET = process.env.JWT_SECRET || "lt-portfolio-admin-secret-change-me";
// Avertissement si le secret par défaut est utilisé (à corriger sur Vercel)
if (!process.env.JWT_SECRET) {
  console.warn("[SECURITE] JWT_SECRET non defini — definissez-le dans les variables d'environnement Vercel.");
}

// ── Rate limiting en mémoire (sans dépendance, adapté au serverless) ──
const rateBuckets = new Map<string, { count: number; reset: number }>();
function rateLimit(maxReq: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.socket?.remoteAddress || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const b = rateBuckets.get(key);
    if (!b || now > b.reset) {
      rateBuckets.set(key, { count: 1, reset: now + windowMs });
    } else {
      b.count++;
      if (b.count > maxReq) {
        const retry = Math.ceil((b.reset - now) / 1000);
        res.setHeader("Retry-After", String(retry));
        return res.status(429).json({ message: `Trop de tentatives. Réessayez dans ${retry}s.` });
      }
    }
    // Nettoyage opportuniste
    if (rateBuckets.size > 5000) {
      for (const [k, v] of rateBuckets) if (now > v.reset) rateBuckets.delete(k);
    }
    next();
  };
}

// ── Validation d'entrée légère (sans dépendance) ──
function requireFields(body: any, fields: { name: string; type?: string; max?: number; email?: boolean }[]): string | null {
  for (const f of fields) {
    const v = body?.[f.name];
    if (v == null || v === "") return `Le champ "${f.name}" est requis.`;
    if (f.type && typeof v !== f.type) return `Le champ "${f.name}" est invalide.`;
    if (f.max && typeof v === "string" && v.length > f.max) return `Le champ "${f.name}" est trop long.`;
    if (f.email && typeof v === "string" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "Adresse email invalide.";
  }
  return null;
}

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
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));

// ── En-têtes de sécurité (équivalent helmet, sans dépendance) ──
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

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

app.post("/api/admin/login", rateLimit(8, 10 * 60 * 1000), async (req, res) => {
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


// ══════════════════════════════════════════════════════════════════
// DataMEAL ACADEMY — School Management System
// ══════════════════════════════════════════════════════════════════

function generateStudentToken(id: number, email: string): string {
  return jwt.sign({ sid: id, email, role: "student" }, JWT_SECRET, { expiresIn: "7d" });
}

function requireStudent(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  // Token via header (Bearer) OU via query param (?token=) pour les téléchargements navigateur
  let token = header?.startsWith("Bearer ") ? header.slice(7) : (req.query.token as string | undefined);
  if (!token) return res.status(401).json({ message: "Connexion requise" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== "student") return res.status(403).json({ message: "Accès réservé aux étudiants" });
    (req as any).student = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Session expirée" });
  }
}

// ── Inscription (après réussite du test, score >= 21/30) ──
// Helper: enregistrer un email envoyé
async function logAcademyEmail(student_id: number | null, type: string, email: string, subject: string) {
  await supabase.from("academy_emails").insert({ student_id, type, email, subject }).then(() => {}, () => {});
}

/**
 * Dispatcher email centralisé pour DataMEAL Academy.
 * - Idempotent : avec dedupeKey, n'envoie pas deux fois le même email de cycle de vie.
 * - Journalise systématiquement dans academy_emails.
 * - Ne bloque jamais la requête (fire-and-forget contrôlé), erreurs loggées.
 */
async function sendAcademyEmail(opts: {
  studentId: number | null;
  to: string;
  type: string;
  subject: string;
  html: string;
  dedupeKey?: string; // ex: "completed:12:3" → un seul envoi par (type, étudiant, cours)
}): Promise<{ sent: boolean; reason?: string }> {
  if (!resend) return { sent: false, reason: "resend_not_configured" };
  if (!opts.to) return { sent: false, reason: "no_recipient" };
  try {
    // Idempotence : si un email de ce type+clé a déjà été envoyé, on ne renvoie pas
    if (opts.dedupeKey) {
      const { data: prior } = await supabase.from("academy_emails")
        .select("id").eq("student_id", opts.studentId).eq("type", opts.type)
        .eq("subject", opts.subject).limit(1).maybeSingle();
      if (prior) return { sent: false, reason: "already_sent" };
    }
    await resend.emails.send({ from: FROM_EMAIL, to: opts.to, subject: opts.subject, html: opts.html });
    await logAcademyEmail(opts.studentId, opts.type, opts.to, opts.subject);
    return { sent: true };
  } catch (e: any) {
    console.error(`Academy email error [${opts.type}]:`, e?.message || e);
    await supabase.from("academy_emails")
      .insert({ student_id: opts.studentId, type: opts.type, email: opts.to, subject: opts.subject, status: "failed" })
      .then(() => {}, () => {});
    return { sent: false, reason: "send_failed" };
  }
}

app.post("/api/academy/register", rateLimit(8, 10 * 60 * 1000), async (req, res) => {
  const { full_name, email, password, phone, country, organization } = req.body;
  if (!full_name || !email || !password) return res.status(400).json({ message: "Nom, email et mot de passe requis" });
  if (password.length < 6) return res.status(400).json({ message: "Le mot de passe doit faire au moins 6 caractères" });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ message: "Email invalide" });

  const { data: existing } = await supabase.from("students").select("id").eq("email", email).maybeSingle();
  if (existing) return res.status(409).json({ message: "Un compte existe déjà avec cet email" });

  const hash = await bcrypt.hash(password, 10);
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyCode = String(Math.floor(100000 + Math.random() * 900000)); // code 6 chiffres
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  let { data, error } = await supabase.from("students")
    .insert({
      full_name, email, password_hash: hash, phone, country, organization,
      entry_score: 0, status: "pending_test",
      email_verified: false, verify_token: verifyToken, verify_code: verifyCode, verify_expires: verifyExpires,
    })
    .select("id, full_name, email, status, email_verified").single();

  // Fallback : si la migration des colonnes de vérification n'est pas encore appliquée,
  // on crée le compte sans ces colonnes (le compte n'est pas bloqué).
  if (error && /verify_|email_verified|column/i.test(error.message)) {
    const retry = await supabase.from("students")
      .insert({ full_name, email, password_hash: hash, phone, country, organization, entry_score: 0, status: "pending_test" })
      .select("id, full_name, email, status").single();
    data = retry.data as any; error = retry.error;
  }
  if (error) return res.status(400).json({ message: error.message });

  // Email de validation
  if (resend) {
    const verifyUrl = `${SITE_URL}/academy/verify?token=${verifyToken}`;
    resend.emails.send({
      from: FROM_EMAIL, to: email,
      subject: "Confirmez votre inscription — DataMEAL Academy",
      html: verifyEmailHtml(full_name, verifyUrl, verifyCode),
    }).then(() => logAcademyEmail(data.id, "verify", email, "Confirmez votre inscription"))
      .catch((e: any) => console.error("Verify email error:", e));
  }

  const token = generateStudentToken(data.id, data.email);
  res.status(201).json({ token, student: data, emailSent: !!resend });
});

// ── Soumettre le test d'aptitude (étudiant authentifié) ──
const ADMISSION_MONTHS = 3;
const RETRY_DAYS = 7;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Génère le planning hebdomadaire des leçons depuis la date d'admission (modèle WQU)
async function generateLessonSchedule(sid: number, admittedAt: Date) {
  const { data: courses } = await supabase.from("sms_courses")
    .select("id").eq("is_published", true).order("order_index");
  if (!courses?.length) return;

  let week = 0;
  const rows: any[] = [];
  for (const co of courses) {
    const { data: lessons } = await supabase.from("sms_lessons")
      .select("id").eq("course_id", co.id).order("order_index");
    for (const les of (lessons || [])) {
      const unlock = new Date(admittedAt.getTime() + week * WEEK_MS);
      const due = new Date(unlock.getTime() + WEEK_MS);
      rows.push({
        student_id: sid, course_id: co.id, lesson_id: les.id,
        week_index: week + 1, unlock_at: unlock.toISOString(), due_at: due.toISOString(),
        status: week === 0 ? "available" : "locked",
      });
      week++;
    }
  }
  // Insert (ignore conflits si déjà généré)
  for (let i = 0; i < rows.length; i += 100) {
    await supabase.from("lesson_progress").upsert(rows.slice(i, i + 100), { onConflict: "student_id,lesson_id", ignoreDuplicates: true }).then(() => {}, () => {});
  }
}

// Met à jour les statuts de déblocage selon l'heure courante (locked→available, available→missed si dépassé)
async function refreshLessonStates(sid: number) {
  const now = new Date();
  const { data: lps } = await supabase.from("lesson_progress")
    .select("id, unlock_at, due_at, status").eq("student_id", sid);
  if (!lps) return;
  for (const lp of lps) {
    if (lp.status === "completed" || lp.status === "missed") continue;
    const unlock = new Date(lp.unlock_at), due = new Date(lp.due_at);
    let ns = lp.status;
    if (now >= unlock && now <= due) ns = "available";
    else if (now > due) ns = "missed";              // fenêtre dépassée → recalé
    else ns = "locked";
    if (ns !== lp.status) await supabase.from("lesson_progress").update({ status: ns }).eq("id", lp.id);
  }
}

app.post("/api/academy/submit-test", rateLimit(10, 10 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  // ANTI-TRICHE : le client envoie ses réponses choisies, le serveur calcule le score.
  // (On accepte encore "score" en repli, mais "answers" prime et est la voie sûre.)
  const { answers, score: clientScore } = req.body;

  // Vérifier le délai de re-tentative (1 semaine après échec)
  const { data: stud } = await supabase.from("students")
    .select("admitted_at, next_test_allowed, test_attempts, status, email_verified").eq("id", sid).single();
  if (stud && stud.email_verified === false)
    return res.status(403).json({ message: "Vérifiez votre adresse email avant de passer le test.", needVerification: true });
  if (stud?.admitted_at) {
    return res.status(403).json({ message: "Vous êtes déjà admis(e). Le test ne peut pas être repassé.", alreadyAdmitted: true });
  }
  if (stud?.next_test_allowed && new Date(stud.next_test_allowed) > new Date()) {
    return res.status(403).json({ message: "Vous devez attendre avant de repasser le test.", nextAllowed: stud.next_test_allowed });
  }

  // Calcul du score CÔTÉ SERVEUR à partir des réponses
  let score: number;
  if (Array.isArray(answers)) {
    score = 0;
    for (let i = 0; i < ADMISSION_ANSWER_KEY.length; i++) {
      if (Number(answers[i]) === ADMISSION_ANSWER_KEY[i]) score++;
    }
  } else if (typeof clientScore === "number") {
    // Repli legacy (sécurisé par le plafond) — borne le score au max réel
    score = Math.max(0, Math.min(clientScore, ADMISSION_ANSWER_KEY.length));
  } else {
    return res.status(400).json({ message: "Réponses requises (answers)." });
  }

  const passed = score >= ADMISSION_PASS_SCORE;
  const now = new Date();
  const attempts = (stud?.test_attempts ?? 0) + 1;

  const update: any = {
    entry_score: score, test_attempts: attempts, last_test_at: now.toISOString(),
    status: passed ? "active" : "pending_test",
  };
  if (passed) {
    update.admitted_at = now.toISOString();
    update.admission_expires = new Date(now.getFullYear(), now.getMonth() + ADMISSION_MONTHS, now.getDate()).toISOString();
    update.next_test_allowed = null;
  } else {
    update.next_test_allowed = new Date(now.getTime() + RETRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  }
  await supabase.from("students").update(update).eq("id", sid);

  // Note du test
  const { data: existingTest } = await supabase.from("grades")
    .select("id").eq("student_id", sid).eq("type", "entry_test").maybeSingle();
  if (existingTest) {
    await supabase.from("grades").update({ score, graded_at: now.toISOString() }).eq("id", existingTest.id);
  } else {
    await supabase.from("grades").insert({ student_id: sid, title: "Test d'admission MEAL", score, max_score: 30, type: "entry_test" });
  }

  if (passed) {
    // Inscrire à tous les cours + générer un certificat d'admission + planning hebdo
    const { data: courses } = await supabase.from("sms_courses").select("id").eq("is_published", true);
    if (courses?.length) {
      const { data: existing } = await supabase.from("enrollments").select("course_id").eq("student_id", sid);
      const already = new Set((existing || []).map((e: any) => e.course_id));
      const toAdd = courses.filter((co: any) => !already.has(co.id)).map((co: any) => ({ student_id: sid, course_id: co.id, started_at: now.toISOString() }));
      if (toAdd.length) await supabase.from("enrollments").insert(toAdd);
    }
    await generateLessonSchedule(sid, now);

    // Certificat d'admission (expire à 3 mois)
    const certNo = `DMA-ADM-${sid}-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from("attestations").insert({
      student_id: sid, course_id: courses?.[0]?.id ?? null, cert_type: "admission",
      certificate_no: certNo, final_score: Math.round(score / 30 * 100),
      status: "issued", issued_at: now.toISOString(), expires_at: update.admission_expires,
    }).then(() => {}, () => {});

    // Email de félicitations + lien de téléchargement de l'attestation
    const { data: stAdm } = await supabase.from("students").select("full_name, email").eq("id", sid).single();
    if (stAdm?.email) {
      const dlToken = generateStudentToken(sid, stAdm.email);
      const certUrl = `${SITE_URL}/api/academy/certificate/admission?token=${dlToken}`;
      sendAcademyEmail({
        studentId: sid, to: stAdm.email, type: "admission_passed",
        subject: "🎉 Félicitations — Vous êtes admis(e) à DataMEAL Academy !",
        html: admissionPassedEmailHtml(stAdm.full_name, Math.round(score / 30 * 100), update.admission_expires, certUrl),
        dedupeKey: `admission:${sid}`,
      });
    }
  }

  res.json({
    passed, score,
    status: passed ? "active" : "pending_test",
    admissionExpires: passed ? update.admission_expires : null,
    nextTestAllowed: passed ? null : update.next_test_allowed,
  });
});

// ── Statut du test / admission pour l'étudiant connecté ──
app.get("/api/academy/test-status", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data } = await supabase.from("students")
    .select("entry_score, status, admitted_at, admission_expires, next_test_allowed, test_attempts, email_verified").eq("id", sid).single();
  const { data: test } = await supabase.from("grades")
    .select("score, graded_at").eq("student_id", sid).eq("type", "entry_test").maybeSingle();
  const canRetry = !data?.next_test_allowed || new Date(data.next_test_allowed) <= new Date();
  res.json({
    hasTaken: !!test,
    score: data?.entry_score ?? 0,
    passed: !!data?.admitted_at,
    status: data?.status ?? "pending_test",
    admittedAt: data?.admitted_at ?? null,
    admissionExpires: data?.admission_expires ?? null,
    nextTestAllowed: data?.next_test_allowed ?? null,
    canRetry,
    attempts: data?.test_attempts ?? 0,
    emailVerified: data?.email_verified !== false,
  });
});

// ── Vérifier l'email via le token ──
app.post("/api/academy/verify", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token manquant" });
  const { data, error } = await supabase.from("students")
    .select("id, verify_expires, email_verified, full_name, email").eq("verify_token", token).maybeSingle();
  if (error || !data) return res.status(400).json({ message: "Lien de validation invalide" });
  if (data.email_verified) return res.json({ message: "Email déjà vérifié", alreadyVerified: true });
  if (data.verify_expires && new Date(data.verify_expires) < new Date())
    return res.status(400).json({ message: "Lien expiré. Demandez un nouvel email de validation." });

  await supabase.from("students")
    .update({ email_verified: true, verify_token: null, verify_code: null, verify_expires: null })
    .eq("id", data.id);
  res.json({ message: "Email vérifié avec succès", verified: true });
});

// ── Vérifier l'email via le code à 6 chiffres (Supabase) ──
app.post("/api/academy/verify-code", rateLimit(15, 10 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "Code requis" });
  const { data } = await supabase.from("students")
    .select("verify_code, verify_expires, email_verified").eq("id", sid).single();
  if (!data) return res.status(404).json({ message: "Compte introuvable" });
  if (data.email_verified) return res.json({ message: "Email déjà vérifié", verified: true });
  if (data.verify_expires && new Date(data.verify_expires) < new Date())
    return res.status(400).json({ message: "Code expiré. Demandez-en un nouveau." });
  if (String(data.verify_code) !== String(code).trim())
    return res.status(400).json({ message: "Code incorrect" });
  await supabase.from("students")
    .update({ email_verified: true, verify_token: null, verify_code: null, verify_expires: null })
    .eq("id", sid);
  res.json({ message: "Email vérifié avec succès", verified: true });
});

// ── Récupérer le code de vérification courant (étudiant connecté, si email non reçu) ──
app.get("/api/academy/my-verify-code", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data } = await supabase.from("students").select("verify_code, email_verified, verify_expires").eq("id", sid).single();
  res.json({
    email_verified: data?.email_verified ?? false,
    has_code: !!data?.verify_code,
    code: data?.email_verified ? null : (data?.verify_code ?? null),
    expires: data?.verify_expires ?? null,
    resendConfigured: !!resend,
  });
});


// ── Renvoyer l'email de validation ──
app.post("/api/academy/resend-verify", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data } = await supabase.from("students").select("full_name, email, email_verified").eq("id", sid).single();
  if (!data) return res.status(404).json({ message: "Compte introuvable" });
  if (data.email_verified) return res.json({ message: "Email déjà vérifié" });

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyCode = String(Math.floor(100000 + Math.random() * 900000));
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("students").update({ verify_token: verifyToken, verify_code: verifyCode, verify_expires: verifyExpires }).eq("id", sid);

  let emailSent = false, emailError: string | null = null;
  if (resend) {
    const verifyUrl = `${SITE_URL}/academy/verify?token=${verifyToken}`;
    try {
      const r: any = await resend.emails.send({
        from: FROM_EMAIL, to: data.email,
        subject: "Confirmez votre inscription — DataMEAL Academy",
        html: verifyEmailHtml(data.full_name, verifyUrl, verifyCode),
      });
      if (r?.error) { emailError = r.error?.message || String(r.error); }
      else { emailSent = true; await logAcademyEmail(sid, "verify", data.email, "Confirmez votre inscription"); }
    } catch (e: any) { emailError = e?.message || String(e); }
  } else {
    emailError = "Service email non configuré";
  }
  // Filet de sécurité : si l'email n'est pas parti, on renvoie le code pour l'afficher dans l'app
  res.json({
    message: emailSent ? "Email de validation renvoyé" : "Email indisponible — utilisez le code ci-dessous",
    emailSent,
    fallbackCode: emailSent ? null : verifyCode,
    emailError,
  });
});

// ── Mot de passe oublié — demande ──
app.post("/api/academy/forgot-password", rateLimit(5, 15 * 60 * 1000), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email requis" });
  const { data } = await supabase.from("students").select("id, full_name").eq("email", email).maybeSingle();
  // Réponse identique que le compte existe ou non (sécurité — pas de fuite d'info)
  if (data) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h
    await supabase.from("students").update({ reset_token: resetToken, reset_expires: resetExpires }).eq("id", data.id);
    if (resend) {
      const resetUrl = `${SITE_URL}/academy/reset-password?token=${resetToken}`;
      resend.emails.send({
        from: FROM_EMAIL, to: email,
        subject: "Réinitialisation de votre mot de passe — DataMEAL Academy",
        html: resetEmailHtml(data.full_name, resetUrl),
      }).then(() => logAcademyEmail(data.id, "reset", email, "Réinitialisation mot de passe")).catch(() => {});
    }
  }
  res.json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
});

// ── Mot de passe oublié — réinitialisation ──
app.post("/api/academy/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Token et nouveau mot de passe requis" });
  if (password.length < 6) return res.status(400).json({ message: "Le mot de passe doit faire au moins 6 caractères" });
  const { data } = await supabase.from("students").select("id, reset_expires").eq("reset_token", token).maybeSingle();
  if (!data) return res.status(400).json({ message: "Lien de réinitialisation invalide" });
  if (data.reset_expires && new Date(data.reset_expires) < new Date())
    return res.status(400).json({ message: "Lien expiré. Refaites une demande." });

  const hash = await bcrypt.hash(password, 10);
  await supabase.from("students")
    .update({ password_hash: hash, reset_token: null, reset_expires: null })
    .eq("id", data.id);
  res.json({ message: "Mot de passe réinitialisé avec succès" });
});

// ── Connexion ──
app.post("/api/academy/login", rateLimit(10, 5 * 60 * 1000), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email et mot de passe requis" });
  const { data, error } = await supabase.from("students").select("*").eq("email", email).maybeSingle();
  if (error || !data) return res.status(401).json({ message: "Identifiants invalides" });
  if (data.status === "suspended") return res.status(403).json({ message: "Compte suspendu" });
  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) return res.status(401).json({ message: "Identifiants invalides" });
  await supabase.from("students").update({ last_login: new Date().toISOString() }).eq("id", data.id);
  const token = generateStudentToken(data.id, data.email);
  res.json({
    token,
    student: { id: data.id, full_name: data.full_name, email: data.email, avatar_url: data.avatar_url },
    email_verified: data.email_verified,
  });
});

// ── Profil étudiant connecté (complet) ──
app.get("/api/academy/me", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data, error } = await supabase.from("students")
    .select("id, full_name, email, phone, country, city, organization, profession, bio, gender, birth_year, linkedin, experience_level, interests, entry_score, avatar_url, status, email_verified, course_emails, created_at, last_login")
    .eq("id", sid).single();
  if (error) return res.status(404).json({ message: "Étudiant introuvable" });
  res.json(data);
});

// ── Mettre à jour son profil ──
app.put("/api/academy/me", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const allowed = ["full_name", "phone", "country", "city", "organization", "profession", "bio", "gender", "birth_year", "linkedin", "experience_level", "interests", "avatar_url", "course_emails"];
  const update: any = {};
  for (const k of allowed) if (k in req.body) update[k] = req.body[k];
  if (Object.keys(update).length === 0) return res.status(400).json({ message: "Aucun champ à mettre à jour" });
  const { data, error } = await supabase.from("students").update(update).eq("id", sid)
    .select("id, full_name, email, phone, country, city, organization, profession, bio, gender, birth_year, linkedin, experience_level, interests, avatar_url, course_emails").single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

// ── Changer son mot de passe (connecté) ──
app.put("/api/academy/change-password", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ message: "Mot de passe actuel et nouveau requis" });
  if (new_password.length < 6) return res.status(400).json({ message: "Le nouveau mot de passe doit faire au moins 6 caractères" });
  const { data } = await supabase.from("students").select("password_hash").eq("id", sid).single();
  if (!data) return res.status(404).json({ message: "Compte introuvable" });
  const valid = await bcrypt.compare(current_password, data.password_hash);
  if (!valid) return res.status(401).json({ message: "Mot de passe actuel incorrect" });
  const hash = await bcrypt.hash(new_password, 10);
  await supabase.from("students").update({ password_hash: hash }).eq("id", sid);
  res.json({ message: "Mot de passe modifié" });
});

// ── Liste des cours ──
app.get("/api/academy/courses", async (_req, res) => {
  const { data, error } = await supabase.from("sms_courses").select("*").eq("is_published", true).order("order_index");
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// ── Détail d'un cours + leçons ──
app.get("/api/academy/courses/:id", async (req, res) => {
  const { data: course, error } = await supabase.from("sms_courses").select("*").eq("id", Number(req.params.id)).single();
  if (error) return res.status(404).json({ message: "Cours introuvable" });
  const { data: lessons } = await supabase.from("sms_lessons").select("*").eq("course_id", course.id).order("order_index");
  res.json({ ...course, lessons: lessons || [] });
});

// ── Mes inscriptions (avec infos cours) ──
app.get("/api/academy/my-enrollments", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data, error } = await supabase.from("enrollments")
    .select("*, sms_courses(id, code, title, description, tools, level, total_lessons)")
    .eq("student_id", sid).order("enrolled_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// ── S'inscrire à un cours ──
app.post("/api/academy/enroll", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ message: "course_id requis" });
  const { data, error } = await supabase.from("enrollments")
    .insert({ student_id: sid, course_id }).select().single();
  if (error) {
    if (error.code === "23505") return res.status(409).json({ message: "Déjà inscrit à ce cours" });
    return res.status(400).json({ message: error.message });
  }
  res.status(201).json(data);
});

// ── Mes notes (gradebook) ──
app.get("/api/academy/my-grades", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data, error } = await supabase.from("grades")
    .select("*, sms_courses(code, title)")
    .eq("student_id", sid).order("graded_at", { ascending: true });
  if (error) return res.status(500).json({ message: error.message });
  // Moyenne pondérée
  const arr = data || [];
  const avg = arr.length ? arr.reduce((a, g) => a + (Number(g.score) / Number(g.max_score)) * 100, 0) / arr.length : 0;
  res.json({ grades: arr, average: Math.round(avg * 10) / 10, count: arr.length });
});

// ── Compléter une leçon (auto-note + progression) ──
app.post("/api/academy/complete-lesson", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { course_id, lesson_id, score } = req.body;
  if (!course_id || !lesson_id) return res.status(400).json({ message: "course_id et lesson_id requis" });

  // Vérifier l'email + l'admission
  const { data: stud } = await supabase.from("students").select("admitted_at, admission_expires, email_verified").eq("id", sid).single();
  if (stud && stud.email_verified === false) return res.status(403).json({ message: "Vérifiez votre adresse email pour accéder aux cours.", needVerification: true });
  if (!stud?.admitted_at) return res.status(403).json({ message: "Vous devez réussir le test d'admission pour accéder aux cours." });
  if (stud.admission_expires && new Date(stud.admission_expires) < new Date())
    return res.status(403).json({ message: "Votre période d'admission (3 mois) a expiré. Repassez le test d'admission." });

  // Vérifier l'inscription
  const { data: enr } = await supabase.from("enrollments")
    .select("id").eq("student_id", sid).eq("course_id", course_id).maybeSingle();
  if (!enr) await supabase.from("enrollments").insert({ student_id: sid, course_id, started_at: new Date().toISOString() });

  // GATING WQU : la leçon doit être 'available' (débloquée cette semaine, fenêtre non dépassée)
  await refreshLessonStates(sid);
  const { data: lp } = await supabase.from("lesson_progress")
    .select("status, unlock_at, due_at").eq("student_id", sid).eq("lesson_id", lesson_id).maybeSingle();
  if (lp) {
    if (lp.status === "locked")
      return res.status(403).json({ message: "Cette leçon n'est pas encore débloquée.", unlockAt: lp.unlock_at, locked: true });
    if (lp.status === "missed")
      return res.status(403).json({ message: "La fenêtre d'une semaine pour cette leçon est dépassée. Vous avez été recalé(e) sur cette leçon.", missed: true });
  }

  // Récup la leçon pour le titre + points
  const { data: lesson } = await supabase.from("sms_lessons").select("title, points").eq("id", lesson_id).single();
  const finalScore = score ?? (lesson?.points ?? 10);
  const maxScore = lesson?.points ?? 10;

  // Eviter doublon de note
  const { data: existingGrade } = await supabase.from("grades")
    .select("id").eq("student_id", sid).eq("lesson_id", lesson_id).maybeSingle();
  if (!existingGrade) {
    await supabase.from("grades").insert({
      student_id: sid, course_id, lesson_id,
      title: lesson?.title || "Leçon", score: finalScore, max_score: maxScore, type: "lesson",
    });
  }
  // Marquer la leçon comme complétée dans le planning hebdo
  await supabase.from("lesson_progress")
    .update({ status: "completed", completed_at: new Date().toISOString(), score: finalScore })
    .eq("student_id", sid).eq("lesson_id", lesson_id).then(() => {}, () => {});

  // Recalcul progression
  const { count: totalLessons } = await supabase.from("sms_lessons")
    .select("id", { count: "exact", head: true }).eq("course_id", course_id);
  const { data: doneGrades } = await supabase.from("grades")
    .select("lesson_id").eq("student_id", sid).eq("course_id", course_id).eq("type", "lesson");
  const doneCount = new Set((doneGrades || []).map(g => g.lesson_id)).size;
  const progress = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;

  const wasCompleted = progress >= 100;
  await supabase.from("enrollments")
    .update({ progress, status: wasCompleted ? "completed" : "in_progress", completed_at: wasCompleted ? new Date().toISOString() : null })
    .eq("student_id", sid).eq("course_id", course_id);

  // Email automatique de fin de projet (idempotent : une seule fois par cours)
  if (wasCompleted) {
    const { data: stud } = await supabase.from("students").select("full_name, email, course_emails").eq("id", sid).single();
    const { data: course } = await supabase.from("sms_courses").select("code, title").eq("id", course_id).single();
    if (stud?.email && stud.course_emails !== false && course) {
      const subject = `🏁 Projet terminé : ${course.title}`;
      sendAcademyEmail({
        studentId: sid, to: stud.email, type: "course_completed", subject,
        html: courseCompletedEmailHtml(stud.full_name, course),
        dedupeKey: `completed:${sid}:${course_id}`,
      });
    }
  }

  // Vérifier si les 3 cours sont terminés → certificat FINAL
  let finalCert = null;
  if (wasCompleted) {
    const { data: allCourses } = await supabase.from("sms_courses").select("id").eq("is_published", true);
    const { data: doneEnr } = await supabase.from("enrollments")
      .select("course_id").eq("student_id", sid).eq("status", "completed");
    const doneIds = new Set((doneEnr || []).map((e: any) => e.course_id));
    const allDone = (allCourses || []).length > 0 && (allCourses || []).every((co: any) => doneIds.has(co.id));
    if (allDone) {
      const { data: existingFinal } = await supabase.from("students").select("final_certificate_no").eq("id", sid).single();
      if (!existingFinal?.final_certificate_no) {
        const certNo = `DMA-FINAL-${sid}-${Date.now().toString(36).toUpperCase()}`;
        const nowIso = new Date().toISOString();
        // Moyenne générale
        const { data: allGrades } = await supabase.from("grades").select("score, max_score").eq("student_id", sid);
        const ga = allGrades || [];
        const avg = ga.length ? Math.round(ga.reduce((a, g) => a + Number(g.score) / Number(g.max_score) * 100, 0) / ga.length) : 0;
        await supabase.from("students").update({ final_certificate_no: certNo, final_certified_at: nowIso }).eq("id", sid);
        await supabase.from("attestations").insert({
          student_id: sid, course_id: course_id, cert_type: "final",
          certificate_no: certNo, final_score: avg, status: "issued", issued_at: nowIso,
        }).then(() => {}, () => {});
        finalCert = { certificate_no: certNo, average: avg };
        const { data: st2 } = await supabase.from("students").select("full_name, email").eq("id", sid).single();
        if (st2?.email) sendAcademyEmail({
          studentId: sid, to: st2.email, type: "final_certificate",
          subject: "🎓 Certificat Super-Expert MEAL délivré !",
          html: finalCertEmailHtml(st2.full_name, certNo, avg),
          dedupeKey: `final:${sid}`,
        });
      }
    }
  }

  res.json({ progress, done: doneCount, total: totalLessons || 0, completed: wasCompleted, finalCertificate: finalCert });
});

// ── Planning hebdomadaire des leçons (modèle WQU) ──
app.get("/api/academy/lesson-schedule", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  await refreshLessonStates(sid);
  const { data, error } = await supabase.from("lesson_progress")
    .select("*, sms_lessons(title, order_index), sms_courses(code, title)")
    .eq("student_id", sid).order("week_index");
  if (error) return res.status(500).json({ message: error.message });
  res.json(data || []);
});

// ── Relevé de notes complet (transcript WQU) ──
app.get("/api/academy/transcript", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data: grades } = await supabase.from("grades")
    .select("*, sms_courses(code, title)").eq("student_id", sid).order("graded_at", { ascending: true });
  const { data: stud } = await supabase.from("students")
    .select("full_name, entry_score, admitted_at, admission_expires, final_certificate_no, final_certified_at").eq("id", sid).single();
  const arr = grades || [];
  // GPA / moyenne par cours
  const byCourse: Record<string, { sum: number; n: number; code: string; title: string }> = {};
  for (const g of arr) {
    const code = (g as any).sms_courses?.code || "ADMISSION";
    if (!byCourse[code]) byCourse[code] = { sum: 0, n: 0, code, title: (g as any).sms_courses?.title || "Test d'admission" };
    byCourse[code].sum += Number(g.score) / Number(g.max_score) * 100;
    byCourse[code].n++;
  }
  const courseAverages = Object.values(byCourse).map(v => ({ code: v.code, title: v.title, average: Math.round(v.sum / v.n) }));
  const overall = arr.length ? Math.round(arr.reduce((a, g) => a + Number(g.score) / Number(g.max_score) * 100, 0) / arr.length) : 0;
  res.json({ student: stud, grades: arr, courseAverages, overall, totalGrades: arr.length });
});

// ── Demander une attestation ──
app.post("/api/academy/attestation", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ message: "course_id requis" });

  const { data: enr } = await supabase.from("enrollments")
    .select("progress, status").eq("student_id", sid).eq("course_id", course_id).maybeSingle();
  if (!enr || enr.progress < 100) return res.status(403).json({ message: "Vous devez compléter 100% du cours avant de demander l'attestation." });

  const { data: existing } = await supabase.from("attestations")
    .select("id, status").eq("student_id", sid).eq("course_id", course_id).maybeSingle();
  if (existing) return res.status(409).json({ message: "Attestation déjà demandée", status: existing.status });

  // Score final = moyenne des notes du cours
  const { data: courseGrades } = await supabase.from("grades")
    .select("score, max_score").eq("student_id", sid).eq("course_id", course_id);
  const arr = courseGrades || [];
  const finalScore = arr.length ? Math.round(arr.reduce((a, g) => a + (Number(g.score) / Number(g.max_score)) * 100, 0) / arr.length * 10) / 10 : 0;
  const certNo = `DMA-${course_id}-${sid}-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase.from("attestations")
    .insert({ student_id: sid, course_id, certificate_no: certNo, final_score: finalScore, status: "pending" })
    .select().single();
  if (error) return res.status(400).json({ message: error.message });

  // Accusé de réception de la demande d'attestation
  const { data: stud } = await supabase.from("students").select("full_name, email").eq("id", sid).single();
  const { data: course } = await supabase.from("sms_courses").select("code, title").eq("id", course_id).single();
  if (stud?.email && course) {
    sendAcademyEmail({
      studentId: sid, to: stud.email, type: "attestation_requested",
      subject: `📋 Demande d'attestation reçue — ${course.title}`,
      html: attestationRequestedEmailHtml(stud.full_name, course, certNo, finalScore),
      dedupeKey: `attest_req:${sid}:${course_id}`,
    });
  }

  res.status(201).json(data);
});

// ── Mes attestations ──
app.get("/api/academy/my-attestations", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data, error } = await supabase.from("attestations")
    .select("*, sms_courses(code, title)").eq("student_id", sid).order("requested_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// ── Portefeuille de credentials (style Credly) : toutes les attestations stockées ──
app.get("/api/academy/my-credentials", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data: stud } = await supabase.from("students")
    .select("full_name, admitted_at, admission_expires, final_certificate_no, final_certified_at, entry_score").eq("id", sid).single();
  const { data: atts } = await supabase.from("attestations")
    .select("*, sms_courses(code, title)").eq("student_id", sid);

  const dlToken = generateStudentToken(sid, (req as any).student.email);
  const credentials: any[] = [];

  // Attestation d'admission
  if (stud?.admitted_at) {
    const adm = (atts || []).find((a: any) => a.cert_type === "admission");
    const expired = stud.admission_expires && new Date(stud.admission_expires) < new Date();
    credentials.push({
      id: "admission",
      type: "admission",
      title: "Attestation d'admission",
      subtitle: "Programme MEAL — DataMEAL Academy",
      issued_at: stud.admitted_at,
      expires_at: stud.admission_expires,
      status: expired ? "expired" : "active",
      certificate_no: adm?.certificate_no || null,
      score: Math.round((stud.entry_score ?? 0) / 30 * 100),
      download_url: `/api/academy/certificate/admission?token=${dlToken}`,
      skills: ["MEAL", "Collecte de données", "Méthodologie"],
      color: "#0d9488",
    });
  }

  // Certificat final (Super-Expert)
  if (stud?.final_certificate_no) {
    const fin = (atts || []).find((a: any) => a.cert_type === "final");
    credentials.push({
      id: "final",
      type: "final",
      title: "Certificat Super-Expert MEAL",
      subtitle: "Les 3 projets complétés — KoboCollect · QGIS · Pipeline",
      issued_at: stud.final_certified_at,
      expires_at: null,
      status: "active",
      certificate_no: stud.final_certificate_no,
      score: fin?.final_score ?? null,
      download_url: `/api/academy/certificate/final?token=${dlToken}`,
      skills: ["KoboCollect", "QGIS", "Python", "Automatisation", "Reporting MEAL"],
      color: "#7c3aed",
    });
  }

  // Attestations par cours (si émises)
  for (const a of (atts || [])) {
    if (a.cert_type === "course" && a.status === "issued") {
      credentials.push({
        id: `course-${a.id}`,
        type: "course",
        title: `Attestation — ${a.sms_courses?.title || "Cours"}`,
        subtitle: a.sms_courses?.code || "",
        issued_at: a.issued_at,
        expires_at: a.expires_at,
        status: "active",
        certificate_no: a.certificate_no,
        score: a.final_score ?? null,
        download_url: null,
        skills: [],
        color: "#2563eb",
      });
    }
  }

  res.json({ holder: stud?.full_name || "", credentials });
});


// ── ADMIN : créer un cours + notifier les étudiants par email ──
app.post("/api/admin/academy/courses", requireAuth, async (req, res) => {
  const { code, title, description, tools, level, total_lessons, notify } = req.body;
  if (!code || !title) return res.status(400).json({ message: "Code et titre requis" });
  const { data, error } = await supabase.from("sms_courses")
    .insert({ code, title, description, tools, level: level || "debutant", total_lessons: total_lessons || 0,
              order_index: 99, is_published: true })
    .select().single();
  if (error) return res.status(400).json({ message: error.message });

  // Notifier tous les étudiants actifs ayant accepté les emails de cours
  if (notify && resend) {
    const { data: students } = await supabase.from("students")
      .select("id, full_name, email").eq("status", "active").eq("course_emails", true).eq("email_verified", true);
    if (students?.length) {
      const batch = students.map((s: any) => ({
        from: FROM_EMAIL, to: s.email,
        subject: `Nouveau cours : ${title} — DataMEAL Academy`,
        html: newCourseEmailHtml(s.full_name, { code, title, description }),
      }));
      for (let i = 0; i < batch.length; i += 100) {
        resend.batch.send(batch.slice(i, i + 100)).catch((e: any) => console.error("New course email error:", e));
      }
      students.forEach((s: any) => logAcademyEmail(s.id, "new_course", s.email, `Nouveau cours : ${title}`));
    }
  }
  res.status(201).json({ course: data, notified: !!notify });
});

// ── ADMIN : notifier manuellement d'un cours existant ──
app.post("/api/admin/academy/notify-course/:id", requireAuth, async (req, res) => {
  const { data: course } = await supabase.from("sms_courses").select("*").eq("id", Number(req.params.id)).single();
  if (!course) return res.status(404).json({ message: "Cours introuvable" });
  if (!resend) return res.status(400).json({ message: "Email non configuré (RESEND_API_KEY manquant)" });
  const { data: students } = await supabase.from("students")
    .select("id, full_name, email").eq("status", "active").eq("course_emails", true).eq("email_verified", true);
  let count = 0;
  if (students?.length) {
    const batch = students.map((s: any) => ({
      from: FROM_EMAIL, to: s.email,
      subject: `Nouveau cours : ${course.title} — DataMEAL Academy`,
      html: newCourseEmailHtml(s.full_name, course),
    }));
    for (let i = 0; i < batch.length; i += 100) {
      resend.batch.send(batch.slice(i, i + 100)).catch(() => {});
    }
    students.forEach((s: any) => logAcademyEmail(s.id, "new_course", s.email, `Nouveau cours : ${course.title}`));
    count = students.length;
  }
  res.json({ message: `Notification envoyée à ${count} étudiant(s)`, count });
});


// ── ADMIN : diagnostic de la configuration email ──
app.get("/api/admin/academy/email-status", requireAuth, async (_req, res) => {
  res.json({
    resendConfigured: !!resend,
    fromEmail: FROM_EMAIL,
    siteUrl: SITE_URL,
    note: resend ? "Resend actif" : "RESEND_API_KEY manquant — aucun email ne partira",
  });
});

// ── ADMIN : envoyer un email de test ──
app.post("/api/admin/academy/test-email", requireAuth, async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ message: "Adresse 'to' requise" });
  if (!resend) return res.status(400).json({ message: "RESEND_API_KEY non configuré sur Vercel" });
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL, to,
      subject: "Test DataMEAL Academy",
      html: emailLayout('<div class="h"><h1>Test réussi</h1></div><div class="b"><p>Si vous lisez cet email, la configuration Resend de DataMEAL Academy fonctionne correctement.</p></div>'),
    });
    res.json({ message: "Email de test envoyé", id: (result as any)?.data?.id || null });
  } catch (e: any) {
    res.status(500).json({ message: "Échec d'envoi", error: e?.message || String(e) });
  }
});

// ══════════════ ADMIN — Gestion école ══════════════

app.get("/api/admin/academy/students", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("students")
    .select("id, full_name, email, phone, country, organization, entry_score, status, created_at, email_verified, admitted_at, admission_expires, final_certificate_no, test_attempts, last_login")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// ── Action de gestion sur un étudiant (admin) ──
app.post("/api/admin/academy/students/:id/action", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { action } = req.body;
  const now = new Date();
  try {
    if (action === "verify_email") {
      await supabase.from("students").update({ email_verified: true, verify_token: null, verify_code: null }).eq("id", id);
    } else if (action === "admit") {
      // Admission manuelle : génère admission + planning hebdo + inscription
      const expires = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString();
      await supabase.from("students").update({ admitted_at: now.toISOString(), admission_expires: expires, status: "active", email_verified: true, next_test_allowed: null }).eq("id", id);
      const { data: courses } = await supabase.from("sms_courses").select("id").eq("is_published", true);
      if (courses?.length) {
        const { data: existing } = await supabase.from("enrollments").select("course_id").eq("student_id", id);
        const already = new Set((existing || []).map((e: any) => e.course_id));
        const toAdd = courses.filter((co: any) => !already.has(co.id)).map((co: any) => ({ student_id: id, course_id: co.id, started_at: now.toISOString() }));
        if (toAdd.length) await supabase.from("enrollments").insert(toAdd);
      }
      const certNo = `DMA-ADM-${id}-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from("attestations").insert({ student_id: id, course_id: courses?.[0]?.id ?? null, cert_type: "admission", certificate_no: certNo, status: "issued", issued_at: now.toISOString(), expires_at: expires }).then(() => {}, () => {});
      await generateLessonSchedule(id, now);
    } else if (action === "reset_test") {
      // Réinitialise le test (permet de repasser immédiatement)
      await supabase.from("students").update({ next_test_allowed: null, last_test_at: null }).eq("id", id);
    } else if (action === "revoke_admission") {
      await supabase.from("students").update({ admitted_at: null, admission_expires: null, status: "pending_test" }).eq("id", id);
      await supabase.from("lesson_progress").delete().eq("student_id", id).then(() => {}, () => {});
    } else if (action === "delete") {
      await supabase.from("students").delete().eq("id", id);
    } else {
      return res.status(400).json({ message: "Action inconnue" });
    }
    res.json({ message: "Action effectuée", action });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Erreur" });
  }
});

app.get("/api/admin/academy/students/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [student, grades, enrollments, attestations] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).single(),
    supabase.from("grades").select("*, sms_courses(code, title)").eq("student_id", id).order("graded_at", { ascending: true }),
    supabase.from("enrollments").select("*, sms_courses(code, title)").eq("student_id", id),
    supabase.from("attestations").select("*, sms_courses(code, title)").eq("student_id", id),
  ]);
  if (student.error) return res.status(404).json({ message: "Étudiant introuvable" });

  // Liens de téléchargement des certificats (l'admin génère un jeton pour cet étudiant)
  const st = student.data as any;
  const certificates: any[] = [];
  if (st.admitted_at) {
    const tk = generateStudentToken(id, st.email);
    certificates.push({ type: "admission", label: "Attestation d'admission", url: `/api/academy/certificate/admission?token=${tk}`, expires_at: st.admission_expires });
  }
  if (st.final_certificate_no) {
    const tk = generateStudentToken(id, st.email);
    certificates.push({ type: "final", label: "Certificat final (Super-Expert)", url: `/api/academy/certificate/final?token=${tk}` });
  }

  res.json({ student: st, grades: grades.data || [], enrollments: enrollments.data || [], attestations: attestations.data || [], certificates });
});

// Attribuer une note manuelle
app.post("/api/admin/academy/grades", requireAuth, async (req, res) => {
  const { student_id, course_id, lesson_id, title, score, max_score, type, feedback } = req.body;
  if (!student_id || !title || score == null) return res.status(400).json({ message: "student_id, title et score requis" });
  const { data, error } = await supabase.from("grades")
    .insert({ student_id, course_id, lesson_id, title, score, max_score: max_score || 100, type: type || "exam", feedback })
    .select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

app.delete("/api/admin/academy/grades/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("grades").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Supprimé" });
});

// Valider / émettre une attestation
app.get("/api/admin/academy/attestations", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("attestations")
    .select("*, students(full_name, email), sms_courses(code, title)")
    .order("requested_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put("/api/admin/academy/attestations/:id", requireAuth, async (req, res) => {
  const { status } = req.body;
  const update: any = { status };
  if (status === "issued") update.issued_at = new Date().toISOString();
  const { data, error } = await supabase.from("attestations").update(update).eq("id", Number(req.params.id)).select("*, students(full_name, email), sms_courses(code, title)").single();
  if (error) return res.status(400).json({ message: error.message });

  // Email automatique selon la décision admin
  const stud = (data as any).students;
  const course = (data as any).sms_courses;
  if (stud?.email && course) {
    if (status === "issued") {
      sendAcademyEmail({
        studentId: data.student_id, to: stud.email, type: "attestation_issued",
        subject: `🎓 Votre attestation est prête — ${course.title}`,
        html: attestationIssuedEmailHtml(stud.full_name, course, data.certificate_no, Number(data.final_score)),
      });
    } else if (status === "rejected") {
      sendAcademyEmail({
        studentId: data.student_id, to: stud.email, type: "attestation_rejected",
        subject: `Attestation — complément requis (${course.title})`,
        html: attestationRejectedEmailHtml(stud.full_name, course),
      });
    }
  }
  res.json(data);
});

// Stats école
app.get("/api/admin/academy/stats", requireAuth, async (_req, res) => {
  const [students, enrollments, attestations, courses] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("enrollments").select("id", { count: "exact", head: true }),
    supabase.from("attestations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("sms_courses").select("id", { count: "exact", head: true }),
  ]);
  res.json({
    students: students.count || 0,
    enrollments: enrollments.count || 0,
    pendingAttestations: attestations.count || 0,
    courses: courses.count || 0,
  });
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


// ══════════════ Templates email Academy ══════════════
// ── Layout email dédié DataMEAL Academy ──
function academyEmailLayout(content: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#eef2f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:600px;margin:24px auto;padding:0 16px}
  .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(13,148,136,.12)}
  .hd{background:linear-gradient(135deg,#0d9488,#0f766e);padding:36px 32px;text-align:center}
  .hd .logo{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.15);padding:8px 16px;border-radius:100px;margin-bottom:16px}
  .hd .logo span{color:#fff;font-size:13px;font-weight:600;letter-spacing:.5px}
  .hd h1{color:#fff;font-size:23px;margin:0;font-weight:800;line-height:1.2}
  .hd .sub{color:rgba(255,255,255,.85);font-size:14px;margin:8px 0 0}
  .bd{padding:32px}
  .bd p{color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px}
  .badge{display:inline-block;background:#ccfbf1;color:#0d9488;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:700;margin-bottom:18px}
  .btn{display:inline-block;background:#0d9488;color:#fff!important;text-decoration:none;padding:15px 36px;border-radius:12px;font-weight:700;font-size:15px;margin:8px 0}
  .code{background:#f0fdfa;border:1px dashed #5eead4;border-radius:14px;padding:20px;margin:20px 0;text-align:center}
  .code .lbl{margin:0 0 8px;font-size:13px;color:#6b7280}
  .code .val{font-size:32px;font-weight:800;letter-spacing:8px;color:#0d9488;margin:0;font-family:monospace}
  .info{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin:16px 0}
  .info h3{color:#111;font-size:16px;margin:0 0 6px}
  .info p{color:#6b7280;font-size:14px;margin:0}
  .steps{margin:20px 0;padding:0;list-style:none}
  .steps li{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;color:#374151;font-size:14px}
  .steps .n{flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#ccfbf1;color:#0d9488;font-weight:700;font-size:13px;display:inline-flex;align-items:center;justify-content:center}
  .muted{font-size:13px;color:#9ca3af;line-height:1.6}
  .ft{padding:24px 32px;text-align:center;background:#f9fafb;border-top:1px solid #eef2f1}
  .ft .name{color:#0d9488;font-weight:700;font-size:14px;margin:0 0 4px}
  .ft p{color:#9ca3af;font-size:12px;margin:0 0 4px}
  .ft a{color:#0d9488;text-decoration:none}
</style></head><body><div class="wrap"><div class="card">${content}
  <div class="ft"><p class="name">🎓 DataMEAL Academy</p><p>Formation gratuite par projets · KoboCollect · Python · QGIS</p><p>Afrique de l'Ouest · <a href="${SITE_URL}/academy/login">Mon espace étudiant</a></p><p style="margin-top:12px;font-size:11px;color:#d1d5db">Vous recevez cet email car vous avez un compte sur DataMEAL Academy.</p></div>
</div></div></body></html>`;
}

function verifyEmailHtml(name: string, url: string, code?: string) {
  const codeBlock = code ? `<div class="cd" style="text-align:center"><p style="margin:0 0 8px;font-size:13px">Ou entrez ce code dans l'application :</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#16a34a;margin:0">${code}</p></div>` : "";
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="DataMEAL Academy" class="av"><h1>Confirmez votre inscription</h1><p>DataMEAL Academy</p></div><div class="b"><span class="bg">🎓 Bienvenue</span><p>Bonjour ${name},</p><p>Merci de rejoindre <strong>DataMEAL Academy</strong>, la formation gratuite par projets en MEAL (KoboCollect, Python, QGIS) pour l'Afrique de l'Ouest.</p><p>Pour activer votre compte et passer le test d'aptitude, confirmez votre adresse email :</p><p style="text-align:center"><a href="${url}" class="cta">Confirmer mon email</a></p>${codeBlock}<p style="font-size:13px;color:#9ca3af">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p><p>À très vite en cours,<br><strong>L'équipe DataMEAL Academy</strong></p></div>`);
}

function resetEmailHtml(name: string, url: string) {
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="DataMEAL Academy" class="av"><h1>Réinitialisation du mot de passe</h1><p>DataMEAL Academy</p></div><div class="b"><span class="bg">🔑 Sécurité</span><p>Bonjour ${name},</p><p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p><p style="text-align:center"><a href="${url}" class="cta">Réinitialiser mon mot de passe</a></p><p style="font-size:13px;color:#9ca3af">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.</p><p>Cordialement,<br><strong>L'équipe DataMEAL Academy</strong></p></div>`);
}

function newCourseEmailHtml(name: string | undefined, course: { code: string; title: string; description?: string }) {
  const g = name ? `Bonjour ${name},` : "Bonjour,";
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="DataMEAL Academy" class="av"><h1>Nouveau cours disponible</h1><p>DataMEAL Academy</p></div><div class="b"><span class="bg">📚 Nouveau cours</span><p>${g}</p><p>Un nouveau cours vient d'être ajouté à votre académie :</p><div class="cd"><h3>${course.title}</h3>${course.description ? `<p>${course.description}</p>` : ""}<p style="margin-top:8px;font-size:12px;color:#16a34a;font-weight:600">Code : ${course.code}</p></div><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="cta">Découvrir le cours</a></p><p>Bonne formation,<br><strong>L'équipe DataMEAL Academy</strong></p></div>`);
}


// ── Email : projet terminé (100%) ──
function courseCompletedEmailHtml(name: string, course: { code: string; title: string }) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 DATAMEAL ACADEMY</span></div><h1>Bravo, ${name.split(" ")[0]} ! 🏁</h1><p class="sub">Vous avez terminé un projet complet</p></div><div class="bd"><span class="badge">✅ Projet terminé</span><p>Félicitations ${name},</p><p>Vous venez de compléter <strong>100%</strong> du projet :</p><div class="info"><h3>${course.title}</h3><p style="margin-top:10px;font-size:12px;color:#0d9488;font-weight:700">${course.code} · Terminé</p></div><p>C'est une vraie compétence terrain, directement applicable dans les contextes humanitaires et de développement en Afrique de l'Ouest.</p><p><strong>Prochaine étape :</strong> demandez votre attestation de compétence, ou enchaînez sur le projet suivant pour progresser vers le statut de Super-Expert MEAL.</p><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Demander mon attestation</a></p><p class="muted">Continuez sur cette lancée — chaque projet vous rapproche de la maîtrise complète du cycle MEAL.</p></div>`);
}

// ── Email : demande d'attestation reçue (accusé) ──
function attestationRequestedEmailHtml(name: string, course: { code: string; title: string }, certNo: string, score: number) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 DATAMEAL ACADEMY</span></div><h1>Demande reçue 📋</h1><p class="sub">Votre attestation est en cours de validation</p></div><div class="bd"><span class="badge">⏳ En traitement</span><p>Bonjour ${name},</p><p>Nous avons bien reçu votre demande d'attestation pour le projet :</p><div class="info"><h3>${course.title}</h3><p style="margin-top:6px">Score final : <strong style="color:#0d9488">${score}%</strong></p><p style="margin-top:6px;font-size:12px;color:#6b7280">N° de certificat : <span style="font-family:monospace">${certNo}</span></p></div><p>Notre équipe vérifie votre parcours et validera votre attestation sous <strong>24 à 48 heures</strong>. Vous recevrez un email dès qu'elle sera émise.</p><p class="muted">Aucune action n'est requise de votre part pour le moment. Merci de votre patience.</p></div>`);
}

// ── Email : attestation émise (validée par l'admin) ──
function attestationIssuedEmailHtml(name: string, course: { code: string; title: string }, certNo: string, score: number) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 DATAMEAL ACADEMY</span></div><h1>Attestation délivrée ! 🎉</h1><p class="sub">Félicitations pour votre réussite</p></div><div class="bd"><span class="badge">🏆 Certifié</span><p>Bravo ${name},</p><p>Votre attestation de compétence est officiellement délivrée :</p><div class="info" style="text-align:center;border-color:#5eead4;background:#f0fdfa"><h3 style="color:#0d9488">${course.title}</h3><p style="margin-top:8px">Score final : <strong style="font-size:18px;color:#0d9488">${score}%</strong></p><p style="margin-top:10px;font-size:12px;color:#6b7280">Certificat N° <span style="font-family:monospace;font-weight:700">${certNo}</span></p></div><p>Vous pouvez désormais valoriser cette compétence dans votre CV, sur LinkedIn et auprès de vos employeurs. Ce certificat atteste de votre maîtrise pratique des outils MEAL.</p><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Voir mon attestation</a></p><p class="muted">Conservez votre numéro de certificat — il permet de vérifier l'authenticité de votre attestation.</p></div>`);
}

// ── Email : attestation refusée (complément requis) ──
function attestationRejectedEmailHtml(name: string, course: { code: string; title: string }) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 DATAMEAL ACADEMY</span></div><h1>Complément requis</h1><p class="sub">Votre attestation nécessite une vérification</p></div><div class="bd"><span class="badge">📝 À compléter</span><p>Bonjour ${name},</p><p>Après examen de votre demande d'attestation pour <strong>${course.title}</strong>, notre équipe a besoin que vous complétiez ou révisiez certains éléments du projet avant de pouvoir délivrer le certificat.</p><p>Reconnectez-vous à votre espace pour revoir le projet et le finaliser. Vous pourrez ensuite soumettre à nouveau votre demande.</p><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Revoir mon projet</a></p><p class="muted">Besoin d'aide ? Répondez simplement à cet email, nous vous accompagnerons.</p></div>`);
}


// ══════════════ Certificats téléchargeables (A4 paysage, signés) ══════════════
const SIGNATURE_B64 = "data:image/png;base64,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";

function certificateHtml(opts: {
  name: string; type: "admission" | "final"; certNo: string;
  score?: number; issuedAt: string; expiresAt?: string | null;
}) {
  const isFinal = opts.type === "final";
  const title = isFinal ? "Certificat de Réussite" : "Attestation d'Admission";
  const kicker = isFinal ? "SUPER-EXPERT MEAL" : "PROGRAMME MEAL · ADMISSION";
  const subtitle = isFinal
    ? "a complété avec succès l'intégralité du parcours par projets et démontré sa maîtrise opérationnelle du cycle MEAL."
    : "est admis(e) au programme de formation MEAL par projets de DataMEAL Academy.";
  const issued = new Date(opts.issuedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const expires = opts.expiresAt ? new Date(opts.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

  // Les 3 projets + ce qu'ils permettent de faire
  const courses = [
    { code: "01", t: "KoboCollect", v: "Concevoir & déployer des enquêtes terrain" },
    { code: "02", t: "QGIS", v: "Cartographier & analyser les données spatiales" },
    { code: "03", t: "Pipeline MEAL", v: "Automatiser le reporting de bout en bout" },
  ];
  const coursesHtml = courses.map(c => `
    <div class="course">
      <div class="course-num">${c.code}</div>
      <div class="course-txt"><strong>${c.t}</strong><span>${c.v}</span></div>
    </div>`).join("");
  const skillsLine = isFinal
    ? "Compétences certifiées : collecte numérique de données, cartographie SIG, analyse Python, automatisation et reporting pour le suivi-évaluation humanitaire et de développement."
    : "Parcours couvrant la collecte de données (KoboCollect), la cartographie (QGIS) et l'automatisation du reporting MEAL.";

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title} — ${opts.name}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#cbd5e1; }
  .sheet { width:297mm; height:210mm; background:#fff; margin:0 auto; position:relative; overflow:hidden; }
  /* fond SVG moderne */
  .bg { position:absolute; inset:0; z-index:0; }
  .frame { position:absolute; inset:7mm; border:1.5px solid rgba(13,148,136,.25); border-radius:4mm; z-index:1; }
  .content { position:absolute; inset:7mm; z-index:2; display:flex; flex-direction:column; padding:13mm 16mm 10mm; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; }
  .brand { display:flex; align-items:center; gap:9px; }
  .brand-logo { width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,#0d9488,#0f766e); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:17px; }
  .brand-txt b { font-size:15px; color:#0f172a; letter-spacing:.5px; display:block; }
  .brand-txt span { font-size:9px; color:#64748b; letter-spacing:2px; }
  .kicker { font-size:9px; font-weight:700; letter-spacing:3px; color:#0d9488; background:#f0fdfa; border:1px solid #99f6e4; padding:4px 11px; border-radius:20px; }
  .head { margin-top:9mm; }
  .ttl { font-size:42px; font-weight:800; color:#0f172a; letter-spacing:-.5px; line-height:1; }
  .ttl em { color:#0d9488; font-style:normal; }
  .pre { font-size:12px; color:#64748b; margin-top:5mm; letter-spacing:.5px; }
  .name { font-family:Georgia,serif; font-size:38px; color:#0f766e; font-weight:bold; margin-top:2mm; }
  .name-rule { width:78mm; height:2px; background:linear-gradient(90deg,#0d9488,transparent); margin-top:2.5mm; }
  .sub { font-size:13px; color:#334155; margin-top:4mm; max-width:165mm; line-height:1.6; }
  /* 3 cours */
  .courses { display:flex; gap:5mm; margin-top:6mm; }
  .course { flex:1; display:flex; align-items:center; gap:7px; background:#f8fafc; border:1px solid #e2e8f0; border-left:3px solid #0d9488; border-radius:7px; padding:7px 9px; }
  .course-num { font-size:15px; font-weight:800; color:#0d9488; opacity:.5; }
  .course-txt { display:flex; flex-direction:column; }
  .course-txt strong { font-size:12px; color:#0f172a; }
  .course-txt span { font-size:8.5px; color:#64748b; line-height:1.3; }
  .skills { font-size:9.5px; color:#94a3b8; margin-top:4mm; max-width:200mm; line-height:1.5; font-style:italic; }
  /* footer */
  .footer { margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end; }
  .sig { text-align:center; }
  .sig img { height:19mm; margin-bottom:-3mm; }
  .sig-name { border-top:1.5px solid #0f172a; padding-top:2mm; font-size:12px; font-weight:700; color:#0f172a; min-width:62mm; }
  .sig-role { font-size:9px; color:#64748b; margin-top:1px; }
  .sig-role b { color:#0d9488; }
  .meta { text-align:center; font-size:9px; color:#94a3b8; line-height:1.7; }
  .meta .valid { color:#d97706; font-weight:600; }
  .meta .no { font-family:monospace; color:#0d9488; font-weight:700; }
  .meta .site { color:#0d9488; font-weight:600; }
  .badge-seal { width:30mm; height:30mm; position:relative; }
  ${opts.score != null ? '.score { position:absolute; top:13mm; right:16mm; text-align:center; z-index:3; }\n  .score-ring { width:20mm; height:20mm; border-radius:50%; border:2.5px solid #0d9488; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f0fdfa; }\n  .score-ring b { font-size:17px; color:#0d9488; font-weight:800; line-height:1; }\n  .score-ring span { font-size:7px; color:#64748b; letter-spacing:1px; }' : ''}
  @media print { body{background:#fff;} .no-print{display:none;} }
  .no-print { position:fixed; top:12px; right:12px; z-index:99; }
  .btn { background:#0d9488; color:#fff; border:none; padding:11px 22px; border-radius:9px; font-size:14px; cursor:pointer; font-weight:600; box-shadow:0 4px 14px rgba(13,148,136,.4); }
</style></head><body>
<div class="no-print"><button class="btn" onclick="window.print()">⬇ Télécharger en PDF</button></div>
<div class="sheet">
  <svg class="bg" viewBox="0 0 297 210" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0d9488" stop-opacity="0.06"/><stop offset="1" stop-color="#0d9488" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#7c3aed" stop-opacity="${isFinal ? '0.07' : '0'}"/><stop offset="1" stop-color="#0d9488" stop-opacity="0.05"/>
      </linearGradient>
    </defs>
    <rect width="297" height="210" fill="#ffffff"/>
    <path d="M0 0 L120 0 L0 95 Z" fill="url(#g1)"/>
    <path d="M297 210 L180 210 L297 110 Z" fill="url(#g2)"/>
    <circle cx="268" cy="34" r="55" fill="none" stroke="#0d9488" stroke-opacity="0.05" stroke-width="14"/>
    <path d="M0 170 Q75 150 150 175 T297 168" fill="none" stroke="#0d9488" stroke-opacity="0.08" stroke-width="1"/>
  </svg>
  <div class="frame"></div>
  ${opts.score != null ? `<div class="score"><div class="score-ring"><b>${opts.score}%</b><span>SCORE</span></div></div>` : ""}
  <div class="content">
    <div class="top">
      <div class="brand">
        <div class="brand-logo">D</div>
        <div class="brand-txt"><b>DataMEAL Academy</b><span>FORMATION MEAL · AFRIQUE DE L'OUEST</span></div>
      </div>
      <div class="kicker">${kicker}</div>
    </div>
    <div class="head">
      <div class="ttl">${isFinal ? '<em>Certificat</em> de Réussite' : "<em>Attestation</em> d'Admission"}</div>
      <p class="pre">CE DOCUMENT CERTIFIE QUE</p>
      <div class="name">${opts.name}</div>
      <div class="name-rule"></div>
      <p class="sub">${subtitle}</p>
    </div>
    <div class="courses">${coursesHtml}</div>
    <p class="skills">${skillsLine}</p>
    <div class="footer">
      <div class="sig">
        <img src="${SIGNATURE_B64}" alt="signature"/>
        <div class="sig-name">TATCHIDA Issodo Louis</div>
        <div class="sig-role"><b>Ingénieur Agritech &amp; Data Science</b> · Finance agricole · Consultant</div>
      </div>
      <div class="meta">
        <p>Délivré le ${issued}</p>
        ${expires ? `<p class="valid">Valable jusqu'au ${expires}</p>` : `<p class="valid">Certification permanente</p>`}
        <p>Certificat N° <span class="no">${opts.certNo}</span></p>
        <p class="site">Vérifiable sur louisfarm.com/academy/verify-certificate</p>
      </div>
      <svg class="badge-seal" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#0d9488" stroke-width="2"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#0d9488" stroke-width="0.8" stroke-dasharray="2 2"/>
        <circle cx="50" cy="50" r="30" fill="#0d9488"/>
        <text x="50" y="46" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Arial">DATAMEAL</text>
        <text x="50" y="57" font-size="7" fill="#fff" text-anchor="middle" font-family="Arial">★ TOGO ★</text>
        <text x="50" y="14" font-size="6" fill="#0d9488" text-anchor="middle" font-family="Arial" font-weight="bold">CERTIFIÉ</text>
      </svg>
    </div>
  </div>
</div>
</body></html>`;
}

// Certificat d'admission (HTML téléchargeable)
app.get("/api/academy/certificate/admission", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data: stud } = await supabase.from("students")
    .select("full_name, admitted_at, admission_expires, entry_score").eq("id", sid).single();
  if (!stud?.admitted_at) return res.status(403).send("Vous n'êtes pas encore admis(e).");
  const { data: cert } = await supabase.from("attestations")
    .select("certificate_no").eq("student_id", sid).eq("cert_type", "admission").maybeSingle();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(certificateHtml({
    name: stud.full_name, type: "admission",
    certNo: cert?.certificate_no || `DMA-ADM-${sid}`,
    score: Math.round((stud.entry_score ?? 0) / 30 * 100),
    issuedAt: stud.admitted_at, expiresAt: stud.admission_expires,
  }));
});

// Certificat final (HTML téléchargeable)
app.get("/api/academy/certificate/final", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data: stud } = await supabase.from("students")
    .select("full_name, final_certificate_no, final_certified_at").eq("id", sid).single();
  if (!stud?.final_certificate_no) return res.status(403).send("Vous devez terminer les 3 cours pour obtenir le certificat final.");
  const { data: allGrades } = await supabase.from("grades").select("score, max_score").eq("student_id", sid);
  const ga = allGrades || [];
  const avg = ga.length ? Math.round(ga.reduce((a, g) => a + Number(g.score) / Number(g.max_score) * 100, 0) / ga.length) : 0;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(certificateHtml({
    name: stud.full_name, type: "final",
    certNo: stud.final_certificate_no, score: avg, issuedAt: stud.final_certified_at,
  }));
});

function finalCertEmailHtml(name: string, certNo: string, avg: number) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 DATAMEAL ACADEMY</span></div><h1>Super-Expert MEAL ! 🎓</h1><p class="sub">Vous avez terminé les 3 projets</p></div><div class="bd"><span class="badge">🏆 Certificat final</span><p>Félicitations ${name},</p><p>Vous avez complété l'intégralité du programme DataMEAL Academy — KoboCollect, QGIS et Reporting automatisé. Vous êtes désormais <strong>Super-Expert MEAL</strong>.</p><div class="info" style="text-align:center;border-color:#5eead4;background:#f0fdfa"><p style="margin:0">Moyenne générale : <strong style="font-size:20px;color:#0d9488">${avg}%</strong></p><p style="margin-top:8px;font-size:12px;color:#6b7280">Certificat N° <span style="font-family:monospace;font-weight:700">${certNo}</span></p></div><p style="text-align:center"><a href="${SITE_URL}/academy/profile" class="btn">Télécharger mon certificat</a></p><p class="muted">Votre certificat A4 est téléchargeable depuis votre profil, signé et prêt à valoriser.</p></div>`);
}


// ── Email : admission réussie (félicitations + lien attestation) ──
function admissionPassedEmailHtml(name: string, scorePct: number, expiresIso: string, certUrl: string) {
  const expires = new Date(expiresIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 DATAMEAL ACADEMY</span></div><h1>Félicitations, ${name.split(" ")[0]} ! 🎉</h1><p class="sub">Vous êtes officiellement admis(e)</p></div><div class="bd"><span class="badge">✅ Admission confirmée</span><p>Bonjour ${name},</p><p>Excellente nouvelle : vous avez réussi le test d'admission avec un score de <strong style="color:#0d9488">${scorePct}%</strong> et êtes désormais admis(e) au programme <strong>DataMEAL Academy</strong> !</p><div class="info" style="text-align:center;border-color:#5eead4;background:#f0fdfa"><p style="margin:0;font-size:14px">Votre attestation d'admission est prête</p><p style="margin-top:6px;font-size:12px;color:#6b7280">Valable jusqu'au ${expires}</p></div><p style="text-align:center"><a href="${certUrl}" class="btn">📄 Télécharger mon attestation (A4)</a></p><ul class="steps"><li><span class="n">1</span><span>Une leçon se débloque chaque semaine, dès aujourd'hui</span></li><li><span class="n">2</span><span>Vous avez une semaine par leçon (sinon recalé)</span></li><li><span class="n">3</span><span>Terminez les 3 projets pour décrocher le certificat final de Super-Expert MEAL</span></li></ul><p class="muted">Votre attestation est aussi téléchargeable à tout moment depuis votre profil. Bonne formation !</p></div>`);
}

// ── Vérification PUBLIQUE d'un certificat (style Credly, sans authentification) ──
app.get("/api/academy/verify-certificate/:certNo", rateLimit(30, 5 * 60 * 1000), async (req, res) => {
  const certNo = req.params.certNo;
  if (!certNo || certNo.length > 60) return res.status(400).json({ valid: false, message: "Numéro invalide." });

  // Chercher dans les attestations
  const { data: att } = await supabase.from("attestations")
    .select("certificate_no, cert_type, final_score, issued_at, expires_at, status, students(full_name), sms_courses(code, title)")
    .eq("certificate_no", certNo).maybeSingle();

  // Chercher aussi le certificat final stocké sur l'étudiant
  let final: any = null;
  if (!att) {
    const { data: stud } = await supabase.from("students")
      .select("full_name, final_certificate_no, final_certified_at").eq("final_certificate_no", certNo).maybeSingle();
    if (stud) final = stud;
  }

  if (!att && !final) {
    return res.json({ valid: false, message: "Aucun certificat ne correspond à ce numéro." });
  }

  if (att) {
    const expired = att.expires_at && new Date(att.expires_at) < new Date();
    const typeLabel = att.cert_type === "admission" ? "Attestation d'admission"
      : att.cert_type === "final" ? "Certificat Super-Expert MEAL"
      : `Attestation — ${(att as any).sms_courses?.title || "Cours"}`;
    return res.json({
      valid: !expired && att.status !== "rejected",
      holder: (att as any).students?.full_name || "—",
      type: typeLabel,
      certificate_no: att.certificate_no,
      score: att.final_score ?? null,
      issued_at: att.issued_at,
      expires_at: att.expires_at,
      status: expired ? "expired" : (att.status || "issued"),
      issuer: "DataMEAL Academy",
    });
  }

  return res.json({
    valid: true,
    holder: final.full_name,
    type: "Certificat Super-Expert MEAL",
    certificate_no: final.final_certificate_no,
    issued_at: final.final_certified_at,
    expires_at: null,
    status: "issued",
    issuer: "DataMEAL Academy",
  });
});

function meetingEmailHtml(name: string, title: string, startsAt: string, kind: string) {
  const when = new Date(startsAt).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  const label = kind === "webinar" ? "webinaire" : "rencontre interactive";
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>📅 DATAMEAL ACADEMY</span></div><h1>Rencontre en ligne planifiée</h1><p class="sub">${label}</p></div><div class="bd"><p>Bonjour ${name},</p><p>Une nouvelle ${label} est programmée :</p><div class="info" style="border-color:#5eead4;background:#f0fdfa"><p style="margin:0;font-size:15px;font-weight:700;color:#0d9488">${title}</p><p style="margin-top:8px;font-size:13px;color:#334155">🕒 ${when}</p></div><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Voir mes rencontres</a></p><p class="muted">Connectez-vous à votre tableau de bord pour rejoindre la session le moment venu. Aucun logiciel à installer — tout se passe dans le navigateur.</p></div>`);
}

// ══════════════ Rencontres en ligne (Jitsi Meet) ══════════════
// Salle Jitsi : on génère un room_name unique et imprévisible (sécurité par obscurité + admission requise)

// ── Liste des sessions à venir / en cours (étudiant admis) ──
app.get("/api/academy/meetings", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  // Seuls les admis voient les rencontres
  const { data: stud } = await supabase.from("students").select("admitted_at").eq("id", sid).single();
  if (!stud?.admitted_at) return res.json({ meetings: [], admitted: false });
  const { data } = await supabase.from("academy_meetings")
    .select("*, sms_courses(code, title)")
    .neq("status", "cancelled")
    .gte("starts_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // garde celles des 6 dernières heures
    .order("starts_at", { ascending: true });
  res.json({ meetings: data || [], admitted: true });
});

// ── Détail d'une session + jeton de salle (étudiant admis) ──
app.get("/api/academy/meetings/:id", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data: stud } = await supabase.from("students").select("admitted_at, full_name").eq("id", sid).single();
  if (!stud?.admitted_at) return res.status(403).json({ message: "Réservé aux étudiants admis." });
  const { data: m } = await supabase.from("academy_meetings").select("*").eq("id", Number(req.params.id)).maybeSingle();
  if (!m) return res.status(404).json({ message: "Session introuvable." });
  if (m.status === "cancelled") return res.status(410).json({ message: "Cette session a été annulée." });
  res.json({ meeting: m, displayName: stud.full_name, moderator: false });
});

// ── Admin : lister toutes les sessions ──
app.get("/api/admin/academy/meetings", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("academy_meetings")
    .select("*, sms_courses(code, title)").order("starts_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data || []);
});

// ── Admin : créer une session ──
app.post("/api/admin/academy/meetings", requireAuth, async (req, res) => {
  const { title, description, kind, starts_at, duration_min, course_id } = req.body;
  if (!title || !starts_at) return res.status(400).json({ message: "Titre et date requis." });
  // room_name unique et difficile à deviner
  const slug = String(title).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const room_name = `datameal-${slug}-${crypto.randomBytes(4).toString("hex")}`;
  const { data, error } = await supabase.from("academy_meetings")
    .insert({ title, description, kind: kind || "meeting", starts_at, duration_min: duration_min || 60, course_id: course_id || null, room_name, status: "scheduled" })
    .select().single();
  if (error) return res.status(400).json({ message: error.message });

  // Notifier les étudiants admis qui acceptent les emails
  try {
    const { data: students } = await supabase.from("students")
      .select("email, full_name, course_emails").not("admitted_at", "is", null);
    const recipients = (students || []).filter((s: any) => s.course_emails !== false && s.email);
    for (const s of recipients) {
      sendAcademyEmail({
        to: s.email, type: "meeting_scheduled",
        subject: `📅 Nouvelle rencontre en ligne : ${title}`,
        html: meetingEmailHtml(s.full_name, title, starts_at, kind || "meeting"),
        dedupeKey: `meeting:${data.id}:${s.email}`,
      });
    }
  } catch { /* notification best-effort */ }

  res.status(201).json(data);
});

// ── Admin : modifier le statut (live/ended/cancelled) ──
app.put("/api/admin/academy/meetings/:id", requireAuth, async (req, res) => {
  const { status, title, description, starts_at, duration_min, kind } = req.body;
  const update: any = {};
  if (status) update.status = status;
  if (title) update.title = title;
  if (description !== undefined) update.description = description;
  if (starts_at) update.starts_at = starts_at;
  if (duration_min) update.duration_min = duration_min;
  if (kind) update.kind = kind;
  const { data, error } = await supabase.from("academy_meetings").update(update).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

// ── Admin : supprimer une session ──
app.delete("/api/admin/academy/meetings/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("academy_meetings").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Supprimée" });
});

export default app;
