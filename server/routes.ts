import type { Express } from "express";
import type { Server } from "http";
import { supabase } from "./supabase";
import { registerAdminRoutes } from "./admin-routes";
import { registerUploadRoutes } from "./upload";
import { sendWelcomeEmail, sendPublicationNotification } from "./email";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Admin panel routes
  registerAdminRoutes(app);
  registerUploadRoutes(app);

  // ── Posts ──
  app.get("/api/posts", async (_req, res) => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("published_at", { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  });

  app.get("/api/posts/:slug", async (req, res) => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", req.params.slug)
      .single();
    if (error) return res.status(404).json({ message: "Post not found" });
    res.json(data);
  });

  // ── Search ──
  app.get("/api/search", async (req, res) => {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json([]);
    const { data, error } = await supabase.rpc("search_posts", { search_query: q });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  });

  // ── Comments ──
  app.get("/api/posts/:postId/comments", async (req, res) => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", Number(req.params.postId))
      .eq("status", "approved")
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  });

  app.post("/api/posts/:postId/comments", async (req, res) => {
    const { author_name, content } = req.body;
    if (!author_name || !content) {
      return res.status(400).json({ message: "author_name and content required" });
    }
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: Number(req.params.postId), author_name, content })
      .select()
      .single();
    if (error) return res.status(400).json({ message: error.message });
    res.status(201).json(data);
  });

  // ── Publications ──
  app.get("/api/publications", async (_req, res) => {
    const { data, error } = await supabase
      .from("publications")
      .select("*")
      .order("year", { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  });

  // ── Appointments ──
  app.post("/api/appointments", async (req, res) => {
    const { name, email, date, topic } = req.body;
    if (!name || !email || !date || !topic) {
      return res.status(400).json({ message: "All fields required" });
    }
    const { data, error } = await supabase
      .from("appointments")
      .insert({ name, email, date, topic })
      .select()
      .single();
    if (error) return res.status(400).json({ message: error.message });
    res.status(201).json(data);
  });

  // ── Newsletter ──
  app.post("/api/subscribe", async (req, res) => {
    const { email, name, source } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });
    const { data, error } = await supabase
      .from("subscribers")
      .insert({ email, name: name || null, source: source || "website" })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ message: "Already subscribed" });
      return res.status(400).json({ message: error.message });
    }
    sendWelcomeEmail(email, name).catch(() => {});
    res.status(201).json(data);
  });

  // ── Contact ──
  app.post("/api/contact", async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields required" });
    }
    const { data, error } = await supabase
      .from("contact_messages")
      .insert({ name, email, subject, message })
      .select()
      .single();
    if (error) return res.status(400).json({ message: error.message });
    res.status(201).json(data);
  });

  // ── Profile (public) ──
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

  // ── Health ──
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
    const siteUrl = "https://portefolio-virid-chi.vercel.app";
    const items = (posts || []).map(p => `<item><title><![CDATA[${p.title}]]></title><link>${siteUrl}/blog/${p.slug}</link><description><![CDATA[${p.summary || ""}]]></description><pubDate>${p.published_at ? new Date(p.published_at).toUTCString() : ""}</pubDate><guid>${siteUrl}/blog/${p.slug}</guid>${p.tags?.map((t: string) => `<category>${t}</category>`).join("") || ""}</item>`).join("\n");
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Louis TATCHIDA — Blog</title><link>${siteUrl}/blog</link><description>Articles et pensées sur l'agriculture durable, la finance agricole et la digitalisation rurale.</description><language>fr</language><atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml"/>${items}</channel></rss>`);
  });

  // ── Sitemap ──
  app.get("/api/sitemap.xml", async (_req, res) => {
    const siteUrl = "https://portefolio-virid-chi.vercel.app";
    const staticPages = ["/", "/about", "/research", "/publications", "/blog", "/booking", "/contact", "/stats"];
    const { data: posts } = await supabase.from("posts").select("slug, published_at").order("published_at", { ascending: false });
    const urls = staticPages.map(p => `<url><loc>${siteUrl}${p}</loc><changefreq>${p === "/" ? "weekly" : "monthly"}</changefreq><priority>${p === "/" ? "1.0" : "0.8"}</priority></url>`);
    (posts || []).forEach(p => urls.push(`<url><loc>${siteUrl}/blog/${p.slug}</loc><lastmod>${p.published_at ? new Date(p.published_at).toISOString().split("T")[0] : ""}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`));
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  });

  return httpServer;
}
