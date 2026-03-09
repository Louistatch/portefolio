import type { Express } from "express";
import type { Server } from "http";
import { supabase } from "./supabase";
import { registerAdminRoutes } from "./admin-routes";
import { registerUploadRoutes } from "./upload";

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
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });
    const { data, error } = await supabase
      .from("subscribers")
      .insert({ email })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ message: "Already subscribed" });
      return res.status(400).json({ message: error.message });
    }
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

  // ── Health ──
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
