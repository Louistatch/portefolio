import type { Express } from "express";
import { supabase } from "./supabase";
import { requireAuth, verifyCredentials, generateToken, ensureAdminExists } from "./auth";
import bcrypt from "bcryptjs";

export function registerAdminRoutes(app: Express) {
  // Ensure default admin exists on startup
  ensureAdminExists();

  // ── Auth ──
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await verifyCredentials(username, password);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const token = generateToken(user.id, user.username);
    res.json({ token, username: user.username });
  });

  app.get("/api/admin/me", requireAuth, (req, res) => {
    res.json((req as any).admin);
  });

  app.post("/api/admin/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const admin = (req as any).admin;
    const user = await verifyCredentials(admin.username, currentPassword);
    if (!user) return res.status(400).json({ message: "Current password incorrect" });
    const hash = await bcrypt.hash(newPassword, 10);
    await supabase.from("admin_users").update({ password_hash: hash }).eq("id", admin.id);
    res.json({ message: "Password changed" });
  });

  // ── Posts CRUD ──
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

  // ── Publications CRUD ──
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

  // ── Appointments (read + update status) ──
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

  // ── Contact Messages (pro management) ──
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

  // ── Subscribers (pro management) ──
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
    const csv = "email,name,source,subscribed_at\n" + (data || []).map(s => `"${s.email}","${s.name || ""}","${s.source}","${s.created_at}"`).join("\n");
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

  // ── Comments moderation (pro) ──
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

  // ── Newsletter Campaigns ──
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

  // ── Profile ──
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

  // ── Dashboard stats ──
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
      posts: posts.count || 0,
      publications: pubs.count || 0,
      appointments: appts.count || 0,
      messages: msgs.count || 0,
      subscribers: subs.count || 0,
      comments: comments.count || 0,
    });
  });
}
