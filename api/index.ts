import express, { type Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
// Extension .js obligatoire : le paquet est en "type": "module", et Node ESM ne devine pas
// l'extension d'un import relatif. Sans elle, le chargement de la fonction échoue en
// production (ERR_MODULE_NOT_FOUND) alors que le build, lui, passe sans broncher.
import {
  gradeLessonExercises, stripExerciseAnswers, EXERCISE_PASS_PCT,
  plafondDeNote, resultatsSansCorrection,
} from "../shared/exercises.js";
import { programOf, programById, PROGRAMS, type Program } from "../shared/programs.js";
import { leconOuverte } from "../shared/rythme.js";
import { raisonDeNePasNotifier, FENETRE_NOTIF_FORUM_MS } from "../shared/notifications.js";
import { RETARD_EXCLUSION_JOURS, RETARD_PALIERS, alerteDeRetard } from "../shared/retard.js";
import {
  diagnostiquer, repondre, intentionDe, laDate,
  type ContexteSupport, type Constat,
} from "../shared/support.js";
import { TESTS_PARCOURS, type TestParcours } from "./program-tests.js";
import { qrSvg, urlVerification } from "./qr.js";
import {
  creerTransaction, verifierSignature, transactionEstPayee, environnementFedapay,
} from "./fedapay.js";
import {
  GROUP_WORKS, GROUP_WORK_WINDOW_WEEKS, GROUP_TARGET_SIZE, GROUP_MAX_MEMBERS,
  GROUP_WORK_ELIGIBILITY_WEEKS, GROUP_FORMATION_LEAD_WEEKS,
  PEER_REVIEW_CRITERIA, PEER_REVIEW_MAX_PER_CRITERION, INSTRUCTOR_RUBRIC,
  SUBMISSION_INSTRUCTIONS, groupNameFor, cohortOf,
} from "../shared/groupwork.js";

// ── Supabase client ──
// Service_role obligatoire côté serveur : plus AUCUNE table du schéma public ne
// porte de policy — voir supabase/rls_suppression_policies_publiques.sql. La clé
// anon ne peut donc plus rien lire nulle part.
//
// Le repli sur la clé anon reste utile en local, mais il ne doit jamais servir en
// production : il ne provoquerait pas d'erreur au démarrage, seulement des routes
// qui répondent 200 avec des listes vides et des connexions étudiant qui échouent
// sans raison lisible. On préfère refuser de démarrer.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const enProduction = !!process.env.VERCEL || process.env.NODE_ENV === "production";
if (enProduction && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY est absente. Sans elle l'API tomberait sur la clé anon, " +
    "qui n'a accès à aucune table depuis la fermeture des policies : toutes les données " +
    "apparaîtraient vides. Définissez-la dans les variables d'environnement Vercel.",
  );
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error("VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY en dev) doivent être définis dans les variables d'environnement.");
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Email (Resend) ──
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "Louis TATCHIDA <contact@louisfarm.com>";
const SITE_URL = process.env.SITE_URL || "https://louisfarm.com";

// ── Clé de réponses du test d'admission (SERVEUR — jamais exposée au client) ──
const ADMISSION_ANSWER_KEY: number[] = [1, 2, 1, 3, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1];
const ADMISSION_PASS_SCORE = 21;

// ── Auth helpers ──
// Le type est annoncé `string`, pas `string | undefined`, et c'est le rôle de la fonction :
// le `throw` garantit déjà qu'on n'arrive jamais ici sans secret, mais TypeScript ne suivait
// pas cette garantie jusque dans le corps des fonctions. D'où quatre `jwt.verify` signalés
// depuis toujours comme « aucune surcharge ne correspond », qui masquaient les vraies erreurs
// dans le bruit. Le comportement à l'exécution est identique : on refuse de démarrer.
const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[SECURITE] JWT_SECRET non défini — définissez-le dans les variables d'environnement Vercel.");
  }
  return secret;
})();

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
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as any;
    if (decoded.role === "student") return res.status(403).json({ message: "Admin access required" });
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

const app = express();
// `verify` conserve le corps EXACT, octet pour octet, avant analyse.
//
// La signature d'un webhook porte sur la chaîne reçue, pas sur l'objet obtenu après
// analyse : re-sérialiser JSON.stringify(req.body) donne un texte différent — ordre des
// clés, échappement Unicode, espaces — et la signature ne concordera jamais. C'est
// l'erreur classique de ce type d'intégration, et elle se manifeste par un « ça marche en
// test, ça échoue en production » sans explication.
app.use(express.json({
  limit: "5mb",
  verify: (req, _res, buf) => { (req as any).corpsBrut = buf.toString("utf8"); },
}));
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
// Deux chemins, et ce n'est pas de la coquetterie : une réécriture Vercel vers une fonction
// conserve le chemin demandé par le client et ne s'en sert que pour choisir la fonction. La
// règle `/sitemap.xml` → `/api/sitemap.xml` fait donc arriver ici une requête dont l'URL est
// « /sitemap.xml », que la seule route « /api/sitemap.xml » ne captait pas : l'adresse
// publique répondait 404 « Cannot GET /sitemap.xml ».
app.get(["/sitemap.xml", "/api/sitemap.xml"], async (_req, res) => {
  const staticPages = ["/", "/about", "/research", "/publications", "/blog", "/faq", "/booking", "/contact", "/stats", "/elearning"];
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
  const hash = await bcrypt.hash(newPassword, 12);
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
  const { subject, content, target_source } = req.body;
  if (!subject || !content) return res.status(400).json({ message: "Subject and content required" });
  const { data, error } = await supabase.from("newsletter_campaigns")
    .insert({ subject, content, target_source: target_source || null }).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});
app.put("/api/admin/campaigns/:id", requireAuth, async (req, res) => {
  const { subject, content, target_source } = req.body;
  const { data, error } = await supabase.from("newsletter_campaigns")
    .update({ subject, content, target_source: target_source || null })
    .eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

// Groupes d'abonnés (valeurs distinctes de subscribers.source), pour cibler une campagne.
app.get("/api/admin/subscriber-sources", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("subscribers").select("source").eq("status", "active");
  if (error) return res.status(500).json({ message: error.message });
  const counts: Record<string, number> = {};
  for (const r of data || []) counts[(r as any).source || "website"] = (counts[(r as any).source || "website"] || 0) + 1;
  res.json(Object.entries(counts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count));
});
app.post("/api/admin/campaigns/:id/send", requireAuth, async (req, res) => {
  // Get campaign content
  const { data: campaign } = await supabase.from("newsletter_campaigns").select("*").eq("id", Number(req.params.id)).single();
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  // Ciblage : une campagne sans target_source part à tous les abonnés actifs (comportement
  // historique) ; avec, elle ne part qu'au groupe visé. Sans ce filtre, un message destiné
  // aux 42 étudiants d'une formation partait aussi aux abonnés de la newsletter générale.
  let query = supabase.from("subscribers").select("email, name").eq("status", "active");
  if (campaign.target_source) query = query.eq("source", campaign.target_source);
  const { data: subs, error: subsError } = await query;
  if (subsError) return res.status(500).json({ message: subsError.message });
  const count = subs?.length || 0;

  // Ne pas marquer « envoyée » une campagne qui n'a atteint personne : le statut est
  // définitif côté interface, et une cible mal orthographiée passerait pour un succès.
  if (!count) return res.status(400).json({
    message: campaign.target_source
      ? `Aucun abonné actif dans le groupe « ${campaign.target_source} » — rien n'a été envoyé.`
      : "Aucun abonné actif — rien n'a été envoyé.",
  });
  if (!resend) return res.status(503).json({ message: "Service d'envoi non configuré — rien n'a été envoyé." });

  for (let i = 0; i < subs!.length; i += 50) {
    const batch = subs!.slice(i, i + 50).map((s: any) => ({
      from: FROM_EMAIL, to: s.email,
      subject: campaign.subject,
      html: campaignEmailHtml(s.name, campaign.subject, campaign.content),
    }));
    await resend.batch.send(batch).catch((e: any) => console.error("Campaign send error:", e));
  }

  const { data, error } = await supabase.from("newsletter_campaigns").update({ status: "sent", recipients_count: count, sent_at: new Date().toISOString() }).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  const cible = campaign.target_source ? ` du groupe « ${campaign.target_source} »` : "";
  res.json({ ...data, message: `Campagne envoyée à ${count} abonné${count > 1 ? "s" : ""}${cible}` });
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

/**
 * Compteurs des pastilles de navigation et de la cloche de notifications.
 *
 * Volontairement séparé du tableau de bord : ces chiffres sont affichés sur TOUTES les pages
 * de l'administration, alors que le tableau de bord n'est chargé que sur la sienne. Les
 * mêler obligerait chaque écran à rapatrier des séries temporelles dont il n'a que faire.
 *
 * Une pastille ne compte que ce qui appelle une action — un message non lu, un commentaire
 * à modérer — jamais un total. Une pastille qui affiche « 42 » en permanence cesse d'être
 * regardée.
 */
app.get("/api/admin/badges", requireAuth, async (_req, res) => {
  const [messages, commentaires, rdv, etudiants, support] = await Promise.all([
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("email_verified", false),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("statut", "ouvert"),
  ]);
  const b = {
    messagesNonLus: messages.count || 0,
    commentairesEnAttente: commentaires.count || 0,
    rendezVousEnAttente: rdv.count || 0,
    emailsNonVerifies: etudiants.count || 0,
    ticketsOuverts: support.count || 0,
  };
  res.json({
    ...b,
    total: b.messagesNonLus + b.commentairesEnAttente + b.rendezVousEnAttente
         + b.emailsNonVerifies + b.ticketsOuverts,
  });
});

/**
 * Tableau de bord de l'administration — tout ce que l'écran affiche, en un appel.
 *
 * Les chiffres viennent tous de la base. Aucune valeur n'est estimée ni arrondie à la
 * hausse : un tableau de bord dont on doit se méfier ne sert à rien.
 *
 * `?jours=` fixe la fenêtre d'analyse (7, 30 ou 90). Les tendances comparent cette fenêtre
 * à celle qui la précède immédiatement, de même durée.
 */
app.get("/api/admin/dashboard", requireAuth, async (req, res) => {
  const jours = Math.min(365, Math.max(1, Number(req.query.jours) || 30));
  const J = 86400000;
  const now = Date.now();
  const debut = new Date(now - jours * J);
  const debutPrecedent = new Date(now - 2 * jours * J);

  const [studentsQ, enrollmentsQ, coursesQ, subscribersQ, attestationsQ, messagesQ, commentsQ, tachesQ, enAttenteQ] = await Promise.all([
    supabase.from("students").select("id, full_name, email, created_at, status, admitted_at, admission_expires, entry_score, email_verified, final_certificate_no, final_certified_at"),
    supabase.from("enrollments").select("student_id, course_id, progress, status"),
    supabase.from("sms_courses").select("id, code, title, is_published"),
    supabase.from("subscribers").select("source, status, created_at"),
    supabase.from("attestations").select("student_id, cert_type, status, issued_at").order("issued_at", { ascending: false }).limit(20),
    supabase.from("contact_messages").select("name, subject, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("comments").select("author_name, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("cron_runs").select("tache, jour, demarre_at, termine_at, ok, resume, erreur, declencheur, tentatives")
      .order("demarre_at", { ascending: false }).limit(60),
    supabase.from("attestations")
      .select("id, student_id, course_id, certificate_no, final_score")
      .eq("status", "pending").eq("cert_type", "course"),
  ]);

  const students = studentsQ.data || [];
  const enrollments = enrollmentsQ.data || [];
  const courses = coursesQ.data || [];
  const subscribers = subscribersQ.data || [];

  const dansFenetre = (d: any) => d && new Date(d).getTime() >= debut.getTime();
  const dansFenetrePrecedente = (d: any) =>
    d && new Date(d).getTime() >= debutPrecedent.getTime() && new Date(d).getTime() < debut.getTime();
  // Une tendance ne veut rien dire sans base de comparaison : on renvoie null plutôt que
  // « +100 % », qui donnerait l'illusion d'une croissance là où il n'y avait rien.
  const tendance = (courant: number, precedent: number) =>
    precedent === 0 ? null : Math.round(((courant - precedent) / precedent) * 1000) / 10;

  const admisActif = (s: any) =>
    !!s.admitted_at && (!s.admission_expires || new Date(s.admission_expires).getTime() > now);
  const admissionExpiree = (s: any) =>
    !!s.admitted_at && !!s.admission_expires && new Date(s.admission_expires).getTime() <= now;

  const kpi = (filtre: (s: any) => boolean, champDate: string) => {
    const total = students.filter(filtre).length;
    const c = students.filter(s => filtre(s) && dansFenetre((s as any)[champDate])).length;
    const p = students.filter(s => filtre(s) && dansFenetrePrecedente((s as any)[champDate])).length;
    return { valeur: total, surPeriode: c, tendance: tendance(c, p) };
  };

  // ── Série des inscriptions, un point par jour, y compris les jours vides ──
  const parJour: Record<string, number> = {};
  for (let i = jours - 1; i >= 0; i--) parJour[new Date(now - i * J).toISOString().slice(0, 10)] = 0;
  for (const s of students) {
    const k = new Date(s.created_at).toISOString().slice(0, 10);
    if (k in parJour) parJour[k]++;
  }
  const inscriptions = Object.entries(parJour).map(([date, n]) => ({ date, n }));

  // ── Progression moyenne par étudiant, d'après ses inscriptions aux cours ──
  const progParEtudiant: Record<number, number> = {};
  const compteParEtudiant: Record<number, number> = {};
  for (const e of enrollments) {
    progParEtudiant[e.student_id] = (progParEtudiant[e.student_id] || 0) + (Number(e.progress) || 0);
    compteParEtudiant[e.student_id] = (compteParEtudiant[e.student_id] || 0) + 1;
  }
  const progressionDe = (id: number) =>
    compteParEtudiant[id] ? Math.round(progParEtudiant[id] / compteParEtudiant[id]) : null;

  const etudiantsRecents = [...students]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map(s => ({
      id: s.id,
      nom: (s.full_name || "").trim() || s.email,
      email: s.email,
      statut: admisActif(s) ? "admis" : admissionExpiree(s) ? "expire" : "en_attente",
      emailVerifie: s.email_verified !== false,
      progression: progressionDe(s.id),
      inscritLe: s.created_at,
    }));

  // ── Flux d'activité, toutes sources confondues, du plus récent au plus ancien ──
  const activite: any[] = [];
  for (const s of students) {
    activite.push({ type: "inscription", titre: "Nouvelle inscription", detail: `${(s.full_name || s.email || "").trim()} s'est inscrit(e)`, quand: s.created_at });
    if (s.admitted_at) activite.push({ type: "admission", titre: "Admission accordée", detail: `${(s.full_name || s.email || "").trim()} — ${s.entry_score ?? "?"}/30`, quand: s.admitted_at });
    if (s.final_certified_at) activite.push({ type: "certificat", titre: "Certificat final délivré", detail: (s.full_name || s.email || "").trim(), quand: s.final_certified_at });
  }
  for (const m of messagesQ.data || []) activite.push({ type: "message", titre: "Message reçu", detail: `${m.name || "Anonyme"} — ${m.subject || "sans objet"}`, quand: m.created_at });
  for (const c of commentsQ.data || []) activite.push({ type: "commentaire", titre: "Nouveau commentaire", detail: (c as any).author_name || "Anonyme", quand: (c as any).created_at });
  activite.sort((a, b) => new Date(b.quand).getTime() - new Date(a.quand).getTime());

  // ── Cours les plus suivis ──
  const parCours: Record<number, number> = {};
  for (const e of enrollments) parCours[e.course_id] = (parCours[e.course_id] || 0) + 1;
  const topCours = courses
    .map(co => ({ code: co.code, titre: co.title, etudiants: parCours[co.id] || 0, publie: co.is_published }))
    .sort((a, b) => b.etudiants - a.etudiants)
    .slice(0, 5);

  // ── Origine des abonnés à la newsletter (subscribers.source) ──
  const abonnesActifs = subscribers.filter(s => s.status === "active");
  const parSource: Record<string, number> = {};
  for (const s of abonnesActifs) parSource[s.source || "website"] = (parSource[s.source || "website"] || 0) + 1;
  const totalSources = abonnesActifs.length || 1;
  const sources = Object.entries(parSource)
    .map(([source, n]) => ({ source, n, pct: Math.round((n / totalSources) * 1000) / 10 }))
    .sort((a, b) => b.n - a.n);

  const nouveauxSurPeriode = students.filter(s => dansFenetre(s.created_at)).length;
  const admisSurPeriode = students.filter(s => dansFenetre(s.admitted_at)).length;
  const coursTermines = enrollments.filter(e => e.status === "completed").length;

  // ── Demandes d'attestation en attente ──
  //
  // Une file qui dépend d'une décision humaine doit être visible là où l'humain
  // regarde. Trois demandes ont dormi cinq jours derrière un compteur logé dans un
  // écran de statistiques : l'étudiante avait terminé trois cours et n'a rien reçu.
  const attentes = (enAttenteQ.data || []).map((a: any) => {
    const etu = students.find((s: any) => s.id === a.student_id);
    const co = courses.find((c: any) => c.id === a.course_id);
    return {
      id: a.id,
      etudiant: etu?.full_name || etu?.email || `#${a.student_id}`,
      cours: co?.code || `#${a.course_id}`,
      note: a.final_score == null ? null : Number(a.final_score),
      numero: a.certificate_no,
    };
  });

  // ── État des tâches planifiées ──
  //
  // Ce que ce bloc surveille n'est pas l'erreur, c'est le SILENCE. Les deux tâches sont
  // restées muettes des semaines parce qu'elles répondaient 404 : aucune exception, aucune
  // ligne, rien à quoi s'accrocher. On regarde donc l'ancienneté de la dernière exécution,
  // et une tâche quotidienne qui n'a rien écrit depuis 36 heures est déclarée muette —
  // une journée et demie, soit un cycle manqué plus une marge pour un décalage horaire.
  const executions = tachesQ.data || [];
  // La liste vient du registre et non d'un tableau recopié ici : ajouter une tâche ne doit
  // pas demander de penser à ce tableau-là, sinon la nouvelle tâche naît hors surveillance.
  const taches = Object.keys(TACHES_PLANIFIEES).map(nom => {
    const siennes = executions.filter((r: any) => r.tache === nom);
    const derniere = siennes[0] || null;
    const dernierSucces = siennes.find((r: any) => r.ok === true) || null;
    const heures = derniere
      ? Math.floor((now - new Date(derniere.demarre_at).getTime()) / 3600000)
      : null;
    return {
      nom,
      derniereExecution: derniere?.demarre_at ?? null,
      dernierSucces: dernierSucces?.demarre_at ?? null,
      heuresDepuis: heures,
      ok: derniere?.ok ?? null,
      erreur: derniere?.erreur ?? null,
      resume: derniere?.resume ?? null,
      // Qui a fait le travail. C'est le renseignement qui manquait pour savoir si
      // l'ordonnanceur de la plateforme fonctionne ou si seul le filet du dépôt tient.
      declencheur: derniere?.declencheur ?? null,
      tentatives: derniere?.tentatives ?? null,
      // Jamais exécutée compte comme muette : c'est exactement l'état qu'on a vécu.
      muette: heures === null || heures > TACHE_SILENCE_HEURES,
      // `ok = null` passé le délai du verrou : la tâche a démarré et n'a jamais rendu la
      // main. En deçà, elle est simplement en train de tourner — l'annoncer interrompue
      // ferait clignoter une alerte à chaque exécution normale.
      interrompue: !!derniere && derniere.ok === null && !!derniere.demarre_at
        && now - new Date(derniere.demarre_at).getTime() > VERROU_MINUTES * 60_000,
    };
  });

  res.json({
    taches,
    attestationsEnAttente: attentes,
    periode: { jours, debut: debut.toISOString(), fin: new Date(now).toISOString() },
    kpis: {
      etudiants: kpi(() => true, "created_at"),
      admis: kpi(admisActif, "admitted_at"),
      enAttente: kpi((s: any) => !s.admitted_at, "created_at"),
      certifies: kpi((s: any) => !!s.final_certificate_no, "final_certified_at"),
    },
    inscriptions,
    repartition: {
      admis: students.filter(admisActif).length,
      enAttente: students.filter((s: any) => !s.admitted_at).length,
      expires: students.filter(admissionExpiree).length,
      total: students.length,
    },
    etudiantsRecents,
    activite: activite.slice(0, 12),
    topCours,
    sources,
    performances: {
      nouvellesInscriptions: nouveauxSurPeriode,
      // Part des inscrits de la période qui ont franchi le test d'admission.
      tauxAdmission: nouveauxSurPeriode ? Math.round((admisSurPeriode / nouveauxSurPeriode) * 100) : 0,
      etudiantsActifs: students.filter(admisActif).length,
      coursTermines,
      moyenneQuotidienne: Math.round((nouveauxSurPeriode / jours) * 10) / 10,
      emailsNonVerifies: students.filter((s: any) => s.email_verified === false).length,
    },
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

    // Même raison qu'au certificat : sharp ne sert qu'ici et à la vignette du certificat.
    const sharp = (await import("sharp")).default;

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
// LouisFarm Learning — School Management System
// ══════════════════════════════════════════════════════════════════

function generateStudentToken(id: number): string {
  return jwt.sign({ sid: id, role: "student" }, JWT_SECRET, { expiresIn: "7d" });
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
async function logAcademyEmail(student_id: number | null, type: string, email: string, subject: string, dedupeKey?: string) {
  await supabase.from("academy_emails").insert({ student_id, type, email, subject, dedupe_key: dedupeKey ?? null }).then(() => {}, () => {});
}

/**
 * Dispatcher email centralisé pour LouisFarm Learning.
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
    // Idempotence : si un email avec cette dedupeKey a déjà été envoyé, on ne renvoie pas
    if (opts.dedupeKey) {
      const { data: prior } = await supabase.from("academy_emails")
        .select("id").eq("dedupe_key", opts.dedupeKey).limit(1).maybeSingle();
      if (prior) return { sent: false, reason: "already_sent" };
    }
    await resend.emails.send({ from: FROM_EMAIL, to: opts.to, subject: opts.subject, html: opts.html });
    await logAcademyEmail(opts.studentId, opts.type, opts.to, opts.subject, opts.dedupeKey);
    return { sent: true };
  } catch (e: any) {
    console.error(`Academy email error [${opts.type}]:`, e?.message || e);
    await supabase.from("academy_emails")
      .insert({ student_id: opts.studentId, type: opts.type, email: opts.to, subject: opts.subject, status: "failed" })
      .then(() => {}, () => {});
    return { sent: false, reason: "send_failed" };
  }
}

// Notifie par batch les étudiants actifs/vérifiés d'un nouveau cours, en excluant ceux déjà notifiés (dedupeKey par étudiant).
async function notifyNewCourseEmails(course: { id: number; code?: string; title: string; description?: string }): Promise<number> {
  if (!resend) return 0;
  const { data: students } = await supabase.from("students")
    .select("id, full_name, email").eq("status", "active").eq("course_emails", true).eq("email_verified", true);
  if (!students?.length) return 0;
  const keyFor = (sid: number) => `new_course:${course.id}:${sid}`;
  const { data: already } = await supabase.from("academy_emails")
    .select("dedupe_key").in("dedupe_key", students.map((s: any) => keyFor(s.id)));
  const sentSet = new Set((already || []).map((r: any) => r.dedupe_key));
  const toNotify = students.filter((s: any) => !sentSet.has(keyFor(s.id)));
  if (!toNotify.length) return 0;
  const batch = toNotify.map((s: any) => ({
    from: FROM_EMAIL, to: s.email,
    subject: `Nouveau cours : ${course.title} — LouisFarm Learning`,
    html: newCourseEmailHtml(s.full_name, course),
  }));
  for (let i = 0; i < batch.length; i += 100) {
    await resend.batch.send(batch.slice(i, i + 100)).catch((e: any) => console.error("New course email error:", e));
  }
  toNotify.forEach((s: any) => logAcademyEmail(s.id, "new_course", s.email, `Nouveau cours : ${course.title}`, keyFor(s.id)));
  return toNotify.length;
}

app.post("/api/academy/register", rateLimit(8, 10 * 60 * 1000), async (req, res) => {
  const { email, password, phone, country, organization } = req.body;
  // Les champs d'état civil sont nettoyés dès l'inscription. Sans cela, un espace laissé en
  // fin de saisie était stocké tel quel et ressortait dans le nom composé (« ESPOIR  FASSEHO »),
  // puis sur l'attestation. La mise à jour du profil, elle, trimait déjà.
  const trim = (v: any) => (typeof v === "string" ? v.trim() : v);
  const first_name = trim(req.body.first_name);
  const middle_name = trim(req.body.middle_name);
  const last_name = trim(req.body.last_name);
  // L'état civil décomposé fait foi ; full_name reste accepté pour ne pas casser un client
  // plus ancien, et sert alors de repli.
  const full_name = composeFullName(first_name, middle_name, last_name) || trim(req.body.full_name);
  if (!full_name || !email || !password) return res.status(400).json({ message: "Nom, email et mot de passe requis" });
  if (password.length < 8) return res.status(400).json({ message: "Le mot de passe doit faire au moins 8 caractères" });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ message: "Email invalide" });

  const { data: existing } = await supabase.from("students").select("id").eq("email", email).maybeSingle();
  if (existing) return res.status(409).json({ message: "Un compte existe déjà avec cet email" });

  const hash = await bcrypt.hash(password, 12);
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyCode = String(crypto.randomInt(100000, 999999)); // code 6 chiffres
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  let { data, error } = await supabase.from("students")
    .insert({
      full_name, first_name, middle_name, last_name,
      email, password_hash: hash, phone, country, organization,
      entry_score: 0, status: "pending_test",
      email_verified: false, verify_token: verifyToken, verify_code: verifyCode, verify_expires: verifyExpires,
    })
    .select("id, full_name, email, status, email_verified").single();

  // Fallback : si la migration des colonnes de vérification n'est pas encore appliquée,
  // on crée le compte sans ces colonnes (le compte n'est pas bloqué).
  if (error && /verify_|email_verified|first_name|last_name|column/i.test(error.message)) {
    const retry = await supabase.from("students")
      .insert({ full_name, email, password_hash: hash, phone, country, organization, entry_score: 0, status: "pending_test" })
      .select("id, full_name, email, status").single();
    data = retry.data as any; error = retry.error;
  }
  if (error) return res.status(400).json({ message: error.message });

  // Email de validation — on attend le résultat réel de l'envoi : annoncer "email envoyé"
  // alors que Resend a refusé (domaine non validé, quota) laissait l'étudiant attendre
  // indéfiniment un message qui n'arriverait jamais.
  let emailSent = false;
  if (resend) {
    const verifyUrl = `${SITE_URL}/academy/verify?token=${verifyToken}`;
    try {
      const r: any = await resend.emails.send({
        from: FROM_EMAIL, to: email,
        subject: "Confirmez votre inscription — LouisFarm Learning",
        html: verifyEmailHtml(full_name, verifyUrl, verifyCode),
      });
      if (r?.error) console.error("Verify email refused:", r.error?.message || r.error);
      else { emailSent = true; await logAcademyEmail(data.id, "verify", email, "Confirmez votre inscription"); }
    } catch (e: any) { console.error("Verify email error:", e?.message || e); }
  }

  const token = generateStudentToken(data.id);
  res.status(201).json({ token, student: data, emailSent });
});

// ── Soumettre le test d'aptitude (étudiant authentifié) ──
const ADMISSION_MONTHS = 3;
const RETRY_DAYS = 7;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Le certificat final "Super-Expert MEAL" atteste des projets du cursus MEAL uniquement.
// Les autres cours publiés (ex. TOF-FIN-01, formation de formateurs) restent accessibles
// mais ne conditionnent pas sa délivrance.
const MEAL_PROGRAM_PREFIX = "MEAL-";

/**
 * Génère le planning hebdomadaire des leçons depuis la date d'admission.
 *
 * Les cours d'un même parcours s'ENCHAÎNENT : on parcourt MEAL-01 en entier avant
 * d'ouvrir MEAL-02, puis MEAL-03. Les parcours, eux, avancent EN PARALLÈLE : la formation
 * de formateurs progresse pendant le cursus MEAL, sans rien lui prendre.
 *
 * Le rythme est propre à chaque parcours et découle d'une contrainte simple : la séquence
 * doit tenir dans la fenêtre d'admission de 3 mois, soit 13 semaines. 20 leçons MEAL
 * imposent 2 leçons par semaine (10 semaines) ; les 12 leçons de TOF tiennent à 1 par
 * semaine (12 semaines).
 *
 * Un compteur unique sur tous les cours confondus étalerait le cursus sur 32 semaines,
 * bien au-delà de l'admission ; un compteur remis à zéro à chaque cours ouvrirait quatre
 * sujets sans lien la même semaine, ce qui rendait la navigation absurde — « suivant »
 * menait à une leçon verrouillée alors que trois autres cours attendaient.
 */
/**
 * Parcours auxquels l'étudiant est admis, avec la date d'admission propre à chacun.
 *
 * Deux sources, et c'est assumé. Le cursus MEAL vit sur les colonnes historiques de
 * `students`, lues en une trentaine d'endroits — les migrer d'un bloc aurait mis en jeu les
 * admissions en cours pour un gain nul le jour même. Les autres parcours vivent dans
 * academy_program_admissions. Cette fonction est le seul endroit qui connaît cette
 * asymétrie : partout ailleurs, un parcours est un parcours.
 */
async function parcoursAdmis(sid: number): Promise<{ programId: string; admittedAt: Date; expires: string | null }[]> {
  const out: { programId: string; admittedAt: Date; expires: string | null }[] = [];

  const { data: st } = await supabase.from("students")
    .select("admitted_at, admission_expires").eq("id", sid).maybeSingle();
  if (st?.admitted_at) {
    out.push({ programId: "meal", admittedAt: new Date(st.admitted_at), expires: st.admission_expires ?? null });
  }

  const { data: rows } = await supabase.from("academy_program_admissions")
    .select("program_id, admitted_at, admission_expires")
    .eq("student_id", sid).not("admitted_at", "is", null);
  for (const r of rows || []) {
    out.push({ programId: r.program_id, admittedAt: new Date(r.admitted_at), expires: r.admission_expires ?? null });
  }
  return out;
}

/** Régénère le planning de chaque parcours auquel l'étudiant est admis, et lui seul. */
async function regenererPlannings(sid: number) {
  for (const p of await parcoursAdmis(sid)) {
    await generateLessonSchedule(sid, p.admittedAt, p.programId);
  }
}

/**
 * Ne garde d'une liste que ce qui relève d'un parcours auquel l'étudiant est admis.
 *
 * Écrire correctement le planning ne suffit pas : il faut aussi le LIRE correctement. Les
 * plannings ont été générés, avant la séparation par parcours, pour tous les cours publiés
 * sans distinction. Dix-sept étudiants admis au seul cursus MEAL portent encore des lignes
 * TOF-FIN-01 — jamais commencées, mais affichées dans leur planning et proposées en fin de
 * leçon comme « leçon ouverte cette semaine ». Ils n'ont jamais passé le test d'admission
 * de ce parcours.
 *
 * Le filtre est posé à la lecture plutôt que par un nettoyage de la base, pour deux raisons.
 * Il corrige les dix-sept d'un coup sans rien détruire ; et il tient encore le jour où une
 * ligne réapparaît — import, admission retirée, cours renommé. Une donnée orpheline devient
 * alors invisible au lieu d'être offerte.
 */
async function filtrerAuxParcoursAdmis<T>(sid: number, lignes: T[], codeDe: (l: T) => string | undefined) {
  const admis = new Set((await parcoursAdmis(sid)).map(p => p.programId));
  return lignes.filter(l => {
    const code = codeDe(l);
    if (!code) return true;                      // rien à rattacher : on ne retire pas
    const prog = programOf(code)?.id;
    return prog == null || admis.has(prog);      // hors parcours connu : on ne retire pas
  });
}

async function generateLessonSchedule(sid: number, admittedAt: Date, programId: string) {
  // Un parcours à la fois, depuis SA date d'admission. Les parcours ont désormais chacun
  // leur porte d'entrée : planifier les leçons d'un parcours auquel l'étudiant n'est pas
  // admis lui ouvrirait des cours qu'il n'a pas demandés, et les compterait dans sa
  // progression. Le filtre par préfixe suit la même convention que partout ailleurs.
  const parcours = programById(programId);
  const { data: toutes } = await supabase.from("sms_courses")
    .select("id, code").eq("is_published", true).order("order_index");
  const courses = (toutes || []).filter(c => programOf(c.code)?.id === programId);
  if (!courses.length) return;

  const rows: any[] = [];
  // Première semaine encore libre dans chaque parcours. Un cours démarre toujours sur une
  // semaine propre : sans cet arrondi, un cours de 7 leçons à 2 par semaine laisserait une
  // demi-semaine vide, et le suivant démarrerait au milieu — deux cours ouverts en même
  // temps, ce que la séquence est précisément censée éviter.
  const nextFreeWeek: Record<string, number> = {};

  for (const co of courses) {
    const key = programId;
    const perWeek = Math.max(1, parcours.lessonsPerWeek);
    const startWeek = nextFreeWeek[key] ?? 1;

    const { data: lessons } = await supabase.from("sms_lessons")
      .select("id").eq("course_id", co.id).order("order_index");

    (lessons || []).forEach((les: any, i: number) => {
      const week = startWeek + Math.floor(i / perWeek);
      const unlock = new Date(admittedAt.getTime() + (week - 1) * WEEK_MS);
      const due = new Date(unlock.getTime() + WEEK_MS);
      rows.push({
        student_id: sid, course_id: co.id, lesson_id: les.id,
        week_index: week, unlock_at: unlock.toISOString(), due_at: due.toISOString(),
        status: week === 1 ? "available" : "locked",
      });
    });

    nextFreeWeek[key] = startWeek + Math.ceil((lessons?.length || 0) / perWeek);
  }

  // Insert (ignore conflits si déjà généré)
  for (let i = 0; i < rows.length; i += 100) {
    await supabase.from("lesson_progress").upsert(rows.slice(i, i + 100), { onConflict: "student_id,lesson_id", ignoreDuplicates: true }).then(() => {}, () => {});
  }

  // Réalignement des lignes déjà en base : l'upsert ci-dessus ignore les conflits, donc un
  // planning généré avec un calendrier différent garderait à vie ses anciennes dates. On
  // recale les leçons non terminées sur le calendrier courant.
  const { data: current } = await supabase.from("lesson_progress")
    .select("id, lesson_id, week_index, unlock_at, due_at, status").eq("student_id", sid);
  const now = Date.now();
  for (const row of current || []) {
    if (row.status === "completed") continue;
    const want = rows.find(r => r.lesson_id === row.lesson_id);
    if (!want) continue;
    const sameWeek = row.week_index === want.week_index;
    const sameUnlock = new Date(row.unlock_at).getTime() === new Date(want.unlock_at).getTime();
    if (sameWeek && sameUnlock) continue;
    // Ne jamais recaler une leçon sur une fenêtre déjà écoulée : l'étudiant serait recalé
    // rétroactivement sur une échéance qu'il n'a jamais pu voir. Il garde son ancienne date.
    if (new Date(want.due_at).getTime() <= now) continue;
    await supabase.from("lesson_progress")
      .update({ week_index: want.week_index, unlock_at: want.unlock_at, due_at: want.due_at })
      .eq("id", row.id).then(() => {}, () => {});
  }
}

/**
 * Recalcule les statuts de déblocage. Le calendrier RYTHME, il ne VERROUILLE pas.
 *
 * Une leçon s'ouvre dès que l'une de ces conditions est vraie :
 *   1. sa semaine est arrivée (le rythme conseillé, qui garantit qu'un étudiant bloqué sur
 *      une leçon difficile finit toujours par voir la suite) ;
 *   2. c'est la leçon suivante d'un cours déjà entamé — on termine une leçon, la suivante
 *      s'ouvre immédiatement ;
 *   3. c'est la première leçon d'un cours dont le précédent, dans le même parcours, est
 *      entièrement terminé.
 *
 * Les points 2 et 3 sont ce qui fait que le parcours « suit » : sans eux, terminer une leçon
 * laissait la suivante verrouillée jusqu'à la semaine prévue — jusqu'à un mois d'attente
 * alors que le cours était prêt. Ils sont bornés à une semaine d'avance : non bornés, ils
 * ne faisaient pas que « suivre », ils supprimaient le calendrier — les 20 leçons du cursus
 * MEAL ont été validées en cinq jours. Voir shared/rythme.ts, où la règle est désormais
 * écrite et testable sans base.
 *
 * `missed` ne signifie plus « recalé » mais « en retard » : l'échéance hebdomadaire est un
 * repère, pas un couperet. La seule échéance qui exclut reste la fenêtre d'admission de
 * 3 mois, vérifiée à la validation. Auparavant `missed` était définitif — la leçon devenait
 * à jamais impossible à valider, donc le cours ne pouvait plus atteindre 100 %, donc le
 * certificat Super-Expert était perdu pour de bon. Une semaine de vacances suffisait.
 */
async function refreshLessonStates(sid: number) {
  const now = Date.now();
  const { data: lps } = await supabase.from("lesson_progress")
    .select("id, lesson_id, course_id, unlock_at, due_at, status, sms_lessons(order_index, title)")
    .eq("student_id", sid);
  if (!lps?.length) return;

  const rankOf = (lp: any) => lp.sms_lessons?.order_index ?? 0;

  // Avancement par cours : rang de la dernière leçon terminée, et cours entièrement terminé.
  const stat: Record<number, { maxDone: number; total: number; done: number }> = {};
  for (const lp of lps as any[]) {
    const s = (stat[lp.course_id] ||= { maxDone: 0, total: 0, done: 0 });
    s.total++;
    if (lp.status === "completed") { s.done++; s.maxDone = Math.max(s.maxDone, rankOf(lp)); }
  }
  const courseFinished = (id: number) => {
    const s = stat[id];
    return !!s && s.total > 0 && s.done === s.total;
  };

  // Cours qui précède immédiatement, dans le même parcours (même découpage que le planning).
  const { data: courses } = await supabase.from("sms_courses")
    .select("id, code").eq("is_published", true).order("order_index");
  const previousCourse: Record<number, number | null> = {};
  const lastSeen: Record<string, number | null> = {};
  for (const co of courses || []) {
    const key = programOf(co.code)?.id ?? "autres";
    previousCourse[co.id] = lastSeen[key] ?? null;
    lastSeen[key] = co.id;
  }

  // Cours qui viennent de s'ouvrir : leur première leçon passe de verrouillée à accessible.
  const coursOuverts: { courseId: number; lessonTitle?: string; dueAt: string }[] = [];

  for (const lp of lps as any[]) {
    if (lp.status === "completed") continue;
    const rank = rankOf(lp);
    const s = stat[lp.course_id];
    const prev = previousCourse[lp.course_id];

    // La règle vit dans shared/rythme.ts, pas ici : au milieu d'une fonction qui écrit en
    // base, elle n'était vérifiable que par une vraie base, et c'est ainsi qu'elle a pu
    // rester fausse — voir l'en-tête de ce fichier.
    const ouverte = leconOuverte({
      maintenant: now,
      ouvertureAt: new Date(lp.unlock_at).getTime(),
      statut: lp.status,
      rang: rank,
      termineesDuCours: s?.done ?? 0,
      rangMaxTermine: s?.maxDone ?? 0,
      coursPrecedentTermine: prev == null ? null : courseFinished(prev),
    });
    const enRetard = now > new Date(lp.due_at).getTime();
    const ns = !ouverte ? "locked" : (enRetard ? "missed" : "available");
    if (ns !== lp.status) {
      await supabase.from("lesson_progress").update({ status: ns }).eq("id", lp.id);
      // Le premier cours d'un parcours n'est pas annoncé ici : l'email d'admission le fait
      // déjà, et deux messages pour la même ouverture se lisent comme un doublon.
      if (lp.status === "locked" && ns !== "locked" && rank <= 1 && prev != null) {
        coursOuverts.push({ courseId: lp.course_id, lessonTitle: lp.sms_lessons?.title, dueAt: lp.due_at });
      }
    }
  }

  if (coursOuverts.length) await notifyCoursesUnlocked(sid, coursOuverts);
}

/**
 * Prévient l'étudiant qu'un cours vient de s'ouvrir. Idempotent par (étudiant, cours) :
 * refreshLessonStates tourne à chaque affichage du tableau de bord, la clé de déduplication
 * est donc le seul garde-fou contre l'envoi en boucle.
 */
async function notifyCoursesUnlocked(sid: number, opened: { courseId: number; lessonTitle?: string; dueAt: string }[]) {
  const { data: stud } = await supabase.from("students")
    .select("full_name, email, course_emails").eq("id", sid).maybeSingle();
  if (!stud?.email || stud.course_emails === false) return;
  for (const o of opened) {
    const { data: course } = await supabase.from("sms_courses")
      .select("code, title, description").eq("id", o.courseId).maybeSingle();
    if (!course) continue;
    sendAcademyEmail({
      studentId: sid, to: stud.email, type: "course_unlocked",
      subject: `🔓 Cours débloqué : ${course.title}`,
      html: courseUnlockedEmailHtml(stud.full_name, course, o.lessonTitle ? { title: o.lessonTitle } : null, o.dueAt),
      dedupeKey: `course_unlocked:${sid}:${o.courseId}`,
    });
  }
}

// ══════════════════════════════════════════════════════════════════
// Travaux de groupe (Group Work) — le cursus à partir de la semaine 4
//
// Le modèle WQU ne s'arrête pas aux leçons hebdomadaires : chaque mois, une évaluation
// COLLECTIVE s'ajoute au planning. Il y en a trois — semaines 4, 8 et 12 — ce qui les fait
// tenir dans la fenêtre d'admission de 3 mois. Le calendrier est celui de chaque étudiant
// (compté depuis son admission), la production est celle du groupe : un seul rendu, une
// seule note, partagée par tous les membres.
//
// Toutes les fonctions ci-dessous se taisent si les tables n'existent pas encore
// (academy_group_work.sql non exécuté) : le tableau de bord et le planning des leçons
// doivent continuer à fonctionner sans elles.
// ══════════════════════════════════════════════════════════════════

/**
 * Les trois énoncés. La table est semée depuis shared/groupwork.ts au premier appel, puis
 * c'est elle qui fait foi : l'administration peut réécrire un énoncé sans redéploiement.
 */
async function getGroupWorks(): Promise<any[]> {
  const champs = "id, gw_index, week_index, title, brief, deliverables, max_score, is_published, brief_url, template_url, rubric";
  const { data, error } = await supabase.from("academy_group_works").select(champs).order("gw_index");
  if (error) return [];             // table absente — la fonctionnalité n'est pas installée
  if (data?.length) return data;

  const semences = GROUP_WORKS.map(g => ({
    gw_index: g.index, week_index: g.weekIndex, title: g.title,
    brief: g.brief, deliverables: g.deliverables, max_score: g.maxScore,
    brief_url: g.briefUrl, template_url: g.templateUrl, rubric: INSTRUCTOR_RUBRIC,
  }));
  await supabase.from("academy_group_works")
    .upsert(semences, { onConflict: "gw_index", ignoreDuplicates: true }).then(() => {}, () => {});
  const { data: semes } = await supabase.from("academy_group_works").select(champs).order("gw_index");
  return semes || [];
}

/**
 * Un étudiant entre-t-il dans le dispositif des travaux de groupe ?
 *
 * Seulement s'il n'a pas encore franchi sa semaine 2. Les GW ont été ajoutés en cours de
 * route : les imposer à quelqu'un déjà en semaine 9 lui ferait découvrir trois évaluations
 * collectives dont deux seraient en retard le jour même de leur apparition.
 *
 * La règle ne vaut que pour ENTRER. Une fois dans le dispositif, on y reste : le temps
 * passe, et personne ne doit en être sorti pour avoir atteint la semaine 3.
 */
function eligibleAuxTravauxDeGroupe(admittedAt: string | Date | null | undefined): boolean {
  if (!admittedAt) return false;
  return Date.now() < new Date(admittedAt).getTime() + GROUP_WORK_ELIGIBILITY_WEEKS * WEEK_MS;
}

/**
 * Le groupe d'un étudiant POUR UN TRAVAIL DONNÉ.
 *
 * Il n'y a plus de « groupe de l'étudiant » tout court : les équipes sont retirées au sort
 * avant chacun des trois travaux, donc la question n'a de sens que rapportée à un GW.
 */
async function groupOfStudent(sid: number, gwId: number): Promise<any | null> {
  const { data } = await supabase.from("academy_group_members")
    .select("role, academy_groups(id, name, cohort, is_active, group_work_id)")
    .eq("student_id", sid).eq("group_work_id", gwId).maybeSingle();
  const g = (data as any)?.academy_groups;
  return g ? { ...g, role: (data as any).role } : null;
}

/** Membres d'un groupe, avec de quoi se contacter. */
async function membersOfGroup(groupId: number): Promise<any[]> {
  const { data } = await supabase.from("academy_group_members")
    .select("student_id, role, joined_at, students(full_name, email, avatar_url)")
    .eq("group_id", groupId).order("joined_at");
  return (data || []).map((m: any) => ({
    studentId: m.student_id,
    nom: (m.students?.full_name || "").trim() || m.students?.email || "Étudiant",
    email: m.students?.email ?? null,
    avatar: m.students?.avatar_url ?? null,
    role: m.role || "membre",
  }));
}

/** Mélange de Fisher-Yates. Le tirage est ce qui rend les équipes équitables : par ordre
 *  d'inscription, les premiers admis — souvent les plus assidus — se retrouveraient ensemble. */
function melanger<T>(liste: T[]): T[] {
  const t = liste.slice();
  for (let i = t.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/**
 * Répartit les tailles d'équipes : des trios, et au plus UN quatuor pour absorber le reste.
 *
 * 19 étudiants donnent 6 groupes : 3,3,3,3,3,4. Jamais de groupe d'une personne — qui n'a
 * personne à qui écrire — ni de groupe à cinq ou plus, où le rendu cesse d'être l'affaire
 * de chacun. Un effectif de 1 ou 2 ne fait qu'un seul groupe, forcément incomplet.
 */
function taillesDeGroupes(n: number): number[] {
  if (n <= 0) return [];
  if (n <= GROUP_MAX_MEMBERS) return [n];

  // Le nombre de groupes est encadré par les deux bornes de taille : il en faut assez pour
  // qu'aucun ne dépasse quatre, et pas plus que ce que des trios permettent. Entre les deux,
  // on prend le plus petit nombre de groupes — donc les équipes les plus étoffées.
  const nb = Math.max(Math.ceil(n / GROUP_MAX_MEMBERS), Math.floor(n / GROUP_TARGET_SIZE));
  const base = Math.floor(n / nb);
  const reste = n % nb;
  const tailles = Array(nb).fill(base);
  for (let i = 0; i < reste; i++) tailles[i] += 1;
  return tailles;
}

/**
 * Constitue les groupes d'une cohorte pour UN travail donné.
 *
 * ── Le verrou ──
 * La première mise en production a produit trois groupes vides et trois groupes de six et
 * sept. Ce n'était pas le tirage : plusieurs chargements simultanés ont lancé la répartition
 * en parallèle, chacun créant ses propres groupes puis y distribuant la même liste. Le
 * garde-fou est une ligne dans academy_group_formation_locks, unique par (cohorte, travail) :
 * son insertion EST la prise du verrou. Le premier appel répartit, les autres repartent sans
 * rien faire — sans transaction, que Supabase ne nous donne pas depuis le client.
 *
 * Renvoie les groupes créés, pour que l'appelant sache qui prévenir.
 */
async function formGroupsForGw(cohorte: string, gwId: number): Promise<{ groupId: number; membres: number[] }[]> {
  const { error: verrou } = await supabase.from("academy_group_formation_locks")
    .insert({ cohort: cohorte, group_work_id: gwId });
  if (verrou) return [];   // déjà constitué, ou en train de l'être par un autre appel

  const { data: dejaPlaces } = await supabase.from("academy_group_members")
    .select("student_id").eq("group_work_id", gwId);
  const exclus = new Set((dejaPlaces || []).map((m: any) => m.student_id));

  const { data: candidats } = await supabase.from("students")
    .select("id, admitted_at").not("admitted_at", "is", null);

  const candidatParId = new Map<number, string>(
    (candidats || []).map((c: any) => [c.id, c.admitted_at]));

  const libres = melanger((candidats || [])
    .filter((s: any) => !exclus.has(s.id))
    .filter((s: any) => cohortOf(new Date(s.admitted_at)) === cohorte)
    .map((s: any) => s.id));

  if (!libres.length) {
    await supabase.from("academy_group_formation_locks")
      .update({ groups_count: 0, members_count: 0 }).eq("cohort", cohorte).eq("group_work_id", gwId);
    return [];
  }

  const tailles = taillesDeGroupes(libres.length);
  const resultat: { groupId: number; membres: number[] }[] = [];
  let curseur = 0;

  for (let i = 0; i < tailles.length; i++) {
    const membres = libres.slice(curseur, curseur + tailles[i]);
    curseur += tailles[i];

    const { data: cree } = await supabase.from("academy_groups")
      .insert({ name: groupNameFor(i), cohort: cohorte, group_work_id: gwId })
      .select("id").maybeSingle();
    if (!cree?.id) continue;

    const { data: inseres } = await supabase.from("academy_group_members")
      .insert(membres.map(sid => ({ group_id: cree.id, student_id: sid, group_work_id: gwId })))
      .select("student_id");
    const places = (inseres || []).map((r: any) => r.student_id);
    if (places.length) resultat.push({ groupId: cree.id, membres: places });

    // Invariant : qui est dans une équipe a son calendrier. Le tirage puise dans `students`
    // alors que le calendrier se créait à la première visite de la page ; les deux
    // pouvaient donc diverger — être annoncé dans un groupe sans avoir de travail à
    // l'écran. On le referme ici, à l'endroit exact où l'étudiant entre dans le dispositif.
    for (const sid of places) {
      const admisLe = candidatParId.get(sid);
      if (admisLe) await generateGroupWorkSchedule(sid, new Date(admisLe), true);
    }
  }

  await supabase.from("academy_group_formation_locks").update({
    groups_count: resultat.length,
    members_count: resultat.reduce((n, r) => n + r.membres.length, 0),
  }).eq("cohort", cohorte).eq("group_work_id", gwId);

  return resultat;
}

/**
 * Constitue, si l'heure est venue, les groupes du travail `gw` pour la cohorte de l'étudiant.
 *
 * L'heure, c'est une semaine avant l'ouverture du travail — semaine 3 pour le GW1. Plus tôt,
 * l'équipe serait annoncée un mois à l'avance et oubliée le jour venu ; plus tard, le groupe
 * découvrirait ses coéquipiers en même temps que l'énoncé.
 */
async function ensureGroupsForGw(sid: number, gw: any, ligne: { unlock_at: string }): Promise<any | null> {
  const deja = await groupOfStudent(sid, gw.id);
  if (deja) return deja;

  const { data: stud } = await supabase.from("students").select("admitted_at").eq("id", sid).maybeSingle();
  if (!eligibleAuxTravauxDeGroupe(stud?.admitted_at)) return null;

  // La date de constitution se déduit de l'ouverture du travail pour CET étudiant : le
  // calendrier est individuel, donc la semaine 3 de l'un n'est pas celle de l'autre. On
  // prend la cohorte comme référence commune — c'est elle qui définit l'équipe.
  const ouverture = new Date(ligne.unlock_at).getTime();
  if (Date.now() < ouverture - GROUP_FORMATION_LEAD_WEEKS * WEEK_MS) return null;

  const cohorte = cohortOf(new Date(stud!.admitted_at));
  const formes = await formGroupsForGw(cohorte, gw.id);
  for (const f of formes) await announceGroupFormed(f.groupId, gw, f.membres).catch(() => {});
  return await groupOfStudent(sid, gw.id);
}

/**
 * Ce qui se passe à la naissance d'un groupe : ses documents arrivent dans son forum, et
 * ses membres reçoivent l'email qui les y envoie.
 *
 * L'ordre compte — le forum est garni AVANT l'email. Un étudiant qui clique dans la minute
 * doit trouver l'énoncé et le modèle de rapport, pas un fil vide.
 */
async function announceGroupFormed(groupId: number, gw: any, nouveaux: number[]) {
  await seedGroupForum(groupId, gw);

  const { data: groupe } = await supabase.from("academy_groups")
    .select("id, name, cohort").eq("id", groupId).maybeSingle();
  if (!groupe) return;
  const membres = await membersOfGroup(groupId);

  const { data: studs } = await supabase.from("students")
    .select("id, full_name, email, course_emails").in("id", nouveaux);
  for (const st of studs || []) {
    if (!st.email || st.course_emails === false) continue;
    sendAcademyEmail({
      studentId: st.id, to: st.email, type: "group_formed",
      subject: `👥 Votre groupe pour le ${gw.title?.split("—")[0]?.trim() || "travail de groupe"} — ${groupe.name}`,
      html: groupFormedEmailHtml(st.full_name, groupe, membres, gw),
      dedupeKey: `group_formed:${st.id}:${gw.id}`,
    });
  }
}

/**
 * Dépose l'énoncé et le modèle de rapport DU TRAVAIL dans le forum du groupe.
 *
 * Le forum appartient au groupe, donc au travail : on n'y met que les documents de ce
 * travail-là. Y verser les trois énoncés reviendrait à donner au groupe du GW1 le sujet du
 * GW3, qu'il mènera avec deux autres personnes.
 */
async function seedGroupForum(groupId: number, gw: any) {
  const lignes: any[] = [];
  if (gw.brief_url) lignes.push({
    group_id: groupId, group_work_id: gw.id, student_id: null,
    author_name: "LouisFarm Learning", kind: "ressource",
    body: `Énoncé du travail — ${gw.title}. À lire avant toute chose : il contient la commande, les livrables attendus et la grille de notation.`,
    attachment_url: gw.brief_url, attachment_name: `${gw.title} — énoncé (PDF)`,
  });
  if (gw.template_url) lignes.push({
    group_id: groupId, group_work_id: gw.id, student_id: null,
    author_name: "LouisFarm Learning", kind: "ressource",
    body: "Modèle de rapport à remplir en équipe : une section nominative par membre, plus les parties communes. C'est ce document, exporté en PDF, qui constitue le rendu.",
    attachment_url: gw.template_url, attachment_name: `${gw.title} — modèle de rapport (DOCX)`,
  });
  if (!lignes.length) return;
  await supabase.from("academy_group_posts").insert(lignes).then(() => {}, () => {});
}

/**
 * Génère le calendrier des trois GW depuis la date d'admission — même logique que
 * generateLessonSchedule, y compris son garde-fou : une fenêtre déjà écoulée n'est jamais
 * recalculée, sinon un étudiant se retrouverait en retard sur une échéance qu'il n'a
 * jamais vue.
 */
async function generateGroupWorkSchedule(sid: number, admittedAt: Date, dejaDansLeDispositif = false) {
  const gws = (await getGroupWorks()).filter(g => g.is_published !== false);
  if (!gws.length) return;

  // Le dispositif ne s'ouvre qu'à ceux qui n'ont pas franchi leur semaine 2. Sans ce
  // garde-fou, un étudiant plus avancé voyait les trois GW apparaître dans son planning
  // et son calendrier, alors qu'il ne serait jamais rattaché à un groupe : trois échéances
  // qu'il ne pouvait ni tenir ni faire disparaître.
  //
  // La règle ne vaut que pour ENTRER : qui a déjà un calendrier le garde, sans quoi tout le
  // monde en serait sorti au passage de sa propre semaine 2 — deux semaines avant l'ouverture
  // du premier travail.
  //
  // `dejaDansLeDispositif` est la troisième façon d'y être : avoir été tiré au sort dans une
  // équipe. Le tirage puise dans `students`, pas dans les calendriers ; sans ce passage, un
  // étudiant qui n'a jamais ouvert la page « Travaux de groupe » avant sa semaine 2 se
  // retrouvait dans un groupe, prévenu par email, devant un écran qui ne connaissait aucun
  // travail. Six étudiants de la promotion d'août étaient dans ce cas.
  if (!dejaDansLeDispositif && !eligibleAuxTravauxDeGroupe(admittedAt)) {
    const { count } = await supabase.from("group_work_progress")
      .select("id", { count: "exact", head: true }).eq("student_id", sid);
    if (!count) return;
  }

  const voulu = gws.map(gw => {
    const unlock = new Date(admittedAt.getTime() + (gw.week_index - 1) * WEEK_MS);
    const due = new Date(unlock.getTime() + GROUP_WORK_WINDOW_WEEKS * WEEK_MS);
    return {
      student_id: sid, group_work_id: gw.id, week_index: gw.week_index,
      unlock_at: unlock.toISOString(), due_at: due.toISOString(), status: "locked",
    };
  });

  await supabase.from("group_work_progress")
    .upsert(voulu, { onConflict: "student_id,group_work_id", ignoreDuplicates: true })
    .then(() => {}, () => {});

  const { data: actuel } = await supabase.from("group_work_progress")
    .select("id, group_work_id, week_index, unlock_at, due_at, status").eq("student_id", sid);
  const now = Date.now();
  for (const ligne of actuel || []) {
    if (ligne.status === "completed" || ligne.status === "submitted") continue;
    const cible = voulu.find(v => v.group_work_id === ligne.group_work_id);
    if (!cible) continue;
    if (ligne.week_index === cible.week_index
      && new Date(ligne.unlock_at).getTime() === new Date(cible.unlock_at).getTime()) continue;
    if (new Date(cible.due_at).getTime() <= now) continue;
    await supabase.from("group_work_progress")
      .update({ week_index: cible.week_index, unlock_at: cible.unlock_at, due_at: cible.due_at })
      .eq("id", ligne.id).then(() => {}, () => {});
  }
}

/**
 * Recalcule l'état des GW d'un étudiant et renvoie de quoi les afficher.
 *
 * L'état ne se stocke pas à la main : il DÉRIVE du rendu du groupe et de la fenêtre —
 * corrigé s'il est noté, rendu s'il est déposé, sinon verrouillé / à rendre / en retard.
 * Une ligne « rendu » ne peut donc pas rester coincée si un coéquipier dépose à minuit.
 *
 * C'est aussi ici que le groupe se constitue : à l'ouverture du premier GW (semaine 4),
 * pas à l'admission. Un étudiant qui abandonne en semaine 2 n'encombre pas les équipes.
 */
async function refreshGroupWorkStates(sid: number): Promise<{ lignes: any[]; groupes: Record<number, any>; rendus: any[] }> {
  const { data: lignes, error } = await supabase.from("group_work_progress")
    .select("id, group_work_id, week_index, unlock_at, due_at, status, score, completed_at")
    .eq("student_id", sid).order("week_index");
  if (error || !lignes?.length) return { lignes: [], groupes: {}, rendus: [] };

  const gws = await getGroupWorks();
  const now = Date.now();

  // Un groupe par travail : chacun se constitue une semaine avant l'ouverture du sien.
  const groupes: Record<number, any> = {};
  for (const l of lignes as any[]) {
    const gw = gws.find(g => g.id === l.group_work_id);
    if (!gw) continue;
    const g = await ensureGroupsForGw(sid, gw, l);
    if (g) groupes[l.group_work_id] = g;
  }

  // Les rendus de MES groupes, travail par travail.
  const idsGroupes = Object.values(groupes).map((g: any) => g.id);
  let rendus: any[] = [];
  if (idsGroupes.length) {
    const { data } = await supabase.from("academy_group_submissions")
      .select("id, group_id, group_work_id, status, score, feedback, content, submitted_at, graded_at, submitted_by, report_url, report_name, archive_url, archive_name, rubric_scores")
      .in("group_id", idsGroupes);
    rendus = data || [];
  }

  const ouverts: { groupWorkId: number; dueAt: string }[] = [];
  for (const l of lignes as any[]) {
    const rendu = rendus.find(r => r.group_work_id === l.group_work_id);
    const etat = rendu?.status === "graded" ? "completed"
      : rendu ? "submitted"
      : now < new Date(l.unlock_at).getTime() ? "locked"
      : now > new Date(l.due_at).getTime() ? "missed" : "available";

    const maj: any = {};
    if (etat !== l.status) maj.status = etat;
    if (etat === "completed" && rendu?.score != null && Number(l.score) !== Number(rendu.score)) {
      maj.score = rendu.score;
      maj.completed_at = rendu.graded_at || new Date().toISOString();
    }
    if (Object.keys(maj).length) {
      await supabase.from("group_work_progress").update(maj).eq("id", l.id).then(() => {}, () => {});
      if (l.status === "locked" && etat !== "locked") ouverts.push({ groupWorkId: l.group_work_id, dueAt: l.due_at });
      Object.assign(l, maj);
    }
  }

  for (const o of ouverts) {
    const g = groupes[o.groupWorkId];
    if (g) await notifyGroupWorksOpened(sid, g, [o]).catch(() => {});
  }
  return { lignes, groupes, rendus };
}

/**
 * Prévient l'étudiant qu'un travail de groupe s'ouvre, et lui dit avec QUI il le fait —
 * c'est l'information qui manque le plus : sans les coéquipiers, l'énoncé ne sert à rien.
 * Idempotent par (étudiant, GW).
 */
async function notifyGroupWorksOpened(sid: number, groupe: any, ouverts: { groupWorkId: number; dueAt: string }[]) {
  const { data: stud } = await supabase.from("students")
    .select("full_name, email, course_emails").eq("id", sid).maybeSingle();
  if (!stud?.email || stud.course_emails === false) return;

  const gws = await getGroupWorks();
  const membres = await membersOfGroup(groupe.id);
  for (const o of ouverts) {
    const gw = gws.find(g => g.id === o.groupWorkId);
    if (!gw) continue;
    sendAcademyEmail({
      studentId: sid, to: stud.email, type: "group_work_opened",
      subject: `👥 Travail de groupe ouvert : ${gw.title}`,
      html: groupWorkOpenedEmailHtml(stud.full_name, gw, groupe, membres, o.dueAt),
      dedupeKey: `group_work_opened:${sid}:${gw.id}`,
    });
  }
}

/**
 * Enregistre la note d'un rendu collectif pour TOUS les membres du groupe.
 *
 * La note est écrite dans `grades` (type `group_work`) pour qu'elle compte dans le relevé,
 * la moyenne et les XP comme n'importe quelle évaluation. Une correction rejouée ne
 * duplique rien : les notes précédentes de ce GW sont retirées avant réécriture.
 */
async function applyGroupWorkGrade(submissionId: number) {
  const { data: sub } = await supabase.from("academy_group_submissions")
    .select("id, group_id, group_work_id, score, feedback, status, graded_at").eq("id", submissionId).maybeSingle();
  if (!sub || sub.status !== "graded" || sub.score == null) return { notified: 0 };

  const gws = await getGroupWorks();
  const gw = gws.find(g => g.id === sub.group_work_id);
  if (!gw) return { notified: 0 };

  const membres = await membersOfGroup(sub.group_id);
  const ids = membres.map(m => m.studentId);
  if (!ids.length) return { notified: 0 };

  const max = gw.max_score ?? 100;
  // L'intitulé porte toujours le rang du travail (« GW2 — … »), y compris si l'énoncé a été
  // renommé depuis l'administration. C'est ce qui permet de retrouver — et donc de remplacer —
  // les notes d'une correction précédente : sans ce repère stable, un titre modifié entre deux
  // corrections aurait laissé deux notes pour le même travail dans le relevé.
  const etiquette = /^GW\d/i.test(gw.title) ? gw.title : `GW${gw.gw_index} — ${gw.title}`;
  await supabase.from("grades").delete()
    .in("student_id", ids).eq("type", "group_work").like("title", `GW${gw.gw_index} %`)
    .then(() => {}, () => {});
  await supabase.from("grades").insert(ids.map(id => ({
    student_id: id, course_id: null, lesson_id: null,
    title: etiquette, score: sub.score, max_score: max, type: "group_work",
    feedback: sub.feedback ?? null,
  }))).then(() => {}, () => {});

  await supabase.from("group_work_progress")
    .update({ status: "completed", score: sub.score, completed_at: sub.graded_at || new Date().toISOString() })
    .in("student_id", ids).eq("group_work_id", gw.id).then(() => {}, () => {});

  // Cette correction est peut-être la dernière pièce du certificat final. Depuis qu'il exige
  // aussi les travaux de groupe, terminer les cours ne suffit plus à le déclencher : pour qui
  // a fini ses leçons avant la correction du GW3, c'est ICI que la condition tombe, et nulle
  // part ailleurs. Sans cet appel, le certificat n'aurait plus jamais été délivré à personne.
  for (const id of ids) await delivrerCertificatFinalSiComplet(id).catch(() => {});

  // Email de correction, un par membre.
  const { data: studs } = await supabase.from("students")
    .select("id, full_name, email, course_emails").in("id", ids);
  let notified = 0;
  for (const st of studs || []) {
    if (!st.email || st.course_emails === false) continue;
    sendAcademyEmail({
      studentId: st.id, to: st.email, type: "group_work_graded",
      subject: `📝 ${gw.title} — corrigé (${sub.score}/${max})`,
      html: groupWorkGradedEmailHtml(st.full_name, gw, Number(sub.score), max, sub.feedback ?? null),
      dedupeKey: `group_work_graded:${st.id}:${gw.id}:${sub.graded_at ?? ""}`,
    });
    notified++;
  }
  return { notified };
}

// Recalcule la progression d'un cours à partir des notes de type "lesson" actuellement en base,
// met à jour l'inscription, et déclenche les emails/certificats de fin de cours si nécessaire.
// Appelé après tout changement de note (complétion de leçon, ajout/suppression admin) pour que
// enrollments.progress/status et les certificats restent cohérents avec les notes réelles.
async function recalcCourseProgress(sid: number, course_id: number) {
  const { count: totalLessons } = await supabase.from("sms_lessons")
    .select("id", { count: "exact", head: true }).eq("course_id", course_id);
  const { data: doneGrades } = await supabase.from("grades")
    .select("lesson_id").eq("student_id", sid).eq("course_id", course_id).eq("type", "lesson");
  // Les notes dont la leçon a été supprimée (remplacement de contenu → lesson_id NULL) ne
  // désignent plus rien : sans ce filtre, tous les NULL se fondaient en une seule entrée de
  // Set et créditaient l'étudiant d'une leçon fantôme.
  const doneCount = new Set((doneGrades || []).map(g => g.lesson_id).filter(id => id != null)).size;
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

  const finalCert = wasCompleted ? await delivrerCertificatFinalSiComplet(sid, course_id) : null;

  return { progress, done: doneCount, total: totalLessons || 0, completed: wasCompleted, finalCertificate: finalCert };
}

/**
 * Délivre le certificat final Super-Expert MEAL si tout est réuni. Idempotent.
 *
 * Deux conditions, pas une :
 *
 *   1. les trois cours du cursus MEAL sont terminés ;
 *   2. les travaux de groupe inscrits au calendrier de CET étudiant sont tous corrigés.
 *
 * La seconde manquait. Le certificat ne regardait que les inscriptions aux cours, si bien
 * qu'une étudiante l'a obtenu avec ses trois travaux de groupe encore verrouillés, jamais
 * rendus et jamais notés — c'est-à-dire sans la moitié collective de l'évaluation, celle
 * qui étale précisément le parcours sur trois mois.
 *
 * « Inscrits au calendrier de cet étudiant » et non « les trois GW » : le dispositif ne
 * s'ouvre qu'à ceux qui n'ont pas franchi leur semaine 2 (voir eligibleAuxTravauxDeGroupe),
 * et les autres n'ont aucune ligne. Exiger trois travaux dans l'absolu leur interdirait le
 * certificat à vie, pour une règle arrivée après eux. Qui n'a pas de ligne n'est pas
 * bloqué ; qui en a trois les doit toutes.
 *
 * Un travail n'est « completed » qu'une fois le rendu du groupe corrigé par l'administration
 * — c'est le choix retenu : la note vient d'une lecture humaine, pas d'un dépôt.
 */
async function delivrerCertificatFinalSiComplet(sid: number, courseIdPourAttestation?: number) {
  const { data: existingFinal } = await supabase.from("students")
    .select("final_certificate_no").eq("id", sid).maybeSingle();
  if (existingFinal?.final_certificate_no) return null;

  const { data: allCourses } = await supabase.from("sms_courses")
    .select("id, code").eq("is_published", true).like("code", `${MEAL_PROGRAM_PREFIX}%`);
  const { data: doneEnr } = await supabase.from("enrollments")
    .select("course_id").eq("student_id", sid).eq("status", "completed");
  const doneIds = new Set((doneEnr || []).map((e: any) => e.course_id));
  const coursTermines = (allCourses || []).length > 0 && (allCourses || []).every((co: any) => doneIds.has(co.id));
  if (!coursTermines) return null;

  // refreshGroupWorkStates plutôt qu'une lecture directe : l'état d'un travail DÉRIVE du
  // rendu du groupe, et la ligne de l'étudiant peut être en retard d'un cran si personne
  // n'a rouvert son tableau de bord depuis la correction.
  const { lignes } = await refreshGroupWorkStates(sid);
  const gwTermines = (lignes || []).every((l: any) => l.status === "completed");
  if (!gwTermines) return null;

  const certNo = `DMA-FINAL-${sid}-${Date.now().toString(36).toUpperCase()}`;
  const nowIso = new Date().toISOString();
  // Moyenne générale
  const { data: allGrades } = await supabase.from("grades").select("score, max_score").eq("student_id", sid);
  const ga = allGrades || [];
  const avg = ga.length ? Math.round(ga.reduce((a, g) => a + Number(g.score) / Number(g.max_score) * 100, 0) / ga.length) : 0;
  await supabase.from("students").update({ final_certificate_no: certNo, final_certified_at: nowIso }).eq("id", sid);
  await supabase.from("attestations").insert({
    student_id: sid, cert_type: "final",
    // Rattachement de bon ordre quand l'appel ne vient pas de la fin d'un cours : le dernier
    // cours du cursus. La colonne ne sert qu'au classement de l'attestation.
    course_id: courseIdPourAttestation ?? (allCourses || []).at(-1)?.id ?? null,
    certificate_no: certNo, final_score: avg, status: "issued", issued_at: nowIso,
  }).then(() => {}, () => {});
  const { data: st2 } = await supabase.from("students").select("full_name, email").eq("id", sid).maybeSingle();
  if (st2?.email) sendAcademyEmail({
    studentId: sid, to: st2.email, type: "final_certificate",
    subject: "🎓 Certificat Super-Expert MEAL délivré !",
    html: finalCertEmailHtml(st2.full_name, certNo, avg),
    dedupeKey: `final:${sid}`,
  });
  return { certificate_no: certNo, average: avg };
}

/**
 * Octroie l'admission : verrou, inscription à tous les cours, planning hebdomadaire,
 * attestation et email. Idempotent — un second appel ne réoctroie rien.
 *
 * Le verrou est une comparaison-échange sur `admitted_at` : on n'écrit que si la valeur
 * n'a pas bougé depuis la lecture. Il utilisait auparavant un filtre `.or()` contenant un
 * horodatage ISO ; les points de « …:28.249Z » sont des séparateurs dans la grammaire des
 * filtres PostgREST, la mise à jour ne touchait aucune ligne, et l'erreur était ignorée.
 * Résultat : score enregistré, statut « actif », mais aucune admission — l'étudiant se
 * retrouvait devant ses cours verrouillés après avoir réussi le test.
 */
async function grantAdmission(sid: number, score: number, now: Date, previousAdmittedAt: string | null):
    Promise<{ ok: boolean; admissionExpires: string }> {
  const admissionExpires = new Date(now.getFullYear(), now.getMonth() + ADMISSION_MONTHS, now.getDate()).toISOString();
  const patch = { admitted_at: now.toISOString(), admission_expires: admissionExpires, next_test_allowed: null };

  const q = supabase.from("students").update(patch).eq("id", sid);
  // Première admission : la ligne doit être encore vierge. Ré-admission après expiration :
  // la valeur précédente doit être intacte. Deux filtres simples, aucune ambiguïté d'analyse.
  const claim = previousAdmittedAt ? q.eq("admitted_at", previousAdmittedAt) : q.is("admitted_at", null);
  const { data: claimed, error: claimError } = await claim.select("id").maybeSingle();

  if (claimError) {
    console.error("Admission: échec du verrou —", claimError.message);
    return { ok: false, admissionExpires };
  }
  if (!claimed) {
    // Aucune ligne prise : soit une requête concurrente a déjà octroyé l'admission,
    // soit rien ne correspond. On tranche en relisant l'état réel.
    const { data: cur } = await supabase.from("students").select("admitted_at, admission_expires").eq("id", sid).maybeSingle();
    const already = !!cur?.admitted_at && (!cur.admission_expires || new Date(cur.admission_expires) > now);
    return { ok: already, admissionExpires: cur?.admission_expires ?? admissionExpires };
  }

  // Ré-admission après expiration : repartir d'un planning et d'une attestation propres.
  // L'effacement est restreint aux cours du cursus MEAL. Il portait auparavant sur tout
  // `lesson_progress` de l'étudiant : depuis que la formation de formateurs a sa propre
  // admission, un tel effacement emporterait une progression qui n'a rien à voir avec cette
  // ré-admission, et que rien ne permettrait de reconstituer.
  await supabase.from("attestations").delete().eq("student_id", sid).eq("cert_type", "admission").then(() => {}, () => {});
  const { data: coursMeal } = await supabase.from("sms_courses")
    .select("id").like("code", `${MEAL_PROGRAM_PREFIX}%`);
  const idsMeal = (coursMeal || []).map((c: any) => c.id);
  if (idsMeal.length) {
    await supabase.from("lesson_progress").delete().eq("student_id", sid).in("course_id", idsMeal).then(() => {}, () => {});
  }

  const { data: courses } = await supabase.from("sms_courses").select("id, code").eq("is_published", true);
  if (courses?.length) {
    const { data: existing } = await supabase.from("enrollments").select("course_id").eq("student_id", sid);
    const already = new Set((existing || []).map((e: any) => e.course_id));
    // Inscription aux seuls cours du cursus MEAL : les autres parcours s'ouvrent par leur
    // propre test, et inscrire d'office y aurait contourné la porte qu'on vient de poser.
    const toAdd = courses.filter((co: any) => programOf(co.code)?.id === "meal" && !already.has(co.id))
      .map((co: any) => ({ student_id: sid, course_id: co.id, started_at: now.toISOString() }));
    if (toAdd.length) await supabase.from("enrollments").insert(toAdd);
  }
  await generateLessonSchedule(sid, now, "meal");
  await generateGroupWorkSchedule(sid, now);

  const certNo = `DMA-ADM-${sid}-${Date.now().toString(36).toUpperCase()}`;
  await supabase.from("attestations").insert({
    student_id: sid, course_id: courses?.[0]?.id ?? null, cert_type: "admission",
    certificate_no: certNo, final_score: Math.round(score / 30 * 100),
    status: "issued", issued_at: now.toISOString(), expires_at: admissionExpires,
  }).then(() => {}, () => {});

  const { data: stAdm } = await supabase.from("students").select("full_name, email").eq("id", sid).single();
  if (stAdm?.email) {
    const dlToken = generateStudentToken(sid);
    const certUrl = `${SITE_URL}/api/academy/certificate/admission?token=${dlToken}`;
    sendAcademyEmail({
      studentId: sid, to: stAdm.email, type: "admission_passed",
      subject: "🎉 Félicitations — Vous êtes admis(e) à LouisFarm Learning !",
      html: admissionPassedEmailHtml(stAdm.full_name, Math.round(score / 30 * 100), admissionExpires, certUrl),
      dedupeKey: `admission:${sid}:${admissionExpires}`,
    });
  }
  return { ok: true, admissionExpires };
}

// ══════════════ Formation de formateurs : admission propre au parcours ══════════════
//
// LouisFarm délivre deux titres finaux sans rapport l'un avec l'autre. Jusqu'ici le test du
// cursus MEAL ouvrait l'accès à tous les cours publiés : un formateur rural devait répondre à
// trente questions sur pandas et QGIS pour accéder à un cours de gestion financière paysanne.
// Ce parcours a désormais sa porte : quinze questions sur son propre métier.

/** Admission de l'étudiant à un parcours porté par academy_program_admissions. */
async function admissionParcours(sid: number, programId: string) {
  const { data } = await supabase.from("academy_program_admissions")
    .select("admitted_at, admission_expires, entry_score, test_attempts, next_test_allowed")
    .eq("student_id", sid).eq("program_id", programId).maybeSingle();
  return data ?? null;
}

/**
 * Octroie l'admission au parcours et ouvre son planning. Idempotent.
 *
 * Le verrou est l'unicité (student_id, program_id) : deux requêtes simultanées ne peuvent pas
 * créer deux admissions, la seconde tombe sur le conflit. C'est plus simple que la
 * comparaison-échange du cursus MEAL, dont la contrainte d'unicité n'existe pas.
 */
async function grantProgramAdmission(sid: number, programId: string, score: number, now: Date):
    Promise<{ ok: boolean; admissionExpires: string }> {
  const admissionExpires = new Date(
    now.getFullYear(), now.getMonth() + ADMISSION_MONTHS, now.getDate()).toISOString();

  const { error } = await supabase.from("academy_program_admissions").upsert({
    student_id: sid, program_id: programId,
    admitted_at: now.toISOString(), admission_expires: admissionExpires,
    entry_score: score, last_test_at: now.toISOString(), next_test_allowed: null,
  }, { onConflict: "student_id,program_id" });
  if (error) {
    // Dire l'échec plutôt que de renvoyer un succès qui laisserait l'étudiant devant des
    // cours verrouillés après avoir réussi son test — la panne qu'a déjà connue le MEAL.
    console.error(`Admission ${programId} : échec —`, error.message);
    return { ok: false, admissionExpires };
  }

  // Inscription aux cours du parcours, puis planning.
  const { data: toutes } = await supabase.from("sms_courses")
    .select("id, code").eq("is_published", true);
  const duParcours = (toutes || []).filter((c: any) => programOf(c.code)?.id === programId);
  if (duParcours.length) {
    const { data: existing } = await supabase.from("enrollments").select("course_id").eq("student_id", sid);
    const deja = new Set((existing || []).map((e: any) => e.course_id));
    const aAjouter = duParcours.filter((c: any) => !deja.has(c.id))
      .map((c: any) => ({ student_id: sid, course_id: c.id, started_at: now.toISOString() }));
    if (aAjouter.length) await supabase.from("enrollments").insert(aAjouter).then(() => {}, () => {});
  }
  await generateLessonSchedule(sid, now, programId);
  await refreshLessonStates(sid);
  return { ok: true, admissionExpires };
}

/**
 * Routes d'admission génériques, valables pour tout parcours ayant sa propre porte.
 *
 * Elles étaient d'abord écrites pour la seule formation de formateurs, chemin « /tof/ » et
 * identifiant en dur. Le troisième parcours aurait imposé une copie, et une copie est
 * exactement ce qui finit par diverger : un correctif appliqué à l'une, oublié dans l'autre.
 * Le parcours est donc devenu un paramètre, et la banque de questions se lit dans un registre.
 */

type ResolutionParcours =
  | { ok: true; parcours: Program; test: TestParcours; statut?: undefined; message?: undefined }
  | { ok: false; statut: number; message: string; parcours?: undefined; test?: undefined };

/** Parcours demandé, sa configuration et son test — ou l'erreur à renvoyer. */
function parcoursAvecTest(id: string): ResolutionParcours {
  let parcours: Program;
  try { parcours = programById(id); }
  catch { return { ok: false, statut: 404, message: "Parcours inconnu." }; }

  if (parcours.admission.surStudents) {
    return { ok: false, statut: 400, message: "Ce parcours passe par le test d'admission général." };
  }
  const test = TESTS_PARCOURS[id];
  // Un parcours déclaré sans banque de questions ne doit pas répondre « 0 sur 0 réussi » :
  // on refuse explicitement, plutôt que d'admettre tout le monde par accident.
  if (!test || test.questions.length !== parcours.admission.nbQuestions
      || test.cle.length !== test.questions.length) {
    return { ok: false, statut: 503, message: "Le test de ce parcours n'est pas encore disponible." };
  }
  return { ok: true, parcours, test };
}

app.get("/api/academy/programs/:id/test-status", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const programId = String(req.params.id);
  const r = parcoursAvecTest(programId);
  if (!r.ok) return res.status(r.statut!).json({ message: r.message });

  const a = await admissionParcours(sid, programId);
  const expiree = !!a?.admission_expires && new Date(a.admission_expires) < new Date();
  const attente = a?.next_test_allowed ? new Date(a.next_test_allowed) : null;
  res.json({
    programId: r.parcours!.id,
    passed: !!a?.admitted_at && !expiree,
    score: a?.entry_score ?? null,
    attempts: a?.test_attempts ?? 0,
    admittedAt: a?.admitted_at ?? null,
    admissionExpires: a?.admission_expires ?? null,
    nextTestAllowed: a?.next_test_allowed ?? null,
    canRetry: !attente || attente <= new Date(),
    nbQuestions: r.parcours!.admission.nbQuestions,
    seuil: r.parcours!.admission.seuil,
    credential: r.parcours!.credential,
    title: r.parcours!.title,
  });
});

app.post("/api/academy/programs/:id/submit-test", rateLimit(10, 10 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const programId = String(req.params.id);
  const r = parcoursAvecTest(programId);
  if (!r.ok) return res.status(r.statut!).json({ message: r.message });
  const parcours = r.parcours!;
  const test = r.test!;

  // ANTI-TRICHE : le client envoie ses choix, le serveur corrige. La clé vit sous api/,
  // qui ne part jamais dans le navigateur.
  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ message: "Réponses requises (answers)." });

  const a = await admissionParcours(sid, programId);
  const now = new Date();
  const expiree = !!a?.admission_expires && new Date(a.admission_expires) < now;
  // 403 et non 400 : la requête est bien formée, c'est le dossier de l'étudiant qui interdit
  // de la satisfaire. C'est aussi le code que renvoie la route historique du MEAL dans les
  // deux mêmes situations — deux codes différents pour un même refus se paieraient le jour
  // où un client traitera l'un et pas l'autre.
  if (a?.admitted_at && !expiree) {
    return res.status(403).json({
      message: `Vous êtes déjà admis(e) au parcours « ${parcours.title} ».`,
      alreadyAdmitted: true,
    });
  }
  if (a?.next_test_allowed && new Date(a.next_test_allowed) > now) {
    return res.status(403).json({
      message: `Vous pourrez repasser ce test à partir du ${new Date(a.next_test_allowed).toLocaleDateString("fr-FR")}.`,
      nextTestAllowed: a.next_test_allowed,
    });
  }

  const correct: boolean[] = [];
  let score = 0;
  for (let i = 0; i < test.cle.length; i++) {
    const bon = Number(answers[i]) === test.cle[i];
    correct.push(bon);
    if (bon) score++;
  }
  const passed = score >= parcours.admission.seuil;
  const tentatives = (a?.test_attempts ?? 0) + 1;
  const prochainEssai = new Date(now.getTime() + RETRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from("academy_program_admissions").upsert({
    student_id: sid, program_id: programId,
    entry_score: score, test_attempts: tentatives, last_test_at: now.toISOString(),
    next_test_allowed: passed ? null : prochainEssai,
  }, { onConflict: "student_id,program_id" }).then(() => {}, () => {});

  await supabase.from("grades").insert({
    student_id: sid, title: `Test d'admission — ${parcours.title}`,
    score, max_score: parcours.admission.nbQuestions, type: "entry_test",
  }).then(() => {}, () => {});

  let admissionExpires: string | null = null;
  if (passed) {
    const octroi = await grantProgramAdmission(sid, programId, score, now);
    admissionExpires = octroi.admissionExpires;
    if (!octroi.ok) {
      // Dire l'échec plutôt que de renvoyer un succès qui laisserait l'étudiant devant des
      // cours verrouillés après avoir réussi son test — la panne qu'a déjà connue le MEAL.
      return res.status(500).json({
        passed, score, correct,
        message: "Votre score est enregistré mais l'ouverture de vos cours a échoué. Rechargez votre tableau de bord, ou contactez l'administration.",
        admissionFailed: true,
      });
    }
  }

  // ── L'email d'admission ──
  //
  // Il n'existait pas : réussir le test d'un parcours n'envoyait rien du tout. L'étudiant
  // avait sa page de résultat, et plus rien ensuite — aucune trace dans sa boîte, rien à
  // rouvrir dans deux semaines quand il aura oublié où c'était. C'est le troisième point
  // où le tarif doit apparaître, et c'était surtout un email manquant.
  if (passed) {
    const { data: etu } = await supabase.from("students").select("full_name, email").eq("id", sid).single();
    if (etu?.email) {
      sendAcademyEmail({
        studentId: sid, to: etu.email, type: "program_admission",
        subject: `🎓 Admis(e) — ${parcours.title}`,
        html: admissionParcoursEmailHtml(etu.full_name, parcours, score, admissionExpires),
        // Une seule fois par parcours : une réadmission après expiration en renverra un,
        // la date d'admission faisant partie de la clé.
        dedupeKey: `prog_admission:${sid}:${programId}:${(admissionExpires ?? "").slice(0, 10)}`,
      }).catch(() => {});
    }
  }

  res.json({
    passed, score, correct,
    programId, title: parcours.title, credential: parcours.credential,
    seuil: parcours.admission.seuil,
    nbQuestions: parcours.admission.nbQuestions,
    // Le tarif part avec le résultat. C'est le deuxième des cinq points d'affichage, et le
    // plus important : au sommet de l'engagement, juste après « vous êtes admis ».
    prixAttestation: parcours.prixAttestation,
    admissionExpires,
    nextTestAllowed: passed ? null : prochainEssai,
  });
});

/**
 * Reconnaissance du tarif par l'étudiant.
 *
 * Enregistrement, jamais condition : l'admission a été accordée à la réussite du test, et
 * la retirer à qui n'a pas coché serait hostile. Ce qui est conservé, c'est la date ET le
 * montant affiché à cet instant — sans cette copie, une hausse de tarif réécrirait
 * rétroactivement ce que chacun avait accepté.
 */
app.post("/api/academy/programs/:id/engagement", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const r = parcoursAvecTest(String(req.params.id));
  if (!r.ok) return res.status(r.statut).json({ message: r.message });

  const { error } = await supabase.from("academy_program_admissions")
    .update({ engagement_at: new Date().toISOString(), prix_annonce: r.parcours.prixAttestation })
    .eq("student_id", sid).eq("program_id", r.parcours.id);
  if (error) return res.status(500).json({ message: "Enregistrement impossible." });
  res.json({ ok: true, prixAnnonce: r.parcours.prixAttestation });
});

// ── Test d'admission du cursus MEAL ──
//
// Le MEAL garde sa route propre : son admission vit sur les colonnes de `students`, quand
// celle des autres parcours vit dans academy_program_admissions. L'asymétrie est documentée
// dans supabase/academy_program_admissions.sql ; la fondre dans la route générique aurait
// demandé de migrer les dossiers existants, ce qui n'est pas le sujet ici.
app.post("/api/academy/submit-test", rateLimit(10, 10 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  // ANTI-TRICHE : le client envoie ses réponses choisies, le serveur calcule le score.
  const { answers } = req.body;

  // Vérifier le délai de re-tentative (1 semaine après échec)
  const { data: stud } = await supabase.from("students")
    .select("admitted_at, admission_expires, next_test_allowed, test_attempts, status, email_verified").eq("id", sid).single();
  // L'email non vérifié ne bloque plus le test : quand l'envoi d'email échoue (domaine
  // d'expédition non validé, quota, boîte inexistante), l'étudiant était enfermé dans une
  // impasse dont aucune action de sa part ne pouvait le sortir. La vérification reste exigée
  // au moment de délivrer un document officiel (attestation, certificat).
  // Une admission expirée peut être repassée (sinon un étudiant dont les 3 mois sont écoulés
  // resterait bloqué pour toujours puisqu'admitted_at reste défini).
  const admissionExpired = !!stud?.admission_expires && new Date(stud.admission_expires) < new Date();
  if (stud?.admitted_at && !admissionExpired) {
    return res.status(403).json({ message: "Vous êtes déjà admis(e). Le test ne peut pas être repassé.", alreadyAdmitted: true });
  }
  if (stud?.next_test_allowed && new Date(stud.next_test_allowed) > new Date()) {
    return res.status(403).json({ message: "Vous devez attendre avant de repasser le test.", nextAllowed: stud.next_test_allowed });
  }

  // Calcul du score CÔTÉ SERVEUR à partir des réponses
  let score: number;
  const correct: boolean[] = [];
  if (Array.isArray(answers)) {
    score = 0;
    for (let i = 0; i < ADMISSION_ANSWER_KEY.length; i++) {
      const isCorrect = Number(answers[i]) === ADMISSION_ANSWER_KEY[i];
      correct.push(isCorrect);
      if (isCorrect) score++;
    }
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
  if (!passed) {
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

  let admissionExpires: string | null = null;
  if (passed) {
    const granted = await grantAdmission(sid, score, now, stud?.admitted_at ?? null);
    admissionExpires = granted.admissionExpires;
    if (!granted.ok) {
      // L'admission n'a pas pu être octroyée : le dire, plutôt que de renvoyer un
      // succès qui laisserait l'étudiant devant des cours verrouillés sans recours.
      return res.status(500).json({
        passed, score, correct, status: "active",
        message: "Votre score est enregistré mais l'ouverture de vos cours a échoué. Rechargez votre tableau de bord, ou contactez l'administration.",
        admissionFailed: true,
      });
    }
  }

  res.json({
    passed, score, correct,
    status: passed ? "active" : "pending_test",
    admissionExpires: passed ? admissionExpires : null,
    nextTestAllowed: passed ? null : update.next_test_allowed,
  });
});

app.get("/api/academy/test-status", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  let { data } = await supabase.from("students")
    .select("entry_score, status, admitted_at, admission_expires, next_test_allowed, test_attempts, email_verified").eq("id", sid).single();

  // Rattrapage : un étudiant ayant atteint le score requis mais dépourvu d'admission est
  // dans un état incohérent — il voit ses cours verrouillés alors qu'il a réussi, sans
  // aucune action possible de sa part. On octroie l'admission ici, à la première
  // consultation, plutôt que d'attendre une intervention administrative.
  if (data && !data.admitted_at && (data.entry_score ?? 0) >= ADMISSION_PASS_SCORE) {
    console.warn(`Admission manquante rattrapée pour l'étudiant ${sid} (score ${data.entry_score}).`);
    const repaired = await grantAdmission(sid, data.entry_score, new Date(), null);
    if (repaired.ok) {
      const { data: fresh } = await supabase.from("students")
        .select("entry_score, status, admitted_at, admission_expires, next_test_allowed, test_attempts, email_verified").eq("id", sid).single();
      if (fresh) data = fresh;
    }
  }

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
  const codeA = String(data.verify_code).padEnd(6, "0").slice(0, 6);
  const codeB = String(code).trim().padEnd(6, "0").slice(0, 6);
  if (!crypto.timingSafeEqual(Buffer.from(codeA), Buffer.from(codeB)))
    return res.status(400).json({ message: "Code incorrect" });
  await supabase.from("students")
    .update({ email_verified: true, verify_token: null, verify_code: null, verify_expires: null })
    .eq("id", sid);
  res.json({ message: "Email vérifié avec succès", verified: true });
});

// (endpoint my-verify-code supprimé — faille de sécurité, le code ne doit jamais être exposé au client)


/**
 * Relances périodiques de vérification d'adresse.
 *
 * Appelé par une tâche planifiée quotidienne (voir vercel.json). Une relance déclenchée
 * depuis le site ne servirait à rien : elle n'atteindrait que les étudiants qui reviennent,
 * alors que ce sont précisément ceux qui ne reviennent pas qu'il faut rappeler.
 *
 * Trois relances : lendemain de l'inscription, puis à trois jours, puis à sept. Au-delà,
 * insister devient du harcèlement — et au-delà de 30 jours le compte est considéré comme
 * abandonné. Le rang de la relance se déduit de l'âge du compte, pas d'un compteur : si la
 * tâche saute un jour, l'étudiant reçoit quand même la bonne relance au lieu de la manquer.
 *
 * Le jeton est régénéré à chaque envoi. Il expire en 24 heures : réutiliser celui de
 * l'inscription enverrait un lien mort dès la relance du troisième jour.
 */
const VERIFY_REMINDER_DAYS = [1, 3, 7];
const VERIFY_REMINDER_GIVE_UP_DAYS = 30;

/**
 * Garde-fou commun aux tâches planifiées.
 *
 * Fail-closed : sans secret configuré, seul l'ordonnanceur de la plateforme passe. Ouvert,
 * l'endpoint permettrait à n'importe qui de déclencher un envoi de masse — et de griller la
 * réputation du domaine d'expédition.
 *
 * Les deux voies sont acceptées parce qu'elles ne couvrent pas le même cas : `x-vercel-cron`
 * est posé par la plateforme sur ses propres appels ; le jeton porteur sert au déclenchement
 * manuel depuis un terminal, le jour où il faut rattraper une exécution manquée.
 */
/**
 * Qui a le droit de déclencher une tâche, et sous quel nom.
 *
 * Trois sources, et il est utile de savoir LAQUELLE a travaillé : c'est le seul moyen de
 * répondre à « est-ce que l'ordonnanceur de la plateforme fonctionne, oui ou non ? » sans
 * accès à sa console.
 *
 * Sur la solidité de l'en-tête `x-vercel-cron` : il est posé par l'ordonnanceur de la
 * plateforme, et je n'ai pas pu vérifier depuis cet environnement qu'elle le retire bien
 * des requêtes entrantes. On ne fait donc pas reposer la sécurité dessus. Ce qui borne
 * réellement un appel non désiré, c'est le verrou du jour — une tâche ne s'exécute qu'une
 * fois par jour, quel que soit le nombre d'appels — et la déduplication des emails, qui
 * fait qu'un rejeu n'écrit ni n'envoie rien deux fois. `CRON_SECRET` reste la vraie
 * serrure, et le workflow du dépôt s'en sert.
 */
type Declencheur = "vercel-cron" | "externe" | "manuel";

function declencheurDeLAppel(req: Request): Declencheur | null {
  if (req.headers["x-vercel-cron"] !== undefined) return "vercel-cron";
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization === `Bearer ${secret}`) return "externe";
  return null;
}

/** Adresse qui reçoit les alertes d'exploitation. Jamais celle d'un étudiant. */
const EMAIL_ALERTE = process.env.ADMIN_ALERT_EMAIL || "contact@louisfarm.com";

/** Délai au-delà duquel une tâche quotidienne est considérée comme muette. */
export const TACHE_SILENCE_HEURES = 36;

/**
 * Délai au-delà duquel une prise de verrou restée inachevée est présumée morte.
 *
 * Quinze minutes pour une fonction dont le temps imparti est de trente secondes : très
 * large à dessein. Reprendre trop tôt ferait travailler deux instances en parallèle ;
 * reprendre trop tard laisserait la journée sans envoi. Entre les deux, on choisit de
 * perdre du temps plutôt que de doubler le travail.
 */
const VERROU_MINUTES = 15;

type OptionsTache = {
  /** Fourni par une route déjà authentifiée (l'administration), qui n'a ni en-tête ni jeton. */
  declencheur?: Declencheur;
  /** Passer outre le verrou du jour. Réservé au déclenchement manuel. */
  forcer?: boolean;
};

type PriseDeVerrou =
  | { pris: true; id: number | null; tentative: number }
  | { pris: false; resume: unknown; declencheur: string | null };

/**
 * Prend le verrou de la journée pour une tâche, ou dit pourquoi il n'est pas à prendre.
 *
 * ── Pourquoi une contrainte d'unicité plutôt qu'un verrou applicatif ──
 *
 * Deux ordonnanceurs visent désormais les mêmes tâches (voir supabase/academy_cron_verrou.sql).
 * Un « lire puis écrire » côté serveur laisserait une fenêtre de course de quelques
 * millisecondes, largement suffisante sur deux instances sans état qui démarrent en même
 * temps. `unique (tache, jour)` supprime la fenêtre : c'est la base qui arbitre, en une
 * seule opération, et le perdant l'apprend par un code d'erreur.
 *
 * ── Ce qui reste reprenable ──
 *
 * Une journée déjà RÉUSSIE est close : le second ordonnanceur repart sans rien faire.
 * Une journée en ÉCHEC ou restée inachevée depuis trop longtemps se reprend — sinon le
 * filet ne rattraperait jamais rien, ce qui est précisément sa raison d'être. La reprise
 * met à jour la ligne du jour au lieu d'en insérer une seconde, et `tentatives` sert à la
 * fois de compteur et de numéro de version pour la mise à jour conditionnelle : deux
 * instances qui reprennent en même temps lisent le même compteur, tentent toutes deux de
 * l'incrémenter, et une seule voit sa mise à jour aboutir.
 */
async function prendreLeVerrou(
  nom: string, jour: string, declencheur: Declencheur, forcer: boolean,
): Promise<PriseDeVerrou> {
  const { data: insere, error } = await supabase.from("cron_runs")
    .insert({ tache: nom, jour, declencheur }).select("id").single();

  if (!error) return { pris: true, id: insere?.id ?? null, tentative: 1 };

  // 23505 : violation d'unicité, donc la journée est déjà prise. Tout autre code est une
  // panne du journal — et on ne renonce PAS à envoyer les relances parce que le carnet de
  // bord est cassé. On travaille sans verrou, en le disant.
  if ((error as any).code !== "23505") {
    console.error(`cron ${nom} : journal indisponible, exécution sans verrou —`, error.message);
    return { pris: true, id: null, tentative: 1 };
  }

  const { data: existante } = await supabase.from("cron_runs")
    .select("id, ok, demarre_at, tentatives, resume, declencheur")
    .eq("tache", nom).eq("jour", jour).maybeSingle();
  if (!existante) return { pris: true, id: null, tentative: 1 };

  const morte = existante.ok === null
    && Date.now() - new Date(existante.demarre_at).getTime() > VERROU_MINUTES * 60_000;
  const reprenable = forcer || existante.ok === false || morte;
  if (!reprenable) {
    return { pris: false, resume: existante.resume, declencheur: existante.declencheur };
  }

  const tentative = (existante.tentatives ?? 1) + 1;
  const { data: reprise } = await supabase.from("cron_runs")
    .update({
      demarre_at: new Date().toISOString(), termine_at: null,
      ok: null, erreur: null, declencheur, tentatives: tentative,
    })
    .eq("id", existante.id)
    .eq("tentatives", existante.tentatives ?? 1)   // garde optimiste
    .select("id").maybeSingle();

  // Aucune ligne mise à jour : une autre instance a repris entre-temps. Elle travaille,
  // on s'efface.
  if (!reprise) return { pris: false, resume: existante.resume, declencheur: existante.declencheur };
  return { pris: true, id: reprise.id, tentative };
}

/**
 * Exécute une tâche planifiée en laissant une trace, quoi qu'il arrive.
 *
 * Trois choses que le try/catch seul ne donne pas :
 *
 *   1. Une LIGNE EST ÉCRITE AVANT le travail. Si la fonction est tuée en cours de route
 *      — temps imparti dépassé, mémoire — la ligne reste à `ok = null`, et cet état
 *      inachevé est précisément ce qu'aucune exception n'aurait signalé.
 *   2. L'alerte ne dépend pas du journal. Si la base est en panne, l'écriture échoue mais
 *      l'email part quand même : c'est le cas où il est le plus utile.
 *   3. L'envoi de l'alerte est lui-même protégé. Une erreur d'expédition ne doit pas
 *      remplacer l'erreur d'origine dans les journaux de la plateforme.
 *
 * Et depuis le verrou du jour, une quatrième : la tâche est INSENSIBLE au nombre
 * d'appelants. On peut lui envoyer deux ordonnanceurs et un clic manuel le même matin,
 * le travail n'a lieu qu'une fois.
 */
async function executerTache(
  nom: string,
  req: Request,
  res: Response,
  corps: () => Promise<Record<string, unknown>>,
  options: OptionsTache = {},
) {
  const declencheur = options.declencheur ?? declencheurDeLAppel(req);
  if (!declencheur) {
    // Un refus ne laissait AUCUNE trace : le garde-fou répond avant l'écriture du
    // journal, si bien que « appelée puis refusée » et « jamais appelée » se
    // ressemblaient trait pour trait dans le tableau de bord. C'est le défaut qui
    // rendait le diagnostic impossible, et c'est ce que cette ligne ferme.
    //
    // Dans les journaux de la fonction, pas en base : l'endpoint est joignable
    // publiquement, et une table qu'un robot peut faire grossir n'est pas un journal,
    // c'est une charge. L'agent d'appel est le renseignement décisif — l'ordonnanceur
    // de la plateforme s'annonce, un robot d'indexation aussi.
    //
    // On journalise des PRÉSENCES, jamais des valeurs : ni le jeton reçu, ni le secret
    // attendu ne doivent finir dans un journal d'exploitation.
    console.warn(
      `cron ${nom} : appel REFUSÉ`,
      {
        methode: req.method,
        enteteVercel: req.headers["x-vercel-cron"] !== undefined,
        jetonPorteurRecu: typeof req.headers.authorization === "string",
        secretConfigure: !!process.env.CRON_SECRET,
        agent: String(req.headers["user-agent"] || "—").slice(0, 80),
      },
    );
    return res.status(401).json({ message: "Non autorisé" });
  }

  // Le pendant du refus : une ligne à l'entrée, avant toute écriture en base. Si le
  // journal lui-même est injoignable, il reste au moins la preuve que l'appel est arrivé.
  console.log(`cron ${nom} : appel accepté (${req.method}, ${declencheur})`);

  const jour = new Date().toISOString().slice(0, 10);
  const verrou = await prendreLeVerrou(nom, jour, declencheur, options.forcer === true);

  if (!verrou.pris) {
    // 200 et non 409 : ce n'est pas une erreur, c'est le filet qui constate que le
    // premier ordonnanceur a fait le travail. Un workflow planifié qui échouerait ici
    // enverrait une alerte tous les matins où tout va bien.
    console.log(`cron ${nom} : déjà exécutée aujourd'hui par « ${verrou.declencheur} », rien à faire.`);
    return res.json({
      tache: nom, jour, ignore: true,
      message: `Déjà exécutée aujourd'hui (déclenchée par ${verrou.declencheur ?? "?"}).`,
      resume: verrou.resume,
    });
  }

  const ligne = verrou.id;
  const clore = async (champs: Record<string, unknown>) => {
    if (!ligne) return;
    await supabase.from("cron_runs")
      .update({ termine_at: new Date().toISOString(), ...champs })
      .eq("id", ligne).then(() => {}, () => {});
  };

  try {
    const resume = await corps();
    await clore({ ok: true, resume });
    res.json({ tache: nom, jour, declencheur, tentative: verrou.tentative, ...resume });
  } catch (e: any) {
    const message = String(e?.message || e).slice(0, 2000);
    console.error(`cron ${nom} : échec —`, message);
    await clore({ ok: false, erreur: message });
    // Une alerte par tâche et par jour : un échec qui se répète mérite un rappel
    // quotidien, pas un email par tentative. La ligne restant en `ok = false`, le second
    // ordonnanceur la reprendra tout à l'heure — c'est exactement ce qu'on veut.
    await sendAcademyEmail({
      studentId: null, to: EMAIL_ALERTE, type: "cron_echec",
      subject: `⚠️ Tâche planifiée en échec : ${nom}`,
      html: tacheEchoueeEmailHtml(nom, message),
      dedupeKey: `cron_echec:${nom}:${jour}`,
    }).catch(() => {});
    res.status(500).json({ message: "Tâche en échec", tache: nom, tentative: verrou.tentative });
  }
}

async function corpsRelancesDeVerification(): Promise<Record<string, unknown>> {

  const now = Date.now();
  const horizon = new Date(now - VERIFY_REMINDER_GIVE_UP_DAYS * 86400000).toISOString();
  const { data: students, error } = await supabase.from("students")
    .select("id, full_name, email, created_at, course_emails")
    .eq("email_verified", false)
    .gte("created_at", horizon);
  // Une lecture en échec est une panne, pas un résultat : on la fait remonter à
  // l'enveloppe, qui la journalise et vous alerte.
  if (error) throw new Error(`lecture des comptes non vérifiés : ${error.message}`);

  let envoyees = 0, ignorees = 0;
  const parEtape: Record<string, number> = {};
  for (const s of students || []) {
    if ((s as any).course_emails === false || !s.email) { ignorees++; continue; }
    const ageJours = Math.floor((now - new Date(s.created_at).getTime()) / 86400000);
    // Rang applicable : la relance la plus avancée que l'âge du compte justifie.
    const etape = [...VERIFY_REMINDER_DAYS].reverse().find(d => ageJours >= d);
    if (!etape) { ignorees++; continue; }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyCode = String(crypto.randomInt(100000, 999999));
    const verifyExpires = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const { error: upErr } = await supabase.from("students")
      .update({ verify_token: verifyToken, verify_code: verifyCode, verify_expires: verifyExpires })
      .eq("id", s.id);
    // Ne pas envoyer un lien qu'on n'a pas réussi à enregistrer : il serait invalide.
    if (upErr) { console.error(`verify-reminders: écriture du jeton échouée pour ${s.id}`, upErr.message); ignorees++; continue; }

    const r = await sendAcademyEmail({
      studentId: s.id, to: s.email, type: "verify_reminder",
      subject: etape === 1 ? "Il reste une étape — confirmez votre adresse"
        : etape === 3 ? "Votre compte LouisFarm Learning attend toujours"
        : "Dernier rappel — confirmez votre adresse",
      html: verifyReminderEmailHtml(s.full_name, `${SITE_URL}/academy/verify?token=${verifyToken}`, verifyCode, etape),
      // Une relance par rang et par étudiant : rejouer la tâche n'en renvoie pas une seconde.
      dedupeKey: `verify_reminder:${s.id}:${etape}`,
    });
    if (r.sent) { envoyees++; parEtape[`J+${etape}`] = (parEtape[`J+${etape}`] || 0) + 1; }
    else ignorees++;
  }

  console.log(`verify-reminders: ${envoyees} relance(s) envoyée(s), ${ignorees} ignorée(s) sur ${students?.length ?? 0} compte(s) non vérifié(s).`, parEtape);
  return { candidats: students?.length ?? 0, envoyees, ignorees, parEtape };
}

const relancesDeVerification = (req: Request, res: Response) =>
  executerTache("verify-reminders", req, res, corpsRelancesDeVerification);

// ══════════════════════════════════════════════════════════════
// GET *et* POST, et c'est GET qui compte.
//
// L'ordonnanceur de Vercel appelle une tâche planifiée en GET. Les deux routes n'étaient
// déclarées qu'en POST : chaque nuit, la plateforme joignait l'URL, Express répondait
// « Cannot GET », et la tâche ne s'exécutait pas. Rien ne le signalait — un 404 est une
// réponse HTTP valide pour l'appelant, il ne réessaie pas ; et la route n'étant jamais
// atteinte, elle n'écrivait aucune trace. L'absence d'envoi était indiscernable de
// « rien à envoyer ».
//
// La panne n'a touché que ce qui est déclenché par l'horloge, c'est-à-dire exactement ce qui
// vise les étudiants qui ne reviennent plus : sept comptes non vérifiés n'ont jamais reçu
// leurs relances. Tout ce qui part sur une action d'étudiant fonctionnait, ce qui rendait le
// volume global rassurant.
//
// POST reste accepté : il sert au rattrapage manuel avec le jeton porteur.
// ══════════════════════════════════════════════════════════════
app.get("/api/cron/verify-reminders", relancesDeVerification);
app.post("/api/cron/verify-reminders", relancesDeVerification);

/**
 * Alertes de retard sur le rythme conseillé.
 *
 * Tâche quotidienne (voir vercel.json). Comme pour les relances de vérification, un envoi
 * déclenché depuis le site n'atteindrait que les étudiants qui reviennent — or ceux qu'il
 * faut prévenir sont précisément ceux qui ne reviennent plus.
 *
 * Trois alertes avant le seuil (7, 14 et 21 jours de retard), puis une quatrième quand les
 * trente jours sont franchis. Le palier se déduit du retard constaté, pas d'un compteur :
 * si la tâche saute un jour, l'étudiant reçoit quand même la bonne alerte.
 *
 * La clé d'idempotence porte la date d'admission : un étudiant remis à zéro puis réadmis
 * repart avec une série d'alertes neuve, au lieu d'être considéré comme déjà prévenu.
 */
async function corpsAlertesDeRetard(): Promise<Record<string, unknown>> {

  const constat = await constatDeRetard();
  let envoyees = 0, ignorees = 0;
  const parPalier: Record<string, number> = {};

  for (const c of constat) {
    if (!c.emailsCours || !c.email) { ignorees++; continue; }
    // Palier applicable : le plus avancé que le retard justifie. Au-delà du seuil, une
    // alerte unique — insister davantage relèverait du harcèlement.
    const palier = c.joursDeRetard > RETARD_EXCLUSION_JOURS
      ? RETARD_EXCLUSION_JOURS
      : [...RETARD_PALIERS].reverse().find(d => c.joursDeRetard >= d);
    if (!palier) { ignorees++; continue; }

    const alerte = alerteDeRetard({
      jours: c.joursDeRetard,
      leconsEnRetard: c.leconsEnRetard,
      finAdmission: c.finAdmission,
    });
    if (!alerte) { ignorees++; continue; }

    const r = await sendAcademyEmail({
      studentId: c.id, to: c.email, type: "retard",
      subject: alerte.niveau === "rappel" ? "Une échéance est passée — reprenez quand vous voulez"
        : alerte.niveau === "avertissement" ? "Votre parcours est menacé — il reste " + alerte.joursAvantRemiseAZero + " jours"
        : alerte.niveau === "dernier" ? "Dernier rappel avant la remise à zéro de votre parcours"
        : "Votre parcours dépasse le seuil de trente jours de retard",
      html: retardEmailHtml(c.nom, alerte),
      dedupeKey: `retard:${c.id}:${c.admisLe}:${palier}`,
    });
    if (r.sent) { envoyees++; parPalier[`J+${palier}`] = (parPalier[`J+${palier}`] || 0) + 1; }
    else ignorees++;
  }

  console.log(`late-warnings: ${envoyees} alerte(s) envoyée(s), ${ignorees} ignorée(s) sur ${constat.length} admis.`, parPalier);
  return { admis: constat.length, envoyees, ignorees, parPalier };
}

const alertesDeRetard = (req: Request, res: Response) =>
  executerTache("late-warnings", req, res, corpsAlertesDeRetard);

app.get("/api/cron/late-warnings", alertesDeRetard);
app.post("/api/cron/late-warnings", alertesDeRetard);

/**
 * Registre des tâches quotidiennes.
 *
 * Il existe pour une seule raison : permettre de lancer une tâche depuis
 * l'administration, sans passer par l'ordonnanceur. Ce n'est pas un confort — c'est ce
 * qui rend la chaîne VÉRIFIABLE. Jusqu'ici, savoir si une tâche marchait supposait
 * d'attendre 09h00 UTC puis de regarder si quelque chose s'était passé ; et comme rien
 * ne se passait jamais, on ne savait pas distinguer « l'ordonnanceur ne part pas » de
 * « la tâche est cassée ». Un bouton tranche la question en dix secondes.
 */
const TACHES_PLANIFIEES: Record<string, () => Promise<Record<string, unknown>>> = {
  "verify-reminders": corpsRelancesDeVerification,
  "late-warnings": corpsAlertesDeRetard,
};

/**
 * Lancer une tâche à la main depuis l'administration.
 *
 * `?forcer=1` passe outre le verrou du jour. C'est sans danger et c'est le mode utile :
 * les emails portent tous une clé d'idempotence (`dedupeKey`), donc un second passage
 * dans la même journée ne renvoie rien à personne — il recalcule, il journalise, et il
 * vous rend le résumé. C'est un test à blanc qui dit la vérité.
 *
 * Sans `forcer`, la route se comporte exactement comme un ordonnanceur : si la journée
 * est déjà faite, elle le dit et ne refait rien.
 */
app.post("/api/admin/cron/:tache", requireAuth, async (req, res) => {
  const nom = String(req.params.tache);
  const corps = TACHES_PLANIFIEES[nom];
  if (!corps) {
    return res.status(404).json({
      message: `Tâche inconnue : ${nom}`, connues: Object.keys(TACHES_PLANIFIEES),
    });
  }
  await executerTache(nom, req, res, corps, {
    declencheur: "manuel",
    forcer: req.query.forcer === "1" || req.query.forcer === "true",
  });
});

/**
 * État des tâches planifiées, pour l'administration.
 *
 * Renvoie la dernière ligne de chaque tâche connue — y compris `null` quand il n'y en a
 * aucune, ce qui est le cas depuis la création de la table et le renseignement le plus
 * important de tous. `declencheur` répond à la question qu'on ne pouvait pas poser :
 * lequel des deux ordonnanceurs fait réellement le travail.
 */
app.get("/api/admin/cron", requireAuth, async (_req, res) => {
  const { data } = await supabase.from("cron_runs")
    .select("tache, jour, demarre_at, termine_at, ok, declencheur, tentatives, resume, erreur")
    .order("demarre_at", { ascending: false }).limit(60);
  const lignes = data || [];
  res.json({
    taches: Object.keys(TACHES_PLANIFIEES).map(nom => ({
      nom,
      derniere: lignes.find(l => l.tache === nom) ?? null,
      executions30j: lignes.filter(l => l.tache === nom).length,
    })),
    secretConfigure: !!process.env.CRON_SECRET,
    journal: lignes.slice(0, 20),
  });
});

// ── Renvoyer l'email de validation ──
app.post("/api/academy/resend-verify", rateLimit(5, 15 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data } = await supabase.from("students").select("full_name, email, email_verified").eq("id", sid).single();
  if (!data) return res.status(404).json({ message: "Compte introuvable" });
  if (data.email_verified) return res.json({ message: "Email déjà vérifié" });

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyCode = String(crypto.randomInt(100000, 999999));
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("students").update({ verify_token: verifyToken, verify_code: verifyCode, verify_expires: verifyExpires }).eq("id", sid);

  let emailSent = false, emailError: string | null = null;
  if (resend) {
    const verifyUrl = `${SITE_URL}/academy/verify?token=${verifyToken}`;
    try {
      const r: any = await resend.emails.send({
        from: FROM_EMAIL, to: data.email,
        subject: "Confirmez votre inscription — LouisFarm Learning",
        html: verifyEmailHtml(data.full_name, verifyUrl, verifyCode),
      });
      if (r?.error) { emailError = r.error?.message || String(r.error); }
      else { emailSent = true; await logAcademyEmail(sid, "verify", data.email, "Confirmez votre inscription"); }
    } catch (e: any) { emailError = e?.message || String(e); }
  } else {
    emailError = "Service email non configuré";
  }
  res.json({
    message: emailSent ? "Email de validation renvoyé" : "Service email temporairement indisponible. Réessayez plus tard.",
    emailSent,
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
        subject: "Réinitialisation de votre mot de passe — LouisFarm Learning",
        html: resetEmailHtml(data.full_name, resetUrl),
      }).then(() => logAcademyEmail(data.id, "reset", email, "Réinitialisation mot de passe")).catch(() => {});
    }
  }
  res.json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
});

// ── Mot de passe oublié — réinitialisation ──
app.post("/api/academy/reset-password", rateLimit(5, 15 * 60 * 1000), async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Token et nouveau mot de passe requis" });
  if (password.length < 8) return res.status(400).json({ message: "Le mot de passe doit faire au moins 8 caractères" });
  const { data } = await supabase.from("students").select("id, reset_expires").eq("reset_token", token).maybeSingle();
  if (!data) return res.status(400).json({ message: "Lien de réinitialisation invalide" });
  if (data.reset_expires && new Date(data.reset_expires) < new Date())
    return res.status(400).json({ message: "Lien expiré. Refaites une demande." });

  const hash = await bcrypt.hash(password, 12);
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
  const token = generateStudentToken(data.id);
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
    .select("id, full_name, first_name, middle_name, last_name, email, phone, country, city, organization, profession, bio, gender, birth_year, linkedin, experience_level, interests, entry_score, avatar_url, status, email_verified, course_emails, created_at, last_login")
    .eq("id", sid).single();
  if (error) return res.status(404).json({ message: "Étudiant introuvable" });
  res.json(data);
});

// ── Mettre à jour son profil ──
app.put("/api/academy/me", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const allowed = ["full_name", "first_name", "middle_name", "last_name", "phone", "country", "city", "organization", "profession", "bio", "gender", "birth_year", "linkedin", "experience_level", "interests", "avatar_url", "course_emails"];
  const maxLengths: Record<string, number> = { full_name: 120, first_name: 60, middle_name: 60, last_name: 60, phone: 30, country: 60, city: 60, organization: 120, profession: 120, bio: 1000, gender: 20, linkedin: 200 };
  const update: any = {};
  for (const k of allowed) {
    if (!(k in req.body)) continue;
    const v = req.body[k];
    if (typeof v === "string" && maxLengths[k] && v.length > maxLengths[k])
      return res.status(400).json({ message: `${k} dépasse la longueur maximale (${maxLengths[k]})` });
    update[k] = typeof v === "string" ? v.trim() : v;
  }
  if (Object.keys(update).length === 0) return res.status(400).json({ message: "Aucun champ à mettre à jour" });

  // full_name est dérivé, jamais saisi en parallèle : dès qu'une partie de l'état civil
  // change, on le recompose pour que le nom affiché et le nom imprimé sur les documents
  // ne puissent pas diverger.
  if ("first_name" in update || "middle_name" in update || "last_name" in update) {
    const { data: cur } = await supabase.from("students")
      .select("first_name, middle_name, last_name").eq("id", sid).single();
    const merged = { ...(cur || {}), ...update };
    const composed = composeFullName(merged.first_name, merged.middle_name, merged.last_name);
    if (composed) update.full_name = composed;
  }

  const { data, error } = await supabase.from("students").update(update).eq("id", sid)
    .select("id, full_name, first_name, middle_name, last_name, email, phone, country, city, organization, profession, bio, gender, birth_year, linkedin, experience_level, interests, avatar_url, course_emails").single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

// ── Changer son mot de passe (connecté) ──
app.put("/api/academy/change-password", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ message: "Mot de passe actuel et nouveau requis" });
  if (new_password.length < 8) return res.status(400).json({ message: "Le nouveau mot de passe doit faire au moins 8 caractères" });
  const { data } = await supabase.from("students").select("password_hash").eq("id", sid).single();
  if (!data) return res.status(404).json({ message: "Compte introuvable" });
  const valid = await bcrypt.compare(current_password, data.password_hash);
  if (!valid) return res.status(401).json({ message: "Mot de passe actuel incorrect" });
  const hash = await bcrypt.hash(new_password, 12);
  await supabase.from("students").update({ password_hash: hash }).eq("id", sid);
  res.json({ message: "Mot de passe modifié" });
});

// ── Liste des cours ──
app.get("/api/academy/courses", async (_req, res) => {
  const { data, error } = await supabase.from("sms_courses").select("*").eq("is_published", true).order("order_index");
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

/**
 * Données de la page de présentation — publique, aucun jeton requis.
 *
 * Les trois cours du cursus MEAL sont présentés sous l'identité de l'outil qu'ils
 * enseignent, parce que c'est ainsi que les gens les cherchent : on s'inscrit pour
 * « apprendre KoboCollect », pas pour « MEAL-01 ». Le code du cours reste affiché, il fait
 * le lien avec ce que l'étudiant retrouvera une fois admis.
 *
 * Les chiffres annoncés sont comptés en base. Une page de présentation qui gonfle ses
 * chiffres se fait démentir dès la première leçon.
 */
const OUTILS: Record<string, { outil: string; objectif: string; competences: string[]; accent: string }> = {
  "MEAL-01": {
    outil: "KoboCollect",
    objectif: "Collecte de données sur le terrain",
    competences: ["Création de formulaires XLSForm", "Collecte hors ligne sur mobile", "Synchronisation et gestion des données"],
    accent: "#0d9488",
  },
  "MEAL-02": {
    outil: "QGIS",
    objectif: "Cartographie et analyse spatiale",
    competences: ["Création de cartes thématiques", "Analyse spatiale et zones tampons", "Production d'indicateurs visuels"],
    accent: "#2563eb",
  },
  "MEAL-03": {
    outil: "Python",
    objectif: "Analyse et traitement des données",
    competences: ["Bases de la programmation", "Nettoyage et analyse des données", "Visualisation et automatisation"],
    accent: "#7c3aed",
  },
};

// Fenêtres d'inscription, à titre indicatif : l'admission reste continue. Le calendrier
// donne un repère de rythme, il ne conditionne pas l'accès — un visiteur qui arrive un
// 15 août ne doit pas croire qu'il lui faut attendre six semaines.
const MOIS_INSCRIPTION = [0, 2, 4, 6, 8, 10]; // janvier, mars, mai, juillet, septembre, novembre

/**
 * Chiffres de la vitrine — catalogue entier, pas seulement le cursus MEAL.
 *
 * `/api/academy/landing` compte volontairement les seuls modules qu'il présente : un
 * visiteur qui lit « 4 modules » au-dessus de trois cartes compte, et il a raison. La page
 * d'accueil, elle, parle de toute l'offre, donc d'autres nombres. Deux besoins, deux
 * routes — plutôt qu'un paramètre qui aurait rendu les deux réponses ambiguës.
 *
 * Aucun chiffre n'est écrit en dur dans la page : un cours ajouté se compte tout seul, et
 * personne ne découvre six mois plus tard que la vitrine annonce un catalogue périmé.
 */
app.get("/api/site-figures", async (_req, res) => {
  try {
    const [coursQ, leconsQ, etudiantsQ, attestationsQ] = await Promise.all([
      supabase.from("sms_courses").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("sms_lessons").select("id", { count: "exact", head: true }),
      supabase.from("students").select("id", { count: "exact", head: true }).not("admitted_at", "is", null),
      supabase.from("attestations").select("id", { count: "exact", head: true }).eq("status", "issued"),
    ]);
    res.json({
      cours: coursQ.count ?? 0,
      lecons: leconsQ.count ?? 0,
      admis: etudiantsQ.count ?? 0,
      attestations: attestationsQ.count ?? 0,
      // Années d'expérience : la seule valeur qui ne se déduit d'aucune table. Elle vit
      // ici plutôt que dans le JSX pour se corriger en un endroit.
      anneesExperience: 12,
    });
  } catch {
    res.json({ cours: 0, lecons: 0, admis: 0, attestations: 0, anneesExperience: 12 });
  }
});

app.get("/api/academy/landing", async (_req, res) => {
  const [coursQ, etudiantsQ, leconsQ] = await Promise.all([
    supabase.from("sms_courses").select("id, code, title, description, level, order_index").eq("is_published", true).order("order_index"),
    supabase.from("students").select("id, admitted_at"),
    supabase.from("sms_lessons").select("id, course_id, content"),
  ]);

  const cours = coursQ.data || [];
  const lecons = leconsQ.data || [];
  const etudiants = etudiantsQ.data || [];

  const compterExercices = (courseId: number) => {
    let n = 0;
    for (const l of lecons) {
      if (l.course_id !== courseId) continue;
      let c: any = (l as any).content;
      if (typeof c === "string") { try { c = JSON.parse(c); } catch { c = null; } }
      n += (c?.cells || []).filter((x: any) => x?.type === "exercise").length;
    }
    return n;
  };

  const modules = cours
    .filter(c => OUTILS[c.code])
    .map(c => ({
      code: c.code,
      outil: OUTILS[c.code].outil,
      objectif: OUTILS[c.code].objectif,
      competences: OUTILS[c.code].competences,
      accent: OUTILS[c.code].accent,
      titreProjet: c.title,
      description: c.description,
      niveau: c.level,
      lecons: lecons.filter(l => l.course_id === c.id).length,
      exercices: compterExercices(c.id),
    }));

  // ── Calendrier indicatif ──
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const nomMois = (m: number, a: number) =>
    new Date(a, m, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // On déroule sur deux ans pour que « la prochaine » existe toujours, même en décembre.
  const sessions: any[] = [];
  for (const a of [annee, annee + 1]) {
    for (const m of MOIS_INSCRIPTION) {
      const debut = new Date(a, m, 1);
      const fin = new Date(a, m + 1, 0, 23, 59, 59);
      const demarrage = new Date(a, m + 1, 1);
      sessions.push({
        id: `${a}-${String(m + 1).padStart(2, "0")}`,
        moisInscription: nomMois(m, a),
        moisDemarrage: nomMois(m + 1, a),
        debutInscription: debut.toISOString(),
        finInscription: fin.toISOString(),
        demarrage: demarrage.toISOString(),
        statut: maintenant > fin ? "terminee" : maintenant >= debut ? "ouverte" : "a_venir",
      });
    }
  }
  const courante = sessions.find(s => s.statut === "ouverte") ?? null;
  const prochaine = sessions.find(s => s.statut === "a_venir") ?? null;

  res.json({
    modules,
    // L'admission ne dépend pas du calendrier : on l'affirme dans la charge utile pour que
    // l'interface ne puisse pas laisser croire le contraire.
    admissionContinue: true,
    seuilAdmission: ADMISSION_PASS_SCORE,
    questionsTest: 30,
    moisAcces: ADMISSION_MONTHS,
    seuilExercices: EXERCISE_PASS_PCT,
    // Les chiffres portent sur les modules RÉELLEMENT présentés, pas sur tout le catalogue.
    // La base contient aussi des cours hors cursus MEAL (formations de formateurs, par
    // exemple) : les compter ici afficherait « 4 modules » au-dessus de trois cartes, et
    // « 32 leçons » là où les trois cartes en totalisent 20. Le visiteur compte, lui.
    chiffres: {
      etudiants: etudiants.length,
      admis: etudiants.filter(e => e.admitted_at).length,
      cours: modules.length,
      lecons: modules.reduce((n, m) => n + m.lecons, 0),
      exercices: modules.reduce((n, m) => n + m.exercices, 0),
    },
    calendrier: {
      sessions: sessions.filter(s => s.statut !== "terminee").slice(0, 6),
      courante,
      prochaine,
    },
  });
});

// ── Détail d'un cours + leçons ──
app.get("/api/academy/courses/:id", async (req, res) => {
  const { data: course, error } = await supabase.from("sms_courses").select("*").eq("id", Number(req.params.id)).eq("is_published", true).single();
  if (error) return res.status(404).json({ message: "Cours introuvable" });
  const { data: lessons } = await supabase.from("sms_lessons").select("*").eq("course_id", course.id).order("order_index");
  // Le contenu part vers le navigateur : les corrigés d'exercices en sont retirés.
  const safeLessons = (lessons || []).map((l: any) => {
    let content = l.content;
    if (typeof content === "string") { try { content = JSON.parse(content); } catch { content = null; } }
    return { ...l, content: content ? stripExerciseAnswers(content) : l.content };
  });
  res.json({ ...course, lessons: safeLessons });
});

// ── Mes inscriptions (avec infos cours) ──
app.get("/api/academy/my-enrollments", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data, error } = await supabase.from("enrollments")
    .select("*, sms_courses(id, code, title, description, tools, level, total_lessons)")
    .eq("student_id", sid).order("enrolled_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  // total_lessons (saisi par l'admin) peut diverger du nombre réel de leçons publiées :
  // on l'aligne sur un COUNT réel pour rester cohérent avec le calcul de progression.
  const courseIds = [...new Set((data || []).map((e: any) => e.course_id))];
  const { data: lessonRows } = courseIds.length
    ? await supabase.from("sms_lessons").select("course_id").in("course_id", courseIds)
    : { data: [] as any[] };
  const counts: Record<number, number> = {};
  for (const l of lessonRows || []) counts[l.course_id] = (counts[l.course_id] || 0) + 1;
  const enriched = (data || []).map((e: any) => ({
    ...e,
    sms_courses: e.sms_courses ? { ...e.sms_courses, total_lessons: counts[e.course_id] ?? e.sms_courses.total_lessons } : e.sms_courses,
  }));
  // Même filtre que le planning : les inscriptions héritées à un parcours non admis
  // faisaient apparaître le cours dans « mes cours », d'où l'on pouvait entrer.
  res.json(await filtrerAuxParcoursAdmis(sid, enriched, (e: any) => e.sms_courses?.code));
});

// ── S'inscrire à un cours ──
app.post("/api/academy/enroll", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ message: "course_id requis" });
  const { data: course } = await supabase.from("sms_courses").select("id").eq("id", course_id).eq("is_published", true).maybeSingle();
  if (!course) return res.status(404).json({ message: "Cours introuvable" });
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
  const { course_id, lesson_id, answers } = req.body;
  if (!course_id || !lesson_id) return res.status(400).json({ message: "course_id et lesson_id requis" });

  // Admission requise. L'email non vérifié ne bloque pas l'apprentissage (voir submit-test) :
  // il est exigé au moment de délivrer une attestation ou un certificat.
  const { data: stud } = await supabase.from("students").select("admitted_at, admission_expires, email_verified").eq("id", sid).single();
  if (!stud?.admitted_at) return res.status(403).json({ message: "Vous devez réussir le test d'admission pour accéder aux cours." });
  if (stud.admission_expires && new Date(stud.admission_expires) < new Date())
    return res.status(403).json({ message: "Votre période d'admission (3 mois) a expiré. Repassez le test d'admission." });

  // Le cours doit relever d'un parcours auquel l'étudiant est admis.
  //
  // Le contrôle au-dessus ne regarde que l'admission au cursus MEAL. Il suffisait donc
  // d'être admis au MEAL pour valider les leçons de N'IMPORTE QUEL parcours, à condition
  // d'avoir une ligne de planning ouverte — et dix-sept étudiants en portaient une pour
  // TOF-FIN-01, héritée d'avant la séparation par parcours. Le verrou de planning plus bas
  // ne le voyait pas : la ligne existait et n'était pas verrouillée, donc elle passait.
  //
  // Chaque parcours a sa propre porte et sa propre fenêtre de trois mois ; c'est ici
  // qu'elles se vérifient.
  const { data: coursVise } = await supabase.from("sms_courses").select("code").eq("id", course_id).maybeSingle();
  const progDuCours = coursVise?.code ? programOf(coursVise.code)?.id : null;
  if (progDuCours) {
    const admission = (await parcoursAdmis(sid)).find(p => p.programId === progDuCours);
    if (!admission)
      return res.status(403).json({ message: "Vous devez réussir le test d'admission de ce parcours pour accéder à ses cours." });
    if (admission.expires && new Date(admission.expires) < new Date())
      return res.status(403).json({ message: "Votre période d'admission (3 mois) à ce parcours a expiré. Repassez le test d'admission." });
  }

  // Vérifier l'inscription
  const { data: enr } = await supabase.from("enrollments")
    .select("id").eq("student_id", sid).eq("course_id", course_id).maybeSingle();
  if (!enr) await supabase.from("enrollments").insert({ student_id: sid, course_id, started_at: new Date().toISOString() });

  // Vérifier que la leçon existe bien dans le cours indiqué (empêche un lesson_id forgé/d'un autre cours)
  const { data: lesson } = await supabase.from("sms_lessons").select("title, points, content").eq("id", lesson_id).eq("course_id", course_id).maybeSingle();
  if (!lesson) return res.status(404).json({ message: "Leçon introuvable pour ce cours." });

  // GATING : la leçon ne doit pas être verrouillée. Fail-closed — l'absence de ligne
  // lesson_progress est traitée comme verrouillée, pas comme autorisée.
  // On régénère d'abord le planning (idempotent) pour rattraper une leçon ajoutée après l'admission.
  //
  // Une leçon 'missed' (= en retard sur le rythme conseillé) reste validable : la seule
  // échéance qui exclut est la fenêtre d'admission de 3 mois, vérifiée plus haut. Refuser ici
  // rendait la leçon définitivement impossible à valider, donc le cours impossible à terminer,
  // donc le certificat Super-Expert définitivement perdu.
  await regenererPlannings(sid);
  await refreshLessonStates(sid);
  const { data: lp } = await supabase.from("lesson_progress")
    .select("status, unlock_at, due_at").eq("student_id", sid).eq("lesson_id", lesson_id).maybeSingle();
  if (!lp || lp.status === "locked")
    return res.status(403).json({ message: "Cette leçon n'est pas encore débloquée.", unlockAt: lp?.unlock_at, locked: true });

  // Correction des exercices « faire faire ». Une leçon qui en contient ne se valide pas en
  // cliquant : la note reflète les réponses produites par l'étudiant.
  let lessonContent = lesson.content;
  if (typeof lessonContent === "string") { try { lessonContent = JSON.parse(lessonContent); } catch { lessonContent = null; } }
  const graded = gradeLessonExercises(lessonContent, answers);

  const maxScore = lesson.points ?? 10;

  // Toute soumission d'une leçon à exercices compte, réussie ou non. C'est le
  // compteur qui manquait : sans lui un échec ne coûtait rien, et la note finale
  // ne distinguait pas la maîtrise de l'obstination.
  let tentative = 1;
  if (graded) {
    const { data: avant } = await supabase.from("lesson_progress")
      .select("tentatives").eq("student_id", sid).eq("lesson_id", lesson_id).maybeSingle();
    tentative = (Number(avant?.tentatives) || 0) + 1;
    await supabase.from("lesson_progress")
      .update({ tentatives: tentative })
      .eq("student_id", sid).eq("lesson_id", lesson_id).then(() => {}, () => {});
  }

  if (graded && !graded.passed) {
    // Échec : on dit QUELS exercices sont faux, jamais POURQUOI.
    //
    // La correction rédigée énonce la bonne réponse ; la renvoyer ici faisait de
    // l'échec volontaire le chemin le plus court vers le corrigé complet. Elle est
    // déplacée à la réussite, où elle est méritée. L'indice, lui, reste affiché :
    // il a été écrit pour être lu avant de répondre.
    return res.status(422).json({
      message: `${graded.correctCount}/${graded.total} exercices justes — il en faut ${EXERCISE_PASS_PCT}% pour valider la leçon.`,
      exerciseResults: resultatsSansCorrection(graded.results), scorePct: graded.scorePct,
      correctCount: graded.correctCount, total: graded.total, exercisesFailed: true,
      tentative, plafondProchaineNote: plafondDeNote(tentative + 1),
    });
  }

  // Réussite : la note est plafonnée par le rang de la tentative. Le plancher est
  // le seuil de validation — la persévérance valide toujours, elle cesse seulement
  // de valoir autant que la maîtrise du premier coup.
  const plafond = graded ? plafondDeNote(tentative) : 100;
  const pctRetenu = graded ? Math.min(graded.scorePct, plafond) : 100;
  const finalScore = Math.round(maxScore * pctRetenu / 100);

  // Insertion idempotente (une seule note par élève/leçon, protégée par la contrainte UNIQUE(student_id, lesson_id))
  await supabase.from("grades").upsert({
    student_id: sid, course_id, lesson_id,
    title: lesson.title || "Leçon", score: finalScore, max_score: maxScore, type: "lesson",
  }, { onConflict: "student_id,lesson_id", ignoreDuplicates: true });
  // Marquer la leçon comme complétée dans le planning hebdo
  await supabase.from("lesson_progress")
    .update({ status: "completed", completed_at: new Date().toISOString(), score: finalScore })
    .eq("student_id", sid).eq("lesson_id", lesson_id).then(() => {}, () => {});

  const result = await recalcCourseProgress(sid, course_id);

  // Les statuts sont recalculés APRÈS l'enregistrement de la note : c'est ce passage qui
  // ouvre la leçon suivante, et qui déclenche l'email « cours débloqué » le cas échéant.
  await refreshLessonStates(sid);

  // Email de réussite. Pas d'envoi quand la leçon termine le cours : recalcCourseProgress a
  // déjà envoyé « projet terminé », qui dit mieux la même chose au même moment.
  if (!result?.completed) {
    notifyLessonPassed(sid, course_id, lesson_id, lesson.title || "Leçon", finalScore, maxScore, result)
      .catch((e: any) => console.error("lesson_passed email error:", e?.message || e));
  }

  res.json({
    ...result,
    lessonScore: finalScore, lessonMax: maxScore,
    exerciseResults: graded?.results ?? null,
    scorePct: graded?.scorePct ?? null,
    tentative: graded ? tentative : null,
    plafondApplique: graded && plafond < 100 ? plafond : null,
    correctCount: graded?.correctCount ?? null,
    total: graded?.total ?? null,
  });
});

/**
 * Email envoyé après chaque leçon validée. Idempotent par (étudiant, leçon) : revalider la
 * même leçon ne renvoie rien.
 */
async function notifyLessonPassed(
  sid: number, courseId: number, lessonId: number, lessonTitle: string,
  score: number, max: number, result: { progress: number; done: number; total: number } | undefined,
) {
  const { data: stud } = await supabase.from("students")
    .select("full_name, email, course_emails").eq("id", sid).maybeSingle();
  if (!stud?.email || stud.course_emails === false) return;
  const { data: course } = await supabase.from("sms_courses")
    .select("code, title").eq("id", courseId).maybeSingle();
  if (!course) return;

  const { data: thisLesson } = await supabase.from("sms_lessons")
    .select("order_index").eq("id", lessonId).maybeSingle();

  // La leçon suivante du cours, et si elle est déjà accessible — c'est l'information utile :
  // elle dit à l'étudiant s'il enchaîne maintenant ou ce qu'il fait en attendant.
  let next: { title: string; open: boolean; unlockAt?: string } | null = null;
  if (thisLesson?.order_index != null) {
    const { data: nl } = await supabase.from("sms_lessons")
      .select("id, title, order_index").eq("course_id", courseId)
      .gt("order_index", thisLesson.order_index).order("order_index").limit(1).maybeSingle();
    if (nl) {
      const { data: nlp } = await supabase.from("lesson_progress")
        .select("status, unlock_at").eq("student_id", sid).eq("lesson_id", nl.id).maybeSingle();
      next = {
        title: nl.title,
        open: nlp?.status === "available" || nlp?.status === "missed",
        unlockAt: nlp?.unlock_at,
      };
    }
  }

  sendAcademyEmail({
    studentId: sid, to: stud.email, type: "lesson_passed",
    subject: `✅ Leçon validée : ${lessonTitle}`,
    html: lessonPassedEmailHtml(stud.full_name, course, { title: lessonTitle, order_index: thisLesson?.order_index }, {
      score, max,
      progress: result?.progress ?? 0, done: result?.done ?? 0, total: result?.total ?? 0,
      next,
    }),
    dedupeKey: `lesson_passed:${sid}:${lessonId}`,
  });
}

/**
 * Progression, reconnaissance et ressources de l'étudiant — en un appel.
 *
 * Rien n'est stocké pour cela : les points, le niveau et les réalisations sont RECALCULÉS
 * à chaque appel depuis les faits déjà en base (notes, leçons validées, admission,
 * attestations). Une table de compteurs aurait pu diverger de la réalité — un étudiant
 * crédité de points pour une leçon qu'on lui a retirée, par exemple — alors qu'un calcul
 * dérivé ne peut pas mentir.
 */

// Ce que rapporte chaque fait. Barème volontairement simple et lisible : un étudiant doit
// pouvoir comprendre d'où viennent ses points sans consulter de documentation.
const XP = {
  admission: 50,
  parLecon: 20,
  parCoursTermine: 100,
  parAttestation: 75,
  certificatFinal: 300,
  // Trois fois plus qu'une leçon : un travail collectif demande de se coordonner sur deux
  // semaines, ce qui n'a rien à voir avec valider un chapitre seul devant son écran.
  parTravailGroupe: 60,
};

// Paliers cumulatifs. Le libellé compte autant que le nombre : « Apprenant engagé » dit
// quelque chose, « Niveau 2 » ne dit rien.
const NIVEAUX = [
  { seuil: 0, titre: "Premiers pas" },
  { seuil: 200, titre: "Apprenant engagé" },
  { seuil: 500, titre: "Praticien" },
  { seuil: 900, titre: "Praticien confirmé" },
  { seuil: 1400, titre: "Expert MEAL" },
];

app.get("/api/academy/dashboard", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;

  const { data: stud } = await supabase.from("students")
    .select("full_name, email, email_verified, admitted_at, admission_expires, entry_score, final_certificate_no, final_certified_at")
    .eq("id", sid).maybeSingle();
  if (!stud) return res.status(404).json({ message: "Étudiant introuvable" });

  const [gradesQ, enrollmentsQ, progressQ, attestationsQ, meetingsQ, coursesQ] = await Promise.all([
    supabase.from("grades").select("lesson_id, course_id, score, max_score, type, graded_at").eq("student_id", sid),
    supabase.from("enrollments").select("course_id, progress, status").eq("student_id", sid),
    supabase.from("lesson_progress")
      .select("lesson_id, course_id, week_index, unlock_at, due_at, status, sms_lessons(title, order_index), sms_courses(code)")
      .eq("student_id", sid),
    supabase.from("attestations").select("cert_type, status, issued_at").eq("student_id", sid),
    supabase.from("academy_meetings").select("id, title, starts_at, duration_min, status").neq("status", "cancelled"),
    supabase.from("sms_courses").select("id, code, title").eq("is_published", true).order("order_index"),
  ]);

  // Travaux de groupe : le calendrier est (re)généré et les états rafraîchis ici aussi, et
  // pas seulement sur leur page. Un étudiant qui ne consulte que son tableau de bord doit
  // voir arriver son GW dans son calendrier — et recevoir l'email d'ouverture avec la
  // composition de son groupe. Tout est enveloppé : si academy_group_work.sql n'a pas été
  // exécuté, le tableau de bord continue de fonctionner sans les travaux de groupe.
  let gwEnonces: any[] = [], gwLignes: any[] = [], gwGroupe: any = null;
  try {
    if (stud.admitted_at) {
      // La lecture des énoncés vient en premier : tant que les tables n'existent pas, elle
      // revient vide et le tableau de bord ne paie qu'une requête au lieu de la chaîne entière.
      gwEnonces = await getGroupWorks();
      if (gwEnonces.length) {
        await generateGroupWorkSchedule(sid, new Date(stud.admitted_at));
        const etat = await refreshGroupWorkStates(sid);
        gwLignes = etat.lignes;
        // Les équipes changent à chaque travail : on montre celle du travail en cours,
        // c'est-à-dire du premier qui n'est pas terminé.
        const courant = etat.lignes.find((l: any) => l.status !== "completed") ?? etat.lignes[0];
        gwGroupe = courant ? etat.groupes[courant.group_work_id] ?? null : null;
      }
    }
  } catch { /* fonctionnalité non installée */ }

  const grades = gradesQ.data || [];
  const enrollments = enrollmentsQ.data || [];
  const progress = progressQ.data || [];
  const attestations = (attestationsQ.data || []).filter((a: any) => a.status === "issued");
  const courses = coursesQ.data || [];

  const notesLecon = grades.filter(g => g.type === "lesson");
  const coursTermines = enrollments.filter(e => e.status === "completed").length;

  // ── Réalisations : des prédicats sur des faits, jamais un compteur stocké ──
  // Jours d'activité distincts, pour repérer une série de trois jours consécutifs.
  const joursActifs = [...new Set(notesLecon
    .map(g => g.graded_at && new Date(g.graded_at).toISOString().slice(0, 10))
    .filter(Boolean) as string[])].sort();
  let plusLongueSerie = joursActifs.length ? 1 : 0;
  let serieCourante = plusLongueSerie;
  for (let i = 1; i < joursActifs.length; i++) {
    const veille = new Date(joursActifs[i - 1]).getTime() + 86400000;
    serieCourante = new Date(joursActifs[i]).getTime() === veille ? serieCourante + 1 : 1;
    plusLongueSerie = Math.max(plusLongueSerie, serieCourante);
  }

  const sansFaute = notesLecon.some(g => Number(g.max_score) > 0 && Number(g.score) === Number(g.max_score));
  const miParcours = enrollments.some(e => Number(e.progress) >= 50);
  const cursusMeal = courses.filter(c => c.code.startsWith(MEAL_PROGRAM_PREFIX));
  const idsMeal = new Set(cursusMeal.map(c => c.id));
  const mealTermines = enrollments.filter(e => e.status === "completed" && idsMeal.has(e.course_id)).length;

  // Un travail de groupe « fait » est un travail CORRIGÉ ; « rendu » couvre aussi le dépôt
  // en attente de correction — les deux ne récompensent pas la même chose.
  const gwFaits = gwLignes.filter((l: any) => l.status === "completed").length;
  const gwRendus = gwLignes.filter((l: any) => l.status === "completed" || l.status === "submitted").length;

  const definitions = [
    { cle: "premier_pas", titre: "Premier pas", detail: "Valider sa première leçon", xp: 10, obtenue: notesLecon.length >= 1,
      quand: notesLecon.length ? notesLecon.map(g => g.graded_at).sort()[0] : null },
    { cle: "admis", titre: "Admis", detail: "Réussir le test d'admission", xp: 15, obtenue: !!stud.admitted_at, quand: stud.admitted_at },
    { cle: "perseverant", titre: "Persévérant", detail: "Trois jours d'activité consécutifs", xp: 20, obtenue: plusLongueSerie >= 3, quand: null },
    { cle: "sans_faute", titre: "Sans faute", detail: "Obtenir la note maximale à une leçon", xp: 25, obtenue: sansFaute, quand: null },
    { cle: "mi_parcours", titre: "Mi-parcours", detail: "Atteindre la moitié d'un cours", xp: 30, obtenue: miParcours, quand: null },
    { cle: "cursus_complet", titre: "Cursus complet", detail: `Terminer les ${cursusMeal.length} cours du cursus MEAL`, xp: 100,
      obtenue: cursusMeal.length > 0 && mealTermines === cursusMeal.length, quand: stud.final_certified_at },
    { cle: "esprit_equipe", titre: "Esprit d'équipe", detail: "Rendre son premier travail de groupe", xp: 35,
      obtenue: gwRendus >= 1, quand: null },
    { cle: "collectif_accompli", titre: "Collectif accompli", detail: `Faire corriger les ${gwLignes.length || GROUP_WORKS.length} travaux de groupe`, xp: 80,
      obtenue: gwLignes.length > 0 && gwFaits === gwLignes.length, quand: null },
  ];
  const realisations = definitions.map(({ quand, ...r }) => ({ ...r, obtenueLe: r.obtenue ? quand : null }));

  // ── Points et niveau ──
  const detailXp = [
    { source: "Admission réussie", points: stud.admitted_at ? XP.admission : 0 },
    { source: `${notesLecon.length} leçon${notesLecon.length > 1 ? "s" : ""} validée${notesLecon.length > 1 ? "s" : ""}`, points: notesLecon.length * XP.parLecon },
    { source: `${coursTermines} cours terminé${coursTermines > 1 ? "s" : ""}`, points: coursTermines * XP.parCoursTermine },
    { source: `${attestations.length} attestation${attestations.length > 1 ? "s" : ""}`, points: attestations.length * XP.parAttestation },
    { source: `${gwFaits} travail${gwFaits > 1 ? "x" : ""} de groupe corrigé${gwFaits > 1 ? "s" : ""}`, points: gwFaits * XP.parTravailGroupe },
    { source: "Certificat final", points: stud.final_certificate_no ? XP.certificatFinal : 0 },
    { source: "Réalisations", points: realisations.filter(r => r.obtenue).reduce((n, r) => n + r.xp, 0) },
  ].filter(d => d.points > 0);
  const totalXp = detailXp.reduce((n, d) => n + d.points, 0);

  const indexNiveau = Math.max(0, NIVEAUX.filter(n => totalXp >= n.seuil).length - 1);
  const niveauSuivant = NIVEAUX[indexNiveau + 1] ?? null;

  // ── Ressources des leçons déjà ouvertes ──
  // Une ressource d'une leçon encore verrouillée dévoilerait le contenu à venir ; on ne
  // remonte donc que celles des leçons accessibles.
  const lecons0uvertes = new Set(progress.filter(p => p.status !== "locked").map(p => p.lesson_id));
  let ressources: any[] = [];
  if (lecons0uvertes.size) {
    const { data: contenus } = await supabase.from("sms_lessons")
      .select("id, title, content, sms_courses(code)")
      .in("id", [...lecons0uvertes]);
    const vues = new Set<string>();
    for (const l of contenus || []) {
      let c: any = (l as any).content;
      if (typeof c === "string") { try { c = JSON.parse(c); } catch { c = null; } }
      for (const cell of c?.cells || []) {
        if (cell?.type !== "resource" || !cell.url || vues.has(cell.url)) continue;
        vues.add(cell.url);
        ressources.push({
          titre: cell.title || cell.url,
          description: cell.desc || null,
          url: cell.url,
          fournisseur: cell.provider || null,
          cours: (l as any).sms_courses?.code ?? null,
          lecon: (l as any).title ?? null,
        });
      }
    }
  }

  // ── Calendrier : échéances de leçons et rencontres à venir ──
  const evenements = [
    ...progress
      .filter(p => p.status !== "completed" && p.due_at)
      .map(p => ({
        date: p.due_at,
        type: "echeance",
        titre: (p as any).sms_lessons?.title || "Leçon",
        detail: `${(p as any).sms_courses?.code ?? ""} · à rendre`,
        statut: p.status,
        lessonId: p.lesson_id,
        courseId: p.course_id,
      })),
    ...gwLignes
      .filter((l: any) => l.status !== "completed" && l.due_at)
      .map((l: any) => {
        const gw = gwEnonces.find((g: any) => g.id === l.group_work_id);
        return {
          date: l.due_at,
          type: "travail_groupe",
          titre: gw?.title || "Travail de groupe",
          detail: `${gwGroupe?.name ? `${gwGroupe.name} · ` : ""}semaine ${l.week_index} · à rendre`,
          statut: l.status,
          groupWorkId: l.group_work_id,
        };
      }),
    ...(meetingsQ.data || []).map((m: any) => ({
      date: m.starts_at,
      type: "rencontre",
      titre: m.title,
      detail: `${m.duration_min ?? 60} min en ligne`,
      statut: m.status,
      meetingId: m.id,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const notesToutes = grades.filter(g => Number(g.max_score) > 0);
  const moyenne = notesToutes.length
    ? Math.round(notesToutes.reduce((n, g) => n + (Number(g.score) / Number(g.max_score)) * 100, 0) / notesToutes.length)
    : null;

  res.json({
    etudiant: {
      nom: (stud.full_name || "").trim() || stud.email,
      email: stud.email,
      emailVerifie: stud.email_verified !== false,
      admis: !!stud.admitted_at,
      admissionExpire: stud.admission_expires,
    },
    indicateurs: {
      moyenne,
      coursTermines,
      coursTotal: courses.length,
      credentials: attestations.length + (stud.final_certificate_no ? 1 : 0),
      leconsValidees: notesLecon.length,
      evaluations: notesToutes.length,
      travauxGroupe: { faits: gwFaits, rendus: gwRendus, total: gwLignes.length },
    },
    groupe: gwGroupe ? { id: gwGroupe.id, nom: gwGroupe.name, cohorte: gwGroupe.cohort } : null,
    xp: {
      total: totalXp,
      niveau: indexNiveau + 1,
      titre: NIVEAUX[indexNiveau].titre,
      seuilActuel: NIVEAUX[indexNiveau].seuil,
      seuilSuivant: niveauSuivant?.seuil ?? null,
      titreSuivant: niveauSuivant?.titre ?? null,
      restantPourNiveauSuivant: niveauSuivant ? niveauSuivant.seuil - totalXp : null,
      detail: detailXp,
    },
    realisations,
    ressources: ressources.slice(0, 12),
    calendrier: evenements,
  });
});

// ── Planning hebdomadaire des leçons (modèle WQU) ──
app.get("/api/academy/lesson-schedule", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data: stud } = await supabase.from("students").select("admitted_at").eq("id", sid).maybeSingle();
  await regenererPlannings(sid);
  await refreshLessonStates(sid);
  const { data, error } = await supabase.from("lesson_progress")
    .select("*, sms_lessons(title, order_index), sms_courses(code, title, order_index)")
    .eq("student_id", sid).order("week_index");
  if (error) return res.status(500).json({ message: error.message });
  // Tri complet : semaine, puis cours, puis rang de la leçon. Trier sur la seule semaine
  // laissait les leçons d'une même semaine sortir dans l'ordre d'insertion — la leçon 2 de
  // MEAL-01 s'affichait avant la leçon 1, et les deux parcours s'entremêlaient au hasard.
  const ordered = (data || []).slice().sort((a: any, b: any) =>
    (a.week_index - b.week_index)
    || ((a.sms_courses?.order_index ?? 0) - (b.sms_courses?.order_index ?? 0))
    || ((a.sms_lessons?.order_index ?? 0) - (b.sms_lessons?.order_index ?? 0)));
  res.json(await filtrerAuxParcoursAdmis(sid, ordered, (l: any) => l.sms_courses?.code));
});

// ── Travaux de groupe : mon groupe, mes trois GW et leur état ──
//
// Un seul appel donne tout ce que l'écran affiche : la composition du groupe, les énoncés,
// les fenêtres de rendu et le dernier dépôt. Le planning est (re)généré au passage, comme
// pour les leçons, afin qu'un étudiant admis avant l'installation de la fonctionnalité
// obtienne son calendrier au premier affichage.
app.get("/api/academy/group-work", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data: stud } = await supabase.from("students")
    .select("admitted_at, admission_expires").eq("id", sid).maybeSingle();

  const gws = await getGroupWorks();
  if (!gws.length) return res.json({ actif: false, groupe: null, travaux: [] });
  if (!stud?.admitted_at) {
    return res.json({ actif: true, admis: false, groupe: null, travaux: [] });
  }

  await generateGroupWorkSchedule(sid, new Date(stud.admitted_at));
  const { lignes, groupes, rendus } = await refreshGroupWorkStates(sid);

  // Un groupe — donc une liste de coéquipiers — par travail.
  const membresPar: Record<number, any[]> = {};
  for (const [gwId, g] of Object.entries(groupes)) {
    membresPar[Number(gwId)] = await membersOfGroup((g as any).id);
  }

  const travaux = gws
    .filter(g => g.is_published !== false)
    .map(gw => {
      const l = lignes.find((x: any) => x.group_work_id === gw.id);
      const rendu = rendus.find((r: any) => r.group_work_id === gw.id);
      const g = groupes[gw.id] ?? null;
      const membres = membresPar[gw.id] ?? [];
      return {
        groupe: g ? { id: g.id, nom: g.name, cohorte: g.cohort, membres } : null,
        // Date à laquelle l'équipe de CE travail sera tirée au sort, quand elle ne l'est pas
        // encore : sans elle, l'étudiant ne sait pas s'il doit s'inquiéter ou patienter.
        groupeLe: l?.unlock_at
          ? new Date(new Date(l.unlock_at).getTime() - GROUP_FORMATION_LEAD_WEEKS * 7 * 24 * 3600 * 1000).toISOString()
          : null,
        id: gw.id,
        index: gw.gw_index,
        titre: gw.title,
        enonce: gw.brief,
        livrables: Array.isArray(gw.deliverables) ? gw.deliverables : [],
        maxScore: gw.max_score ?? 100,
        semaine: gw.week_index,
        enonceUrl: gw.brief_url ?? null,
        modeleUrl: gw.template_url ?? null,
        grille: Array.isArray(gw.rubric) ? gw.rubric : [],
        ouvertureLe: l?.unlock_at ?? null,
        echeanceLe: l?.due_at ?? null,
        statut: l?.status ?? "locked",
        note: rendu?.status === "graded" ? rendu.score : null,
        feedback: rendu?.status === "graded" ? rendu.feedback ?? null : null,
        rendu: rendu ? {
          le: rendu.submitted_at,
          parMoi: rendu.submitted_by === sid,
          par: membres.find((m: any) => m.studentId === rendu.submitted_by)?.nom ?? null,
          contenu: rendu.content ?? null,
          rapport: rendu.report_url ? { url: rendu.report_url, nom: rendu.report_name } : null,
          archive: rendu.archive_url ? { url: rendu.archive_url, nom: rendu.archive_name } : null,
        } : null,
        notesParCritere: rendu?.status === "graded" ? rendu.rubric_scores ?? null : null,
      };
    })
    .sort((a, b) => a.index - b.index);

  res.json({
    actif: true,
    admis: true,
    admissionExpire: stud.admission_expires,
    consignes: SUBMISSION_INSTRUCTIONS,
    travaux,
  });
});

// ── Déposer (ou remplacer) le rendu collectif ──
//
// N'importe quel membre dépose POUR TOUT LE GROUPE : c'est un travail commun, exiger le
// dépôt de chacun reviendrait à en faire trois travaux individuels. Le dernier dépôt
// remplace le précédent tant que la correction n'a pas eu lieu — une équipe peut donc
// corriger un lien cassé sans repartir de zéro.
app.post("/api/academy/group-work/:id/submit", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const gwId = Number(req.params.id);
  const { resume, liens, contributions, rapport, archive } = req.body || {};

  if (!resume || String(resume).trim().length < 30)
    return res.status(400).json({ message: "Décrivez votre production en quelques lignes (30 caractères minimum)." });
  // Le rapport PDF est le rendu ; le reste l'accompagne. Sans lui, il n'y a rien à corriger.
  if (!rapport?.url || !/^https?:\/\/\S+$/i.test(String(rapport.url)))
    return res.status(400).json({ message: "Joignez le rapport du groupe au format PDF." });

  const { data: stud } = await supabase.from("students")
    .select("admitted_at, admission_expires, full_name").eq("id", sid).maybeSingle();
  if (!stud?.admitted_at)
    return res.status(403).json({ message: "Vous devez réussir le test d'admission pour accéder aux travaux de groupe." });
  if (stud.admission_expires && new Date(stud.admission_expires) < new Date())
    return res.status(403).json({ message: "Votre période d'admission (3 mois) a expiré." });

  await generateGroupWorkSchedule(sid, new Date(stud.admitted_at));
  const { lignes, groupes, rendus } = await refreshGroupWorkStates(sid);
  const groupe = groupes[gwId];
  if (!groupe) return res.status(409).json({ message: "L'équipe de ce travail n'est pas encore constituée. Elle est tirée au sort une semaine avant l'ouverture du dépôt." });

  // Fail-closed : pas de ligne de planning = verrouillé.
  const ligne = lignes.find((l: any) => l.group_work_id === gwId);
  if (!ligne || ligne.status === "locked")
    return res.status(403).json({ message: "Ce travail de groupe n'est pas encore ouvert.", unlockAt: ligne?.unlock_at, locked: true });

  const dejaCorrige = rendus.find((r: any) => r.group_work_id === gwId && r.status === "graded");
  if (dejaCorrige) return res.status(409).json({ message: "Ce travail a déjà été corrigé — le rendu ne peut plus être modifié." });

  // Les liens sont la matière du rendu (formulaire Kobo, carte, tableau de bord) : on
  // n'accepte que http(s), et on borne le nombre pour éviter qu'un dépôt serve de dépotoir.
  const liensPropres = (Array.isArray(liens) ? liens : [])
    .map((l: any) => ({ label: String(l?.label ?? "").slice(0, 120).trim(), url: String(l?.url ?? "").trim() }))
    .filter(l => /^https?:\/\/\S+$/i.test(l.url))
    .slice(0, 10);

  const contenu = {
    summary: String(resume).slice(0, 5000).trim(),
    links: liensPropres,
    contributions: String(contributions ?? "").slice(0, 3000).trim() || null,
  };

  const { data: rendu, error } = await supabase.from("academy_group_submissions")
    .upsert({
      group_work_id: gwId, group_id: groupe.id, submitted_by: sid,
      content: contenu, status: "submitted", submitted_at: new Date().toISOString(),
      report_url: String(rapport.url), report_name: rapport.nom ? String(rapport.nom).slice(0, 200) : "rapport.pdf",
      archive_url: archive?.url && /^https?:\/\/\S+$/i.test(String(archive.url)) ? String(archive.url) : null,
      archive_name: archive?.nom ? String(archive.nom).slice(0, 200) : null,
      score: null, feedback: null, graded_at: null, rubric_scores: null,
    }, { onConflict: "group_work_id,group_id" })
    .select("id, submitted_at").maybeSingle();
  if (error) return res.status(500).json({ message: error.message });

  // Tous les membres passent à « rendu » : l'état d'un travail collectif est le même pour
  // tout le monde, un coéquipier ne doit pas voir « à rendre » après le dépôt.
  const membres = await membersOfGroup(groupe.id);
  await supabase.from("group_work_progress")
    .update({ status: "submitted" })
    .in("student_id", membres.map(m => m.studentId)).eq("group_work_id", gwId)
    .then(() => {}, () => {});

  res.json({ message: "Rendu enregistré pour tout le groupe.", renduId: rendu?.id, le: rendu?.submitted_at });
});

// ══════════════ Forum du groupe ══════════════
//
// Un fil par groupe, pas par travail : les trois GW s'enchaînent avec la même équipe, et
// séparer les fils aurait dispersé une conversation qui, elle, est continue. Les documents
// de chaque GW y sont épinglés en tête (kind = 'ressource').

/** Le groupe de l'étudiant, ou 403. Toute route du forum passe par là. */
async function groupeDeLEtudiantOu403(sid: number, gwId: number, res: Response): Promise<any | null> {
  const groupe = await groupOfStudent(sid, gwId);
  if (!groupe) {
    res.status(403).json({ message: "L'équipe de ce travail n'est pas encore constituée." });
    return null;
  }
  return groupe;
}

app.get("/api/academy/group-forum/:gwId", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const gwId = Number(req.params.gwId);
  const groupe = await groupeDeLEtudiantOu403(sid, gwId, res);
  if (!groupe) return;

  const { data, error } = await supabase.from("academy_group_posts")
    .select("id, group_work_id, student_id, author_name, kind, body, attachment_url, attachment_name, created_at")
    .eq("group_id", groupe.id).order("created_at");
  if (error) return res.status(500).json({ message: error.message });

  // Les ressources remontent en tête quel que soit leur âge : elles se consultent, elles ne
  // se lisent pas dans l'ordre chronologique comme les messages.
  const posts = (data || []).map((p: any) => ({
    id: p.id, groupWorkId: p.group_work_id, kind: p.kind || "message",
    auteur: p.author_name || "Étudiant", parMoi: p.student_id === sid,
    corps: p.body, fichier: p.attachment_url, fichierNom: p.attachment_name, le: p.created_at,
  }));
  res.json({
    groupe: { id: groupe.id, nom: groupe.name, cohorte: groupe.cohort },
    ressources: posts.filter(p => p.kind === "ressource"),
    messages: posts.filter(p => p.kind !== "ressource"),
  });
});

app.post("/api/academy/group-forum/:gwId", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const gwId = Number(req.params.gwId);
  const corps = String(req.body?.corps ?? "").trim();
  if (corps.length < 2) return res.status(400).json({ message: "Votre message est vide." });

  const groupe = await groupeDeLEtudiantOu403(sid, gwId, res);
  if (!groupe) return;

  const { data: stud } = await supabase.from("students").select("full_name, email").eq("id", sid).maybeSingle();
  const { data, error } = await supabase.from("academy_group_posts").insert({
    group_id: groupe.id, group_work_id: gwId, student_id: sid,
    author_name: (stud?.full_name || "").trim() || stud?.email || "Étudiant",
    kind: "message", body: corps.slice(0, 4000),
    attachment_url: typeof req.body?.fichier === "string" && /^https?:\/\/\S+$/i.test(req.body.fichier) ? req.body.fichier : null,
    attachment_name: req.body?.fichierNom ? String(req.body.fichierNom).slice(0, 200) : null,
  }).select("id, created_at").maybeSingle();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json({ id: data?.id, le: data?.created_at });

  // Après la réponse : l'auteur ne doit pas attendre l'envoi de trois emails pour voir son
  // message s'afficher, et une messagerie en panne ne doit pas faire échouer une écriture
  // déjà enregistrée.
  const membres = await membersOfGroup(groupe.id);
  notifierForum({
    portee: `groupe:${groupe.id}`,
    titre: `le forum de votre groupe (${groupe.name})`,
    lien: "/academy/group-work",
    auteurId: sid,
    auteurNom: (stud?.full_name || "").trim() || "Un membre de votre groupe",
    corps: corps.slice(0, 400),
    postId: data?.id,
    destinataires: membres.map((m: any) => m.studentId),
  }).catch(() => {});
});

// ── Dépôt de fichiers de l'étudiant ──
//
// Le rendu d'un GW, c'est un rapport PDF et une archive ZIP des fichiers de travail
// (tableurs, cartes, code) — la règle du modèle WQU, reprise telle quelle. L'upload est
// séparé de la soumission : un groupe téléverse, relit, puis soumet.
const ALLOWED_GROUP_FILES = [".pdf", ".zip", ".docx", ".xlsx", ".csv"];
const GROUP_FILE_MIME: Record<string, string> = {
  ".pdf": "application/pdf", ".zip": "application/zip",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
};

app.post("/api/academy/group-work/:gwId/upload", requireStudent, upload.single("file"), async (req: any, res) => {
  const sid = req.student.sid;
  if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu." });
  const groupe = await groupOfStudent(sid, Number(req.params.gwId));
  if (!groupe) return res.status(403).json({ message: "L'équipe de ce travail n'est pas encore constituée." });

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_GROUP_FILES.includes(ext))
    return res.status(400).json({ message: `Format refusé. Acceptés : ${ALLOWED_GROUP_FILES.join(", ")}` });

  // Le nom en base porte le groupe : un fichier égaré reste rattachable à son équipe.
  const filename = `gw/groupe-${groupe.id}/${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from("documents")
    .upload(filename, req.file.buffer, { contentType: GROUP_FILE_MIME[ext] || req.file.mimetype, upsert: false });
  if (error) return res.status(500).json({ message: error.message });
  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filename);
  res.json({ url: urlData.publicUrl, nom: req.file.originalname });
});

// ══════════════ Évaluation par les pairs ══════════════
//
// Chaque membre note les AUTRES membres de son groupe sur quatre critères à 3 points. Ces
// notes ne modifient pas celle du projet : elles documentent la contribution de chacun,
// ce qui est la seule façon de trancher quand un rendu collectif est contesté.

app.get("/api/academy/group-work/:id/peer-review", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const gwId = Number(req.params.id);
  const groupe = await groupeDeLEtudiantOu403(sid, gwId, res);
  if (!groupe) return;

  const membres = await membersOfGroup(groupe.id);
  const { data: avis } = await supabase.from("academy_group_peer_reviews")
    .select("reviewer_id, reviewee_id, scores, total, comment")
    .eq("group_work_id", gwId).eq("group_id", groupe.id);

  res.json({
    criteres: PEER_REVIEW_CRITERIA,
    maxParCritere: PEER_REVIEW_MAX_PER_CRITERION,
    // À évaluer : tout le monde sauf soi-même.
    aEvaluer: membres.filter(m => m.studentId !== sid).map(m => ({
      ...m,
      dejaFait: (avis || []).some((a: any) => a.reviewer_id === sid && a.reviewee_id === m.studentId),
      notes: (avis || []).find((a: any) => a.reviewer_id === sid && a.reviewee_id === m.studentId)?.scores ?? null,
    })),
    // Reçues : ce que les autres ont mis sur moi. Anonyme — publier qui a mis quoi
    // transformerait l'exercice en règlement de comptes.
    recues: (avis || []).filter((a: any) => a.reviewee_id === sid)
      .map((a: any) => ({ scores: a.scores, total: a.total })),
  });
});

app.post("/api/academy/group-work/:id/peer-review", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const gwId = Number(req.params.id);
  const revieweeId = Number(req.body?.membre);
  if (!revieweeId || revieweeId === sid)
    return res.status(400).json({ message: "Choisissez un coéquipier à évaluer." });

  const groupe = await groupeDeLEtudiantOu403(sid, gwId, res);
  if (!groupe) return;
  const membres = await membersOfGroup(groupe.id);
  if (!membres.some(m => m.studentId === revieweeId))
    return res.status(403).json({ message: "Cette personne n'est pas dans votre groupe." });

  // On ne garde que les critères connus, bornés à [0, max] : le corps de requête vient du
  // client, il ne décide ni de la grille ni du plafond.
  const scores: Record<string, number> = {};
  let total = 0;
  for (const c of PEER_REVIEW_CRITERIA) {
    const brut = Number(req.body?.notes?.[c.cle]);
    const n = Number.isFinite(brut) ? Math.min(PEER_REVIEW_MAX_PER_CRITERION, Math.max(0, Math.round(brut))) : 0;
    scores[c.cle] = n;
    total += n;
  }

  const { error } = await supabase.from("academy_group_peer_reviews").upsert({
    group_work_id: gwId, group_id: groupe.id, reviewer_id: sid, reviewee_id: revieweeId,
    scores, total, comment: req.body?.commentaire ? String(req.body.commentaire).slice(0, 2000) : null,
    created_at: new Date().toISOString(),
  }, { onConflict: "group_work_id,reviewer_id,reviewee_id" });
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Évaluation enregistrée.", total });
});

// ══════════════════════════════════════════════════════════════════
// Forum de cohorte — le formateur et toute une promotion
//
// Le forum de groupe réunit trois personnes ; celui-ci réunit la promotion entière. Les
// deux ne se remplacent pas : une consigne qui vaut pour tout le monde n'a pas à être
// recopiée dans sept fils de groupe, et une question de groupe n'a pas à être lue par les
// dix-huit autres.
//
// La cohorte n'est stockée nulle part : elle se DÉRIVE de admitted_at, exactement comme
// pour la constitution des groupes. Une colonne de plus aurait pu diverger de la date qui
// fait foi.
// ══════════════════════════════════════════════════════════════════

/** Cohorte de l'étudiant, ou null s'il n'est pas admis. */
async function cohorteDeLEtudiant(sid: number): Promise<string | null> {
  const { data } = await supabase.from("students").select("admitted_at").eq("id", sid).maybeSingle();
  return data?.admitted_at ? cohortOf(new Date(data.admitted_at)) : null;
}

function formaterPost(p: any, sid?: number) {
  return {
    id: p.id,
    kind: p.kind || "message",
    auteur: p.author_name || "Étudiant",
    formateur: p.is_staff === true,
    parMoi: sid != null && p.student_id === sid,
    corps: p.body,
    fichier: p.attachment_url,
    fichierNom: p.attachment_name,
    le: p.created_at,
  };
}

app.get("/api/academy/cohort-forum", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const cohorte = await cohorteDeLEtudiant(sid);
  if (!cohorte) return res.json({ actif: false, cohorte: null, annonces: [], messages: [] });

  const { data, error } = await supabase.from("academy_cohort_posts")
    .select("id, student_id, author_name, is_staff, kind, body, attachment_url, attachment_name, created_at")
    .eq("cohort", cohorte).order("created_at");
  if (error) return res.json({ actif: false, cohorte, annonces: [], messages: [] });

  const posts = (data || []).map((p: any) => formaterPost(p, sid));
  const { count } = await supabase.from("students")
    .select("id", { count: "exact", head: true }).not("admitted_at", "is", null);

  res.json({
    actif: true,
    cohorte,
    effectif: count ?? null,
    annonces: posts.filter(p => p.kind === "annonce"),
    messages: posts.filter(p => p.kind !== "annonce"),
  });
});

app.post("/api/academy/cohort-forum", rateLimit(20, 10 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const corps = String(req.body?.corps ?? "").trim();
  if (corps.length < 2) return res.status(400).json({ message: "Votre message est vide." });

  const cohorte = await cohorteDeLEtudiant(sid);
  if (!cohorte) return res.status(403).json({ message: "Le forum de promotion est réservé aux étudiants admis." });

  const { data: stud } = await supabase.from("students").select("full_name, email").eq("id", sid).maybeSingle();
  const { data, error } = await supabase.from("academy_cohort_posts").insert({
    cohort: cohorte, student_id: sid,
    author_name: (stud?.full_name || "").trim() || stud?.email || "Étudiant",
    is_staff: false, kind: "message", body: corps.slice(0, 4000),
  }).select("id, created_at").maybeSingle();
  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json({ id: data?.id, le: data?.created_at });

  // Les destinataires sont les admis de la même promotion, calculée comme partout ailleurs
  // à partir de la date d'admission — il n'y a pas de colonne « cohorte » en base.
  const { data: admis } = await supabase.from("students")
    .select("id, admitted_at").not("admitted_at", "is", null);
  const memePromo = (admis || [])
    .filter((s: any) => cohortOf(new Date(s.admitted_at)) === cohorte)
    .map((s: any) => s.id);

  notifierForum({
    portee: `promo:${cohorte}`,
    titre: `le forum de votre promotion (${cohorte})`,
    lien: "/academy/group-work",
    auteurId: sid,
    auteurNom: (stud?.full_name || "").trim() || "Un étudiant de votre promotion",
    corps: corps.slice(0, 400),
    postId: data?.id,
    destinataires: memePromo,
  }).catch(() => {});
});

// ── Côté formateur : la liste des cohortes, puis le fil de l'une d'elles ──
app.get("/api/admin/academy/cohorts", requireAuth, async (_req, res) => {
  const { data: admis } = await supabase.from("students")
    .select("id, admitted_at").not("admitted_at", "is", null);

  const parCohorte = new Map<string, number>();
  for (const s of admis || []) {
    const c = cohortOf(new Date(s.admitted_at));
    parCohorte.set(c, (parCohorte.get(c) ?? 0) + 1);
  }

  const { data: posts } = await supabase.from("academy_cohort_posts").select("cohort, created_at");
  const dernier = new Map<string, string>();
  for (const p of posts || []) {
    const actuel = dernier.get(p.cohort);
    if (!actuel || p.created_at > actuel) dernier.set(p.cohort, p.created_at);
  }

  res.json([...parCohorte.entries()]
    .map(([cohorte, effectif]) => ({
      cohorte, effectif,
      messages: (posts || []).filter((p: any) => p.cohort === cohorte).length,
      dernierMessage: dernier.get(cohorte) ?? null,
    }))
    .sort((a, b) => b.cohorte.localeCompare(a.cohorte)));
});

app.get("/api/admin/academy/cohort-forum/:cohorte", requireAuth, async (req, res) => {
  const cohorte = String(req.params.cohorte);
  const { data, error } = await supabase.from("academy_cohort_posts")
    .select("id, student_id, author_name, is_staff, kind, body, attachment_url, attachment_name, created_at")
    .eq("cohort", cohorte).order("created_at");
  if (error) return res.status(500).json({ message: error.message });
  res.json((data || []).map((p: any) => formaterPost(p)));
});

app.post("/api/admin/academy/cohort-forum/:cohorte", requireAuth, async (req, res) => {
  const cohorte = String(req.params.cohorte);
  const corps = String(req.body?.corps ?? "").trim();
  if (corps.length < 2) return res.status(400).json({ message: "Message vide." });
  const annonce = req.body?.annonce === true;

  const { data, error } = await supabase.from("academy_cohort_posts").insert({
    cohort: cohorte, student_id: null,
    author_name: req.body?.auteur ? String(req.body.auteur).slice(0, 120) : "Formateur",
    is_staff: true, kind: annonce ? "annonce" : "message", body: corps.slice(0, 4000),
    attachment_url: typeof req.body?.fichier === "string" && /^https?:\/\/\S+$/i.test(req.body.fichier) ? req.body.fichier : null,
    attachment_name: req.body?.fichierNom ? String(req.body.fichierNom).slice(0, 200) : null,
  }).select("id").maybeSingle();
  if (error) return res.status(500).json({ message: error.message });

  // Une annonce du formateur est notifiée par email : le forum n'est pas consulté tous les
  // jours, et une consigne que personne ne lit ne vaut pas mieux que pas de consigne.
  let prevenus = 0;
  if (annonce) prevenus = await notifierAnnonceCohorte(cohorte, corps);
  res.status(201).json({ id: data?.id, prevenus });
});

async function notifierAnnonceCohorte(cohorte: string, corps: string): Promise<number> {
  const { data: admis } = await supabase.from("students")
    .select("id, full_name, email, course_emails, admitted_at").not("admitted_at", "is", null);
  const cibles = (admis || []).filter((s: any) =>
    cohortOf(new Date(s.admitted_at)) === cohorte && s.email && s.course_emails !== false);
  const cle = Date.now();
  let n = 0;
  for (const s of cibles) {
    const r = await sendAcademyEmail({
      studentId: s.id, to: s.email, type: "cohort_announcement",
      subject: `📣 Annonce à la promotion ${cohorte}`,
      html: cohortAnnouncementEmailHtml(s.full_name, cohorte, corps),
      dedupeKey: `cohort_announcement:${s.id}:${cle}`,
    });
    if (r.sent) n++;
  }
  return n;
}

// ══════════════════════════════════════════════════════════════════
// Retard : constat, puis remise à zéro de l'admission
//
// Un étudiant qui a plus d'un mois de retard sur le rythme conseillé ne rattrapera pas
// dans la fenêtre de trois mois qui lui reste : le laisser dans sa cohorte, c'est le
// laisser accumuler des échéances qu'il ne tiendra pas, et fausser les groupes de ses
// coéquipiers. Il repasse le test d'admission et repart dans une cohorte plus récente,
// depuis la semaine 1.
//
// Le retard se mesure sur la plus vieille échéance NON TENUE. Compter les leçons faites
// aurait puni un étudiant rapide en vacances autant qu'un étudiant décroché.
// ══════════════════════════════════════════════════════════════════

// RETARD_EXCLUSION_JOURS vit dans shared/retard.ts : le tableau de bord de l'étudiant
// et les relances annoncent le même seuil que celui qui est appliqué ici.
const JOUR_MS = 24 * 60 * 60 * 1000;

/** Constat de retard de tous les admis. Lecture seule — ne modifie rien. */
async function constatDeRetard() {
  // ── Pourquoi ces quatre `error` sont désormais lus ──
  //
  // Ils ne l'étaient pas, et le test de la tâche l'a montré crûment : avec une base
  // injoignable, `late-warnings` répondait « 0 admis, 0 alerte envoyée » et se déclarait
  // RÉUSSIE. C'est exactement la panne que la table cron_runs a été créée pour rendre
  // visible — « rien à faire » et « je n'ai rien pu lire » produisant la même trace — et
  // elle passait encore par cette porte-là.
  //
  // Une lecture en échec est une panne, pas un constat vide. On la fait remonter :
  // l'enveloppe de la tâche l'enregistre en `ok = false` et vous envoie l'alerte, et la
  // journée reste reprenable par le second ordonnanceur.
  const lire = <T>(r: { data: T | null; error: { message: string } | null }, quoi: string): T | null => {
    if (r.error) throw new Error(`lecture ${quoi} : ${r.error.message}`);
    return r.data;
  };

  const admis = lire(await supabase.from("students")
    .select("id, full_name, email, admitted_at, admission_expires, course_emails")
    .not("admitted_at", "is", null), "des étudiants admis");
  if (!admis?.length) return [];

  const lp = lire(await supabase.from("lesson_progress")
    .select("student_id, course_id, status, due_at"), "des plannings de leçons");

  // Ne compter que les leçons des parcours auxquels l'étudiant est admis.
  //
  // Les plannings d'avant la séparation par parcours ont été générés pour tous les cours
  // publiés : dix-sept étudiants admis au seul cursus MEAL portent encore douze lignes
  // TOF-FIN-01 chacun, échéances comprises. Leur écran ne les montre plus
  // (filtrerAuxParcoursAdmis), mais ce constat-ci lisait la table brute — il les aurait
  // donc déclarés en retard sur un parcours qu'ils n'ont jamais rejoint, puis rendus
  // exclusibles pour cela. Trois leçons par semaine leur étaient comptées au lieu de deux.
  //
  // Le filtre est posé ici plutôt que par un nettoyage de la base, pour la même raison
  // qu'à la lecture du planning : il corrige les dix-sept d'un coup sans rien détruire, et
  // il tient encore le jour où une ligne réapparaît.
  const cours = lire(await supabase.from("sms_courses").select("id, code"), "du catalogue de cours");
  const parcoursDuCours = new Map<number, string | null>(
    (cours || []).map((c: any) => [c.id, programOf(c.code)?.id ?? null]));

  // Une seule lecture des admissions par parcours, plutôt qu'un parcoursAdmis() par
  // étudiant : cette fonction tourne sur toute la promotion, à chaque passage de la tâche.
  const admissionsParcours = lire(await supabase.from("academy_program_admissions")
    .select("student_id, program_id").not("admitted_at", "is", null), "des admissions par parcours");
  const parcoursDe = new Map<number, Set<string>>();
  for (const s of admis as any[]) parcoursDe.set(s.id, new Set(["meal"]));
  for (const r of admissionsParcours || []) parcoursDe.get(r.student_id)?.add(r.program_id);

  const now = Date.now();
  return (admis as any[]).map(s => {
    const siens = parcoursDe.get(s.id) ?? new Set<string>();
    const siennes = (lp || []).filter((l: any) => {
      if (l.student_id !== s.id) return false;
      const prog = parcoursDuCours.get(l.course_id);
      // Cours sans parcours identifiable : on ne retire rien, comme à la lecture du planning.
      return prog == null || siens.has(prog);
    });
    const enRetard = siennes.filter((l: any) => l.status !== "completed" && new Date(l.due_at).getTime() < now);
    const jours = enRetard.length
      ? Math.floor(Math.max(...enRetard.map((l: any) => now - new Date(l.due_at).getTime())) / JOUR_MS)
      : 0;
    return {
      id: s.id,
      nom: (s.full_name || "").trim() || s.email,
      email: s.email,
      admisLe: s.admitted_at,
      cohorte: cohortOf(new Date(s.admitted_at)),
      leconsFaites: siennes.filter((l: any) => l.status === "completed").length,
      leconsTotal: siennes.length,
      // Les deux chiffres que l'alerte cite : l'ancienneté de la plus vieille échéance
      // non tenue, et combien de leçons sont dans ce cas.
      leconsEnRetard: enRetard.length,
      finAdmission: s.admission_expires ?? null,
      emailsCours: s.course_emails !== false,
      joursDeRetard: jours,
      aExclure: jours > RETARD_EXCLUSION_JOURS,
    };
  }).sort((a, b) => b.joursDeRetard - a.joursDeRetard);
}

app.get("/api/admin/academy/late-students", requireAuth, async (_req, res) => {
  const constat = await constatDeRetard();
  res.json({ seuilJours: RETARD_EXCLUSION_JOURS, etudiants: constat });
});

/**
 * Remet à zéro l'admission des étudiants trop en retard.
 *
 * Ce qui est effacé : l'admission, le planning des leçons, le calendrier des travaux de
 * groupe et l'appartenance au groupe — sans quoi l'étudiant occuperait une place dans une
 * équipe qu'il ne rejoindra pas. Ce qui est CONSERVÉ : ses notes et ses attestations. Il a
 * fait ce travail, on ne le lui retire pas parce qu'il a décroché ensuite.
 *
 * Le test est immédiatement repassable (next_test_allowed levé) : le but est qu'il
 * reparte, pas qu'il attende une semaine de plus.
 */
app.post("/api/admin/academy/late-students/reset", requireAuth, async (req, res) => {
  const constat = await constatDeRetard();
  const demandes: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];

  // Sans liste explicite, on ne traite que ceux qui dépassent le seuil. Une liste explicite
  // est vérifiée contre le même seuil : l'interface ne doit pas pouvoir exclure quelqu'un
  // qui n'est pas en retard.
  const cibles = constat.filter(c => c.aExclure && (!demandes.length || demandes.includes(c.id)));
  if (!cibles.length) return res.json({ message: "Aucun étudiant ne dépasse le seuil de retard.", traites: 0 });

  const now = new Date().toISOString();
  for (const c of cibles) {
    await supabase.from("academy_admission_resets").insert({
      student_id: c.id, previous_admitted_at: c.admisLe, previous_cohort: c.cohorte,
      days_late: c.joursDeRetard, lessons_done: c.leconsFaites, lessons_total: c.leconsTotal,
      reason: "retard", reset_at: now,
    }).then(() => {}, () => {});

    await supabase.from("students").update({
      admitted_at: null, admission_expires: null, status: "pending_test",
      next_test_allowed: null, last_test_at: null,
    }).eq("id", c.id);

    await supabase.from("lesson_progress").delete().eq("student_id", c.id).then(() => {}, () => {});
    await supabase.from("group_work_progress").delete().eq("student_id", c.id).then(() => {}, () => {});
    // De toutes ses équipes, celle de chacun des trois travaux : il ne fait plus partie
    // de la promotion, et laisser sa place occupée priverait ses coéquipiers d'un membre.
    await supabase.from("academy_group_members").delete().eq("student_id", c.id).then(() => {}, () => {});
    await supabase.from("attestations").delete().eq("student_id", c.id).eq("cert_type", "admission").then(() => {}, () => {});

    const { data: st } = await supabase.from("students")
      .select("full_name, email, course_emails").eq("id", c.id).maybeSingle();
    if (st?.email && st.course_emails !== false) {
      sendAcademyEmail({
        studentId: c.id, to: st.email, type: "admission_reset",
        subject: "Votre parcours est remis à zéro — repassez le test quand vous voulez",
        html: admissionResetEmailHtml(st.full_name, c.joursDeRetard, c.leconsFaites, c.leconsTotal),
        dedupeKey: `admission_reset:${c.id}:${now}`,
      });
    }
  }
  res.json({
    message: `${cibles.length} étudiant${cibles.length > 1 ? "s" : ""} remis à zéro. Chacun peut repasser le test immédiatement.`,
    traites: cibles.length,
    ids: cibles.map(c => c.id),
  });
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
    // Une note sans cours n'est pas forcément le test d'admission : les travaux de groupe
    // n'appartiennent à aucun cours non plus, et se retrouvaient rangés sous « Test
    // d'admission », faussant la moyenne affichée pour cette ligne.
    const horsCours = (g as any).type === "group_work"
      ? { code: "GROUP-WORK", title: "Travaux de groupe" }
      : { code: "ADMISSION", title: "Test d'admission" };
    const code = (g as any).sms_courses?.code || horsCours.code;
    if (!byCourse[code]) byCourse[code] = { sum: 0, n: 0, code, title: (g as any).sms_courses?.title || horsCours.title };
    byCourse[code].sum += Number(g.score) / Number(g.max_score) * 100;
    byCourse[code].n++;
  }
  const courseAverages = Object.values(byCourse).map(v => ({ code: v.code, title: v.title, average: Math.round(v.sum / v.n) }));
  const overall = arr.length ? Math.round(arr.reduce((a, g) => a + Number(g.score) / Number(g.max_score) * 100, 0) / arr.length) : 0;
  res.json({ student: stud, grades: arr, courseAverages, overall, totalGrades: arr.length });
});

// ── Demander une attestation ──
// ══════════════════════════════════════════════════════════════
// Paiement de l'attestation
//
// ── Le modèle, et ce qu'il change ──
//
// La formation reste gratuite. Ce qui se paie, c'est le document vérifiable délivré à la
// fin. Conséquence à regarder en face : la recette n'est plus proportionnelle aux
// inscriptions mais aux ACHÈVEMENTS — 38 inscrits pour 4 cours terminés au moment
// d'écrire ceci. Tout ce qui fait terminer un étudiant devient une ligne de chiffre
// d'affaires, à commencer par les relances quotidiennes.
//
// ── Le principe qui gouverne tout le reste ──
//
// Le déverrouillage ne vient JAMAIS du navigateur. Un client qui peut dire « j'ai payé »
// le dira. Seul un webhook signé par l'opérateur fait foi, et sa signature est vérifiée
// sur le corps brut. C'est la même règle que partout ailleurs ici : les clés de
// correction vivent sous api/, les corrigés ne partent qu'à la réussite. Le paiement
// n'est pas l'endroit où l'on baisse la garde.
// ══════════════════════════════════════════════════════════════

type VerdictPaiement = { du: boolean; prix: number; motif: string };

/**
 * L'attestation de ce parcours est-elle due par cet étudiant ?
 *
 * Trois raisons de ne rien devoir, dans cet ordre :
 *
 *   1. le parcours est gratuit (`prixAttestation: 0`) ;
 *   2. l'étudiant relève de l'ANTÉRIORITÉ — il s'est inscrit sous la promesse publiée
 *      « c'est gratuit, et ça le restera », et cette promesse est tenue. La liste est en
 *      base (academy_gratuite_historique) et non déduite d'une date en dur : une date se
 *      déplace au gré d'un déploiement, une liste posée une fois ne bouge plus ;
 *   3. il a déjà payé.
 */
async function attestationEstDue(sid: number, programId: string | null): Promise<VerdictPaiement> {
  const parcours = programId ? PROGRAMS.find(p => p.id === programId) : null;
  const prix = parcours?.prixAttestation ?? 0;
  if (!parcours || prix <= 0) return { du: false, prix: 0, motif: "attestation gratuite" };

  const { data: ancien } = await supabase.from("academy_gratuite_historique")
    .select("student_id").eq("student_id", sid).maybeSingle();
  if (ancien) return { du: false, prix, motif: "gratuité d'antériorité" };

  const { data: paye } = await supabase.from("academy_paiements")
    .select("id").eq("student_id", sid).eq("program_id", parcours.id)
    .eq("statut", "paye").limit(1).maybeSingle();
  if (paye) return { du: false, prix, motif: "déjà payée" };

  return { du: true, prix, motif: "paiement requis" };
}

/** Parcours d'un cours, par son identifiant. */
async function parcoursDuCours(courseId: number): Promise<string | null> {
  const { data: c } = await supabase.from("sms_courses").select("code").eq("id", courseId).maybeSingle();
  return c?.code ? programOf(c.code)?.id ?? null : null;
}

// ── Où en est mon paiement ? ──
app.get("/api/academy/paiements", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data } = await supabase.from("academy_paiements")
    .select("program_id, montant, devise, statut, paye_at, created_at")
    .eq("student_id", sid).order("created_at", { ascending: false }).limit(20);
  const { data: ancien } = await supabase.from("academy_gratuite_historique")
    .select("student_id").eq("student_id", sid).maybeSingle();
  res.json({
    paiements: data || [],
    gratuiteHistorique: !!ancien,
    // Le prix affiché vient du registre, jamais d'une constante recopiée côté client :
    // un tarif écrit à deux endroits finit par différer, et c'est l'étudiant qui découvre
    // l'écart au moment de payer.
    tarifs: PROGRAMS.filter(p => p.prixAttestation > 0)
      .map(p => ({ programId: p.id, titre: p.title, prix: p.prixAttestation, devise: "XOF" })),
  });
});

// ── Ouvrir un paiement ──
app.post("/api/academy/paiement/attestation", rateLimit(10, 15 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const courseId = Number(req.body?.course_id);
  if (!courseId) return res.status(400).json({ message: "course_id requis" });

  const programId = await parcoursDuCours(courseId);
  const verdict = await attestationEstDue(sid, programId);
  if (!verdict.du) {
    return res.status(409).json({ message: `Aucun paiement requis : ${verdict.motif}.`, ...verdict });
  }

  // On ne fait payer que ce qui est fini. Ouvrir un paiement avant la fin du parcours
  // reviendrait à vendre une attestation que l'étudiant pourrait ne jamais obtenir.
  const { data: enr } = await supabase.from("enrollments")
    .select("progress").eq("student_id", sid).eq("course_id", courseId).maybeSingle();
  if (!enr || enr.progress < 100) {
    return res.status(403).json({ message: "Terminez le cours à 100 % avant de régler l'attestation." });
  }

  const { data: etu } = await supabase.from("students")
    .select("full_name, first_name, last_name, email, email_verified").eq("id", sid).single();
  if (!etu?.email) return res.status(400).json({ message: "Adresse email manquante." });
  if (etu.email_verified === false) {
    return res.status(403).json({ message: "Confirmez votre adresse email avant de payer.", needVerification: true });
  }

  // Notre référence, générée AVANT l'appel. C'est elle qui rendra le webhook idempotent :
  // rejoué dix fois, il retrouvera cette ligne au lieu d'en créer dix.
  const reference = `ATT-${verdict.prix}-${sid}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

  const { error: errLigne } = await supabase.from("academy_paiements").insert({
    student_id: sid, program_id: programId, montant: verdict.prix,
    devise: "XOF", reference, statut: "en_attente",
  });
  if (errLigne) return res.status(500).json({ message: "Impossible d'ouvrir le paiement." });

  try {
    const { transactionId, url } = await creerTransaction({
      montant: verdict.prix,
      description: `Attestation — ${PROGRAMS.find(p => p.id === programId)?.title ?? programId}`,
      reference,
      payeur: {
        nom: etu.last_name || etu.full_name || "Étudiant",
        prenom: etu.first_name || undefined,
        email: etu.email,
      },
      retourUrl: `${SITE_URL}/academy/dashboard?paiement=${encodeURIComponent(reference)}`,
    });
    await supabase.from("academy_paiements")
      .update({ transaction_id: transactionId, updated_at: new Date().toISOString() })
      .eq("reference", reference);
    res.json({ url, reference, montant: verdict.prix, devise: "XOF", environnement: environnementFedapay() });
  } catch (e: any) {
    const message = String(e?.message || e);
    console.error("paiement : création de transaction en échec —", message.slice(0, 500));
    await supabase.from("academy_paiements")
      .update({ statut: "echoue", updated_at: new Date().toISOString() })
      .eq("reference", reference);
    // Le message de l'opérateur ne remonte PAS au navigateur : il peut contenir l'écho de
    // ce qu'on a envoyé, y compris l'adresse email de l'étudiant.
    res.status(502).json({ message: "L'opérateur de paiement est injoignable. Réessayez dans un moment." });
  }
});

// ── Le webhook, seule source de vérité sur un paiement ──
app.post("/api/paiements/fedapay", async (req, res) => {
  const corpsBrut = (req as any).corpsBrut as string | undefined;
  const entete = req.headers["x-fedapay-signature"] as string | undefined;

  const verdict = verifierSignature(corpsBrut ?? "", entete, process.env.FEDAPAY_WEBHOOK_SECRET);
  if (!verdict.valide) {
    // On journalise la RAISON, jamais la signature reçue ni le secret attendu. Un journal
    // d'exploitation qui contient de quoi forger la prochaine tentative n'est plus un
    // journal.
    console.warn("webhook FedaPay REFUSÉ —", verdict.raison, {
      agent: String(req.headers["user-agent"] || "—").slice(0, 80),
    });
    return res.status(401).json({ message: "Signature invalide" });
  }

  const evenement = req.body ?? {};
  const entite = evenement.entity ?? evenement.data ?? {};
  const reference: string | undefined = entite.merchant_reference || entite.reference;
  const transactionId = entite.id != null ? String(entite.id) : null;

  const { data: ligne } = await supabase.from("academy_paiements")
    .select("id, student_id, program_id, montant, devise, statut")
    .or([
      reference ? `reference.eq.${reference}` : null,
      transactionId ? `transaction_id.eq.${transactionId}` : null,
    ].filter(Boolean).join(",") || "reference.eq.__aucune__")
    .maybeSingle();

  if (!ligne) {
    // 200 et non 404 : la signature est valide, l'événement est authentique, il ne nous
    // concerne simplement pas. Répondre en erreur ferait réessayer l'opérateur
    // indéfiniment pour une livraison qui n'aboutira jamais.
    console.warn("webhook FedaPay : aucune ligne pour", { reference, transactionId, evenement: evenement.name });
    return res.json({ ignore: true });
  }

  // Déjà réglé : un rejeu ne doit ni réécrire la date de paiement, ni rouvrir quoi que ce
  // soit. C'est le cas NORMAL, pas une anomalie — les webhooks se rejouent par conception.
  if (ligne.statut === "paye") return res.json({ deja: true });

  if (!transactionEstPayee(entite.status)) {
    await supabase.from("academy_paiements")
      .update({ statut: entite.status === "canceled" ? "annule" : "echoue",
                charge: evenement, updated_at: new Date().toISOString() })
      .eq("id", ligne.id);
    return res.json({ statut: entite.status ?? "inconnu" });
  }

  // ── La seconde barrière ──
  //
  // Le montant est fixé côté serveur à la création de la transaction, donc il ne devrait
  // pas pouvoir dériver. On le revérifie quand même à l'arrivée : une seule barrière n'en
  // est pas une, et c'est le seul endroit où l'on peut encore refuser avant de délivrer.
  const montantRecu = Number(entite.amount);
  const deviseRecue = String(entite.currency?.iso ?? entite.currency ?? "XOF").toUpperCase();
  if (!Number.isFinite(montantRecu) || montantRecu < ligne.montant || deviseRecue !== ligne.devise) {
    console.error("webhook FedaPay : montant ou devise inattendus", {
      attendu: `${ligne.montant} ${ligne.devise}`, recu: `${montantRecu} ${deviseRecue}`, reference,
    });
    await supabase.from("academy_paiements")
      .update({ statut: "echoue", charge: evenement, updated_at: new Date().toISOString() })
      .eq("id", ligne.id);
    return res.json({ ignore: true, raison: "montant ou devise inattendus" });
  }

  const { error } = await supabase.from("academy_paiements")
    .update({ statut: "paye", paye_at: new Date().toISOString(),
              transaction_id: transactionId ?? undefined, charge: evenement,
              updated_at: new Date().toISOString() })
    .eq("id", ligne.id);
  // Ici, en revanche, on veut être réessayé : l'argent est arrivé et nous n'avons pas su
  // l'enregistrer.
  if (error) return res.status(500).json({ message: "Écriture impossible" });

  console.log(`paiement encaissé : ${ligne.montant} ${ligne.devise}, étudiant ${ligne.student_id}, parcours ${ligne.program_id}`);
  res.json({ ok: true });
});

app.post("/api/academy/attestation", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ message: "course_id requis" });

  const { data: enr } = await supabase.from("enrollments")
    .select("progress, status").eq("student_id", sid).eq("course_id", course_id).maybeSingle();
  if (!enr || enr.progress < 100) return res.status(403).json({ message: "Vous devez compléter 100% du cours avant de demander l'attestation." });

  // Un document nominatif n'est délivré qu'à une adresse email confirmée.
  const { data: verif } = await supabase.from("students").select("email_verified").eq("id", sid).single();
  if (verif && verif.email_verified === false)
    return res.status(403).json({ message: "Confirmez votre adresse email pour recevoir votre attestation.", needVerification: true });

  // ── Le verrou de paiement ──
  //
  // Posé APRÈS le contrôle de progression et celui de l'email, et pas avant : on ne
  // demande pas d'argent à quelqu'un qui n'a pas fini, ni à quelqu'un dont on ne pourra
  // pas confirmer l'identité. L'ordre des refus est aussi un message.
  //
  // 402 « Payment Required » plutôt que 403 : c'est exactement ce que ce code veut dire,
  // et il permet au navigateur de distinguer « il vous manque un paiement » de « vous
  // n'avez pas le droit ». Les deux appellent des écrans différents.
  const parcoursVise = await parcoursDuCours(course_id);
  const du = await attestationEstDue(sid, parcoursVise);
  if (du.du) {
    return res.status(402).json({
      message: `L'attestation de ce parcours coûte ${du.prix.toLocaleString("fr-FR")} F CFA.`,
      paiementRequis: true, prix: du.prix, devise: "XOF", programId: parcoursVise,
    });
  }

  // Ne regarder que les attestations DE COURS : l'attestation d'admission et le certificat final
  // sont rattachés au même course_id et feraient croire, à tort, à une demande déjà déposée.
  const { data: priorRows } = await supabase.from("attestations")
    .select("id, status").eq("student_id", sid).eq("course_id", course_id).eq("cert_type", "course")
    .order("id", { ascending: false });
  const existing = (priorRows || [])[0];
  if (existing && existing.status !== "rejected") return res.status(409).json({ message: "Attestation déjà demandée", status: existing.status });
  // Une demande rejetée peut être refaite : on remplace l'ancienne ligne par une nouvelle demande "pending".
  if (existing) await supabase.from("attestations").delete().eq("id", existing.id);

  // Score final = moyenne des notes du cours
  const { data: courseGrades } = await supabase.from("grades")
    .select("score, max_score").eq("student_id", sid).eq("course_id", course_id);
  const arr = courseGrades || [];
  const finalScore = arr.length ? Math.round(arr.reduce((a, g) => a + (Number(g.score) / Number(g.max_score)) * 100, 0) / arr.length * 10) / 10 : 0;
  const certNo = `DMA-${course_id}-${sid}-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase.from("attestations")
    .insert({ student_id: sid, course_id, cert_type: "course", certificate_no: certNo, final_score: finalScore, status: "pending" })
    .select().single();
  if (error) return res.status(400).json({ message: error.message });

  // Accusé de réception de la demande d'attestation
  const { data: stud } = await supabase.from("students").select("full_name, email").eq("id", sid).single();
  const { data: course } = await supabase.from("sms_courses").select("code, title").eq("id", course_id).single();

  // ── Et l'avis à l'exploitation ──
  //
  // Une demande d'attestation attend une décision humaine : elle reste en `pending`
  // jusqu'à ce que quelqu'un l'approuve. Or personne n'était prévenu. Trois demandes
  // ont dormi cinq jours — l'étudiante avait terminé trois cours et n'a rien reçu,
  // pendant qu'un compteur discret l'annonçait sur un écran que personne n'avait de
  // raison d'ouvrir.
  //
  // Une file d'attente qui dépend d'un humain doit aller le chercher, pas l'attendre.
  if (course) {
    sendAcademyEmail({
      studentId: null, to: EMAIL_ALERTE, type: "attestation_a_valider",
      subject: `📋 Attestation à valider — ${stud?.full_name || "étudiant"} · ${course.code}`,
      html: attestationAValiderEmailHtml(stud?.full_name || "—", course, certNo, finalScore),
      dedupeKey: `attest_admin:${data?.id ?? certNo}`,
    }).catch(() => {});
  }
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

  const dlToken = generateStudentToken(sid);
  const credentials: any[] = [];

  // Attestation d'admission
  if (stud?.admitted_at) {
    const adm = (atts || []).find((a: any) => a.cert_type === "admission");
    const expired = stud.admission_expires && new Date(stud.admission_expires) < new Date();
    credentials.push({
      id: "admission",
      type: "admission",
      title: "Attestation d'admission",
      subtitle: "Programme MEAL — LouisFarm Learning",
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

  // Notifier tous les étudiants actifs ayant accepté les emails de cours (idempotent par étudiant/cours)
  const notified = notify ? await notifyNewCourseEmails({ id: data.id, code, title, description }) : 0;
  res.status(201).json({ course: data, notified: !!notify, notifiedCount: notified });
});

// ── ADMIN : notifier manuellement d'un cours existant ──
app.post("/api/admin/academy/notify-course/:id", requireAuth, async (req, res) => {
  const { data: course } = await supabase.from("sms_courses").select("*").eq("id", Number(req.params.id)).single();
  if (!course) return res.status(404).json({ message: "Cours introuvable" });
  if (!resend) return res.status(400).json({ message: "Email non configuré (RESEND_API_KEY manquant)" });
  const count = await notifyNewCourseEmails(course);
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
      subject: "Test LouisFarm Learning",
      html: emailLayout('<div class="h"><h1>Test réussi</h1></div><div class="b"><p>Si vous lisez cet email, la configuration Resend de LouisFarm Learning fonctionne correctement.</p></div>'),
    });
    res.json({ message: "Email de test envoyé", id: (result as any)?.data?.id || null });
  } catch (e: any) {
    res.status(500).json({ message: "Échec d'envoi", error: e?.message || String(e) });
  }
});

// ══════════════ ADMIN — Gestion école ══════════════

// ══════════════ Messages individuels aux étudiants ══════════════
//
// L'administration savait admettre, vérifier, réinitialiser, révoquer — mais pas écrire. Le
// seul moyen de s'adresser à un étudiant était la newsletter, qui part à tout le monde, ou une
// boîte personnelle, qui ne laisse aucune trace dans la plateforme.
//
// L'écriture et l'envoi sont deux gestes distincts. Un message porte le nom de Louis, annonce
// souvent une décision, et ne se rattrape pas une fois parti : on l'écrit, on le relit, puis
// on l'envoie explicitement.

app.get("/api/admin/academy/messages", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("academy_student_messages")
    .select("*, students(id, full_name, email, email_verified)")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return res.status(500).json({ message: error.message });
  res.json(data ?? []);
});

app.post("/api/admin/academy/messages", requireAuth, async (req, res) => {
  const { id, student_id, subject, body } = req.body ?? {};
  if (!student_id || !String(subject || "").trim() || !String(body || "").trim()) {
    return res.status(400).json({ message: "Destinataire, objet et message sont requis." });
  }

  if (id) {
    // Un message parti ne se réécrit pas : le corps conservé doit rester celui qui a été lu.
    const { data: actuel } = await supabase.from("academy_student_messages")
      .select("status").eq("id", id).maybeSingle();
    if (actuel?.status === "sent") {
      return res.status(400).json({ message: "Ce message a déjà été envoyé : il n'est plus modifiable." });
    }
    const { data, error } = await supabase.from("academy_student_messages")
      .update({ subject, body, status: "draft", error: null, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) return res.status(500).json({ message: error.message });
    return res.json(data);
  }

  const { data, error } = await supabase.from("academy_student_messages")
    .insert({ student_id, subject, body, status: "draft" }).select().single();
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.post("/api/admin/academy/messages/:id/send", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { data: msg } = await supabase.from("academy_student_messages")
    .select("*, students(id, full_name, email)").eq("id", id).maybeSingle();
  if (!msg) return res.status(404).json({ message: "Message introuvable." });
  if (msg.status === "sent") {
    // Renvoyer un message déjà parti ferait un doublon dans la boîte de l'étudiant, sans
    // qu'aucune erreur ne le signale. On refuse plutôt que de laisser le doute.
    return res.status(400).json({ message: "Ce message a déjà été envoyé." });
  }
  const dest = (msg as any).students;
  if (!dest?.email) return res.status(400).json({ message: "Cet étudiant n'a pas d'adresse e-mail." });

  const envoi = await sendAcademyEmail({
    studentId: dest.id, to: dest.email, type: "message_admin",
    subject: msg.subject,
    html: studentMessageEmailHtml(dest.full_name, msg.subject, msg.body),
    dedupeKey: `message_admin:${id}`,
  });

  if (!envoi.sent) {
    await supabase.from("academy_student_messages")
      .update({ status: "failed", error: envoi.reason ?? "inconnu", updated_at: new Date().toISOString() })
      .eq("id", id);
    // Dire pourquoi. Un « échec » sans motif laisse l'administrateur sans rien à corriger.
    const motifs: Record<string, string> = {
      resend_not_configured: "Le service d'envoi n'est pas configuré (RESEND_API_KEY absente).",
      no_recipient: "Aucune adresse e-mail pour cet étudiant.",
      already_sent: "Ce message a déjà été envoyé.",
      send_failed: "Le service d'envoi a refusé le message.",
    };
    return res.status(500).json({
      message: motifs[envoi.reason ?? ""] ?? `Envoi impossible (${envoi.reason ?? "raison inconnue"}).`,
      reason: envoi.reason,
    });
  }

  const { data } = await supabase.from("academy_student_messages")
    .update({ status: "sent", error: null, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  res.json({ sent: true, message: data });
});

app.delete("/api/admin/academy/messages/:id", requireAuth, async (req, res) => {
  const { data: msg } = await supabase.from("academy_student_messages")
    .select("status").eq("id", Number(req.params.id)).maybeSingle();
  if (msg?.status === "sent") {
    // La trace de ce qui a été envoyé doit survivre : c'est elle qu'on relit quand un étudiant
    // écrit « vous m'aviez dit que… ».
    return res.status(400).json({ message: "Un message envoyé ne peut pas être supprimé." });
  }
  const { error } = await supabase.from("academy_student_messages").delete().eq("id", Number(req.params.id));
  if (error) return res.status(500).json({ message: error.message });
  res.json({ ok: true });
});

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
      // Remplace toute attestation d'admission existante (évite les doublons si "admit" est cliqué
      // plusieurs fois ou après un revoke_admission — verify-certificate suppose une seule ligne par étudiant).
      await supabase.from("attestations").delete().eq("student_id", id).eq("cert_type", "admission").then(() => {}, () => {});
      const certNo = `DMA-ADM-${id}-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from("attestations").insert({ student_id: id, course_id: courses?.[0]?.id ?? null, cert_type: "admission", certificate_no: certNo, status: "issued", issued_at: now.toISOString(), expires_at: expires }).then(() => {}, () => {});
      // Planning reparti de zéro à la date d'admission : c'est aussi le moyen pour l'admin de
      // débloquer un étudiant dont le calendrier avait été généré sur un ancien rythme.
      await supabase.from("lesson_progress").delete().eq("student_id", id).then(() => {}, () => {});
      await supabase.from("group_work_progress").delete().eq("student_id", id).then(() => {}, () => {});
      await generateLessonSchedule(id, now, "meal");
      await generateGroupWorkSchedule(id, now);
    } else if (action === "reset_test") {
      // Seconde chance : lève le délai d'attente, l'étudiant peut repasser immédiatement.
      // Le score précédent est conservé — il sera écrasé à la prochaine tentative.
      await supabase.from("students").update({ next_test_allowed: null, last_test_at: null }).eq("id", id);
      // Sans cet email, l'étudiant n'apprend jamais qu'on lui a rouvert le test : il est
      // reparti sur « revenez dans 7 jours » et n'a aucune raison de retourner voir.
      const { data: st } = await supabase.from("students")
        .select("full_name, email, entry_score, course_emails").eq("id", id).maybeSingle();
      if (st?.email && st.course_emails !== false) {
        sendAcademyEmail({
          studentId: id, to: st.email, type: "test_reopened",
          subject: "Vous pouvez repasser le test d'admission",
          html: testReopenedEmailHtml(st.full_name, st.entry_score ?? null),
          // Horodatée : réautoriser une nouvelle fois doit bien renvoyer un message.
          dedupeKey: `test_reopened:${id}:${Date.now()}`,
        });
      }
    } else if (action === "revoke_admission") {
      await supabase.from("students").update({ admitted_at: null, admission_expires: null, status: "pending_test" }).eq("id", id);
      await supabase.from("lesson_progress").delete().eq("student_id", id).then(() => {}, () => {});
      // Le calendrier des travaux de groupe et l'appartenance au groupe suivent l'admission :
      // laisser l'étudiant dans une équipe qu'il ne peut plus rejoindre bloquerait une place.
      await supabase.from("group_work_progress").delete().eq("student_id", id).then(() => {}, () => {});
      await supabase.from("academy_group_members").delete().eq("student_id", id).then(() => {}, () => {});
      await supabase.from("attestations").delete().eq("student_id", id).eq("cert_type", "admission").then(() => {}, () => {});
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
    supabase.from("students").select("id, full_name, email, phone, country, organization, avatar_url, status, email_verified, admitted_at, admission_expires, entry_score, test_attempts, last_test_at, next_test_allowed, final_certificate_no, created_at").eq("id", id).single(),
    supabase.from("grades").select("*, sms_courses(code, title)").eq("student_id", id).order("graded_at", { ascending: true }),
    supabase.from("enrollments").select("*, sms_courses(code, title)").eq("student_id", id),
    supabase.from("attestations").select("*, sms_courses(code, title)").eq("student_id", id),
  ]);
  if (student.error) return res.status(404).json({ message: "Étudiant introuvable" });

  // Liens de téléchargement des certificats (l'admin génère un jeton pour cet étudiant)
  const st = student.data as any;
  const certificates: any[] = [];
  if (st.admitted_at) {
    const tk = generateStudentToken(id);
    certificates.push({ type: "admission", label: "Attestation d'admission", url: `/api/academy/certificate/admission?token=${tk}`, expires_at: st.admission_expires });
  }
  if (st.final_certificate_no) {
    const tk = generateStudentToken(id);
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
  // Garder enrollments.progress/status (et les certificats qui en dépendent) cohérents avec les notes réelles.
  if ((type || "exam") === "lesson" && course_id) await recalcCourseProgress(student_id, course_id);
  res.status(201).json(data);
});

app.delete("/api/admin/academy/grades/:id", requireAuth, async (req, res) => {
  const { data: grade } = await supabase.from("grades").select("student_id, course_id, type").eq("id", Number(req.params.id)).maybeSingle();
  const { error } = await supabase.from("grades").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  if (grade?.type === "lesson" && grade.course_id) await recalcCourseProgress(grade.student_id, grade.course_id);
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
        dedupeKey: `attestation:${data.id}:issued`,
      });
    } else if (status === "rejected") {
      sendAcademyEmail({
        studentId: data.student_id, to: stud.email, type: "attestation_rejected",
        subject: `Attestation — complément requis (${course.title})`,
        html: attestationRejectedEmailHtml(stud.full_name, course),
        dedupeKey: `attestation:${data.id}:rejected`,
      });
    }
  }
  res.json(data);
});

// ══════════════ Travaux de groupe — administration ══════════════

// ── Les trois énoncés (semés au premier appel depuis shared/groupwork.ts) ──
app.get("/api/admin/academy/group-works", requireAuth, async (_req, res) => {
  res.json(await getGroupWorks());
});

app.put("/api/admin/academy/group-works/:id", requireAuth, async (req, res) => {
  const { title, brief, deliverables, max_score, week_index, is_published } = req.body || {};
  const maj: any = {};
  if (title !== undefined) maj.title = String(title).slice(0, 200);
  if (brief !== undefined) maj.brief = String(brief).slice(0, 5000);
  if (deliverables !== undefined) maj.deliverables = Array.isArray(deliverables) ? deliverables.slice(0, 15).map((d: any) => String(d).slice(0, 300)) : [];
  if (max_score !== undefined) maj.max_score = Math.max(1, Number(max_score) || 100);
  if (week_index !== undefined) maj.week_index = Math.max(1, Number(week_index) || 1);
  if (is_published !== undefined) maj.is_published = !!is_published;
  const { data, error } = await supabase.from("academy_group_works")
    .update(maj).eq("id", Number(req.params.id)).select().maybeSingle();
  if (error) return res.status(400).json({ message: error.message });
  // Le calendrier de chaque étudiant se réaligne tout seul au prochain affichage
  // (generateGroupWorkSchedule), sans jamais toucher à une fenêtre déjà écoulée.
  res.json(data);
});

// ── Groupes : composition et rendus ──
app.get("/api/admin/academy/groups", requireAuth, async (_req, res) => {
  const travaux = await getGroupWorks();

  const { data: groupes, error } = await supabase.from("academy_groups")
    .select("id, name, cohort, is_active, created_at, group_work_id, academy_group_members(student_id, role, joined_at, students(full_name, email))")
    .order("group_work_id").order("cohort", { ascending: false }).order("name");
  if (error) return res.status(500).json({ message: error.message });

  const { data: rendus } = await supabase.from("academy_group_submissions")
    .select("id, group_id, group_work_id, status, score, feedback, content, submitted_at, graded_at, students:submitted_by(full_name)");

  const { data: admis } = await supabase.from("students")
    .select("id, full_name, email, admitted_at").not("admitted_at", "is", null).order("admitted_at");

  // « Sans groupe » n'a de sens que rapporté à un travail : les équipes changent à chaque
  // fois, donc un étudiant peut être placé pour le GW1 et pas encore pour le GW2.
  const parTravail = travaux.map((t: any) => {
    const siens = (groupes || []).filter((g: any) => g.group_work_id === t.id);
    const places = new Set(siens.flatMap((g: any) => (g.academy_group_members || []).map((m: any) => m.student_id)));
    return {
      travail: { id: t.id, index: t.gw_index, titre: t.title, semaine: t.week_index, maxScore: t.max_score, grille: t.rubric },
      constitue: siens.length > 0,
      groupes: siens.map((g: any) => ({
        id: g.id, nom: g.name, cohorte: g.cohort, actif: g.is_active !== false, creeLe: g.created_at,
        membres: (g.academy_group_members || []).map((m: any) => ({
          studentId: m.student_id,
          nom: (m.students?.full_name || "").trim() || m.students?.email,
          email: m.students?.email, role: m.role,
        })),
        rendus: (rendus || []).filter((r: any) => r.group_id === g.id).map((r: any) => ({
          id: r.id, groupWorkId: r.group_work_id, statut: r.status, note: r.score, feedback: r.feedback,
          contenu: r.content, le: r.submitted_at, corrigeLe: r.graded_at, par: r.students?.full_name ?? null,
        })),
      })),
      sansGroupe: (admis || []).filter((s: any) => !places.has(s.id))
        .map((s: any) => ({ id: s.id, nom: (s.full_name || "").trim() || s.email, email: s.email, admisLe: s.admitted_at })),
    };
  });

  res.json({ parTravail, travaux });
});

app.post("/api/admin/academy/groups", requireAuth, async (req, res) => {
  const { name, cohort } = req.body || {};
  if (!name || !cohort) return res.status(400).json({ message: "name et cohort requis" });
  const { data, error } = await supabase.from("academy_groups")
    .insert({ name: String(name).slice(0, 80), cohort: String(cohort).slice(0, 20) }).select().maybeSingle();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

app.put("/api/admin/academy/groups/:id", requireAuth, async (req, res) => {
  const { name, is_active } = req.body || {};
  const maj: any = {};
  if (name !== undefined) maj.name = String(name).slice(0, 80);
  if (is_active !== undefined) maj.is_active = !!is_active;
  const { data, error } = await supabase.from("academy_groups")
    .update(maj).eq("id", Number(req.params.id)).select().maybeSingle();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

app.delete("/api/admin/academy/groups/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("academy_groups").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  // Les membres suivent (ON DELETE CASCADE) et seront redistribués automatiquement au
  // prochain affichage de leur espace.
  res.json({ message: "Groupe supprimé" });
});

/**
 * Déplacer un étudiant dans ce groupe.
 *
 * Le déplacement ne vaut QUE pour le travail auquel appartient le groupe visé : un étudiant
 * a une équipe par travail, et le sortir de celle du GW1 parce qu'on le déplace au GW2
 * casserait un rendu déjà en cours. Le travail se déduit du groupe, il n'est pas à fournir.
 */
app.post("/api/admin/academy/groups/:id/members", requireAuth, async (req, res) => {
  const groupId = Number(req.params.id);
  const studentId = Number(req.body?.student_id);
  if (!studentId) return res.status(400).json({ message: "student_id requis" });

  const { data: groupe } = await supabase.from("academy_groups")
    .select("id, group_work_id").eq("id", groupId).maybeSingle();
  if (!groupe) return res.status(404).json({ message: "Groupe introuvable" });

  await supabase.from("academy_group_members")
    .delete().eq("student_id", studentId).eq("group_work_id", groupe.group_work_id);
  const { data, error } = await supabase.from("academy_group_members")
    .insert({
      group_id: groupId, student_id: studentId,
      group_work_id: groupe.group_work_id, role: req.body?.role || "membre",
    }).select().maybeSingle();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
});

app.delete("/api/admin/academy/groups/:id/members/:studentId", requireAuth, async (req, res) => {
  const { error } = await supabase.from("academy_group_members")
    .delete().eq("group_id", Number(req.params.id)).eq("student_id", Number(req.params.studentId));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Retiré du groupe" });
});

/**
 * Constitue à la main les équipes d'un travail, sans attendre la semaine 3.
 *
 * Le système le fait tout seul une semaine avant l'ouverture de chaque travail. Ce bouton
 * sert à devancer ce moment — pour voir la répartition, ou la refaire après avoir retiré
 * un étudiant. Il passe par la même fonction verrouillée : appuyer deux fois ne crée pas
 * deux jeux d'équipes.
 */
app.post("/api/admin/academy/groups/auto-assign", requireAuth, async (req, res) => {
  const gwId = Number(req.body?.group_work_id);
  if (!gwId) return res.status(400).json({ message: "Indiquez le travail (group_work_id) dont vous voulez constituer les équipes." });

  const gw = (await getGroupWorks()).find(g => g.id === gwId);
  if (!gw) return res.status(404).json({ message: "Travail introuvable." });

  const { data: admis } = await supabase.from("students")
    .select("id, admitted_at").not("admitted_at", "is", null);
  const cohortes = Array.from(new Set((admis || [])
    .filter((s: any) => eligibleAuxTravauxDeGroupe(s.admitted_at))
    .map((s: any) => cohortOf(new Date(s.admitted_at)))));

  let places = 0, groupes = 0;
  for (const c of cohortes) {
    const formes = await formGroupsForGw(c, gwId);
    for (const f of formes) {
      groupes++;
      places += f.membres.length;
      await announceGroupFormed(f.groupId, gw, f.membres).catch(() => {});
    }
  }
  res.json({
    message: places
      ? `${gw.title} : ${places} étudiant${places > 1 ? "s" : ""} réparti${places > 1 ? "s" : ""} dans ${groupes} groupe${groupes > 1 ? "s" : ""}. Chacun a reçu son email.`
      : "Les équipes de ce travail sont déjà constituées, ou aucun étudiant éligible n'est en attente.",
    places, groupes,
  });
});

/** Défaire les équipes d'un travail — pour les retirer au sort autrement. */
app.delete("/api/admin/academy/groups/gw/:gwId", requireAuth, async (req, res) => {
  const gwId = Number(req.params.gwId);
  const { count } = await supabase.from("academy_group_submissions")
    .select("id", { count: "exact", head: true }).eq("group_work_id", gwId);
  // Refaire les équipes après un dépôt orphelinerait le rendu de son groupe : on refuse.
  if (count) return res.status(409).json({ message: `Impossible : ${count} rendu(s) sont déjà déposés pour ce travail.` });

  await supabase.from("academy_group_posts").delete().eq("group_work_id", gwId).then(() => {}, () => {});
  await supabase.from("academy_group_members").delete().eq("group_work_id", gwId).then(() => {}, () => {});
  await supabase.from("academy_groups").delete().eq("group_work_id", gwId).then(() => {}, () => {});
  await supabase.from("academy_group_formation_locks").delete().eq("group_work_id", gwId).then(() => {}, () => {});
  res.json({ message: "Équipes défaites. Vous pouvez relancer le tirage." });
});

// ── Corriger un rendu collectif ──
app.get("/api/admin/academy/group-submissions", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("academy_group_submissions")
    .select("*, academy_groups(name, cohort), academy_group_works(gw_index, title, max_score)")
    .order("submitted_at", { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

app.put("/api/admin/academy/group-submissions/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { score, feedback } = req.body || {};

  const { data: sub } = await supabase.from("academy_group_submissions")
    .select("id, group_work_id").eq("id", id).maybeSingle();
  if (!sub) return res.status(404).json({ message: "Rendu introuvable" });
  const gw = (await getGroupWorks()).find(g => g.id === sub.group_work_id);
  const max = gw?.max_score ?? 100;
  const grille: any[] = Array.isArray(gw?.rubric) ? gw!.rubric : [];

  // Notation par critère quand la grille est fournie : la note globale en DÉCOULE, elle
  // n'est pas saisie deux fois. Un total qui ne correspond pas au détail est la première
  // chose qu'un étudiant conteste, et il a raison.
  let detail: Record<string, number> | null = null;
  let note = Number(score);
  if (req.body?.critères || req.body?.criteres) {
    const saisie = req.body.criteres ?? req.body["critères"];
    detail = {};
    note = 0;
    for (const c of grille) {
      const brut = Number(saisie?.[c.cle]);
      const n = Number.isFinite(brut) ? Math.min(Number(c.points), Math.max(0, Math.round(brut))) : 0;
      detail[c.cle] = n;
      note += n;
    }
  }

  if (!Number.isFinite(note) || note < 0 || note > max)
    return res.status(400).json({ message: `La note doit être comprise entre 0 et ${max}.` });

  const { data, error } = await supabase.from("academy_group_submissions")
    .update({ score: Math.round(note), feedback: feedback ? String(feedback).slice(0, 3000) : null,
              status: "graded", graded_at: new Date().toISOString(), rubric_scores: detail })
    .eq("id", id).select().maybeSingle();
  if (error) return res.status(400).json({ message: error.message });

  // Une note de groupe est une note pour chacun : elle est écrite dans le relevé de tous
  // les membres, et chacun reçoit la correction.
  const { notified } = await applyGroupWorkGrade(id);
  res.json({ ...data, notified });
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
/**
 * Message individuel écrit depuis l'administration.
 *
 * Le corps est composé dans un champ de texte, jamais en HTML libre : on échappe d'abord,
 * puis on n'autorise que trois marques — paragraphe, gras, puce. Coller du HTML brut dans un
 * courriel signé Louis TATCHIDA ouvrirait la porte à une injection si le champ venait un jour
 * à être alimenté autrement que par lui.
 */
function studentMessageEmailHtml(nom: string | undefined, sujet: string, corps: string) {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const enGras = (t: string) => esc(t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  const blocs = corps.split(/\n{2,}/).map(bloc => {
    const lignes = bloc.split("\n");
    if (lignes.every(l => l.trim().startsWith("- "))) {
      return `<ul style="margin:0 0 16px;padding-left:20px">${
        lignes.map(l => `<li style="margin:0 0 6px">${enGras(l.trim().slice(2))}</li>`).join("")}</ul>`;
    }
    return `<p>${lignes.map(enGras).join("<br>")}</p>`;
  }).join("");

  const g = nom ? `Bonjour ${esc(nom.split(" ")[0])},` : "Bonjour,";
  return academyEmailLayout(
    `<div class="hd"><div class="logo"><span>LOUISFARM LEARNING</span></div>`
    + `<h1>${esc(sujet)}</h1></div>`
    + `<div class="bd"><p>${g}</p>${blocs}`
    + `<p style="margin-top:24px">Bien à vous,<br><strong>Louis TATCHIDA</strong></p></div>`
  );
}

// ── Layout email dédié LouisFarm Learning ──
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
  <div class="ft"><p class="name">🎓 LouisFarm Learning</p><p>Formation gratuite par projets · KoboCollect · Python · QGIS</p><p>Afrique de l'Ouest · <a href="${SITE_URL}/academy/login">Mon espace étudiant</a></p><p style="margin-top:12px;font-size:11px;color:#d1d5db">Vous recevez cet email car vous avez un compte sur LouisFarm Learning.</p></div>
</div></div></body></html>`;
}

function verifyEmailHtml(name: string, url: string, code?: string) {
  const codeBlock = code ? `<div class="cd" style="text-align:center"><p style="margin:0 0 8px;font-size:13px">Ou entrez ce code dans l'application :</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#16a34a;margin:0">${code}</p></div>` : "";
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="LouisFarm Learning" class="av"><h1>Confirmez votre inscription</h1><p>LouisFarm Learning</p></div><div class="b"><span class="bg">🎓 Bienvenue</span><p>Bonjour ${name},</p><p>Merci de rejoindre <strong>LouisFarm Learning</strong>, la formation gratuite par projets en MEAL (KoboCollect, Python, QGIS) pour l'Afrique de l'Ouest.</p><p>Pour activer votre compte et passer le test d'aptitude, confirmez votre adresse email :</p><p style="text-align:center"><a href="${url}" class="cta">Confirmer mon email</a></p>${codeBlock}<p style="font-size:13px;color:#9ca3af">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p><p>À très vite en cours,<br><strong>L'équipe LouisFarm Learning</strong></p></div>`);
}

function resetEmailHtml(name: string, url: string) {
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="LouisFarm Learning" class="av"><h1>Réinitialisation du mot de passe</h1><p>LouisFarm Learning</p></div><div class="b"><span class="bg">🔑 Sécurité</span><p>Bonjour ${name},</p><p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p><p style="text-align:center"><a href="${url}" class="cta">Réinitialiser mon mot de passe</a></p><p style="font-size:13px;color:#9ca3af">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.</p><p>Cordialement,<br><strong>L'équipe LouisFarm Learning</strong></p></div>`);
}

function newCourseEmailHtml(name: string | undefined, course: { code: string; title: string; description?: string }) {
  const g = name ? `Bonjour ${name},` : "Bonjour,";
  return emailLayout(`<div class="h"><img src="${PHOTO_URL}" alt="LouisFarm Learning" class="av"><h1>Nouveau cours disponible</h1><p>LouisFarm Learning</p></div><div class="b"><span class="bg">📚 Nouveau cours</span><p>${g}</p><p>Un nouveau cours vient d'être ajouté à votre académie :</p><div class="cd"><h3>${course.title}</h3>${course.description ? `<p>${course.description}</p>` : ""}<p style="margin-top:8px;font-size:12px;color:#16a34a;font-weight:600">Code : ${course.code}</p></div><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="cta">Découvrir le cours</a></p><p>Bonne formation,<br><strong>L'équipe LouisFarm Learning</strong></p></div>`);
}


// ── Email : projet terminé (100%) ──
function courseCompletedEmailHtml(name: string, course: { code: string; title: string }) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Bravo, ${name.split(" ")[0]} ! 🏁</h1><p class="sub">Vous avez terminé un projet complet</p></div><div class="bd"><span class="badge">✅ Projet terminé</span><p>Félicitations ${name},</p><p>Vous venez de compléter <strong>100%</strong> du projet :</p><div class="info"><h3>${course.title}</h3><p style="margin-top:10px;font-size:12px;color:#0d9488;font-weight:700">${course.code} · Terminé</p></div><p>C'est une vraie compétence terrain, directement applicable dans les contextes humanitaires et de développement en Afrique de l'Ouest.</p><p><strong>Prochaine étape :</strong> demandez votre attestation de compétence, ou enchaînez sur le projet suivant pour progresser vers le statut de Super-Expert MEAL.</p><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Demander mon attestation</a></p><p class="muted">Continuez sur cette lancée — chaque projet vous rapproche de la maîtrise complète du cycle MEAL.</p></div>`);
}

// ── Email : relance de vérification d'adresse ──
// Le ton monte d'une relance à l'autre : le premier message suppose un oubli, le dernier
// annonce que c'est le dernier. Un rappel identique répété trois fois se fait ignorer.
function verifyReminderEmailHtml(name: string, url: string, code: string, step: number) {
  const firstName = (name || "").split(" ")[0] || "";
  const t = step === 1
    ? { badge: "📬 Rappel", titre: "Il reste une étape", sous: "Confirmez votre adresse email",
        corps: `<p>Vous avez créé votre compte hier, mais votre adresse n'est pas encore confirmée. C'est l'affaire d'un clic.</p>` }
    : step === 3
    ? { badge: "⏳ Toujours en attente", titre: "Votre compte attend encore", sous: "Confirmation d'adresse",
        corps: `<p>Votre adresse email n'est toujours pas confirmée. Vous pouvez suivre les cours sans cela, mais <strong>nous ne pourrons vous délivrer ni attestation ni certificat</strong> tant que ce n'est pas fait.</p>` }
    : { badge: "🔔 Dernier rappel", titre: "Dernier rappel", sous: "Confirmation d'adresse",
        corps: `<p>C'est le dernier message que nous vous enverrons à ce sujet. Sans confirmation, votre compte reste utilisable pour apprendre, mais aucun document officiel ne pourra vous être délivré.</p>` };
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>${t.titre}</h1><p class="sub">${t.sous}</p></div><div class="bd"><span class="badge">${t.badge}</span><p>${firstName ? `Bonjour ${firstName},` : "Bonjour,"}</p>${t.corps}<p style="text-align:center"><a href="${url}" class="btn">Confirmer mon adresse</a></p><div class="code"><p class="lbl">Ou saisissez ce code dans l'application :</p><p class="val">${code}</p></div><p class="muted"><strong>Vous ne trouvez pas nos messages ?</strong> Regardez dans vos spams ou courriers indésirables. Si vous y trouvez un email de notre part, marquez-le « Non spam » et ajoutez contact@louisfarm.com à vos contacts — les suivants arriveront normalement.</p><p class="muted">Ce lien et ce code sont valables 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p></div>`);
}

// ── Email : seconde chance au test d'admission ──
// Envoyé quand l'administration lève le délai d'attente. Le ton est délibérément
// encourageant : l'étudiant vient d'échouer, et souvent d'un cheveu.
function testReopenedEmailHtml(name: string, previousScore: number | null) {
  const firstName = (name || "").split(" ")[0] || "";
  const manque = previousScore != null && previousScore > 0 && previousScore < ADMISSION_PASS_SCORE
    ? `<div class="info"><h3>Votre dernière tentative : ${previousScore}/30</h3><p style="margin-top:6px">Il vous manquait ${ADMISSION_PASS_SCORE - previousScore} point${ADMISSION_PASS_SCORE - previousScore > 1 ? "s" : ""} pour atteindre les ${ADMISSION_PASS_SCORE}/30 requis.</p></div>`
    : "";
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Une seconde chance vous est ouverte</h1><p class="sub">Test d'admission — nouvelle tentative autorisée</p></div><div class="bd"><span class="badge">🔓 Test rouvert</span><p>${firstName ? `Bonjour ${firstName},` : "Bonjour,"}</p><p>Vous n'avez pas atteint le score requis lors de votre dernière tentative. Nous vous rouvrons le test <strong>dès maintenant</strong> : vous n'avez pas à attendre le délai habituel.</p>${manque}<p>Prenez le temps qu'il faut, installez-vous au calme, et relisez tranquillement chaque question avant de répondre. Le test porte sur les fondamentaux du MEAL, de la collecte de données et des outils de terrain.</p><p style="text-align:center"><a href="${SITE_URL}/elearning" class="btn">Repasser le test</a></p><p class="muted">Rien n'est perdu : seule votre meilleure situation compte, et l'accès à la formation reste entièrement gratuit. Si une question vous semble ambiguë, répondez à cet email — nous vous répondrons.</p></div>`);
}

// ── Email : leçon validée ──
// Envoyé après chaque réussite, sauf quand la leçon termine le cours — dans ce cas
// courseCompletedEmailHtml dit déjà mieux la même chose, et deux emails d'affilée pour le
// même geste se lisent comme un bug.
function lessonPassedEmailHtml(
  name: string,
  course: { code: string; title: string },
  lesson: { title: string; order_index?: number },
  opts: { score: number; max: number; progress: number; done: number; total: number; next?: { title: string; open: boolean; unlockAt?: string } | null },
) {
  const firstName = (name || "").split(" ")[0] || "";
  const pct = opts.max ? Math.round((opts.score / opts.max) * 100) : 0;
  const rang = lesson.order_index ? `Leçon ${lesson.order_index} · ` : "";
  const suite = opts.next
    ? (opts.next.open
        ? `<p><strong>La suite est déjà ouverte :</strong> « ${opts.next.title} ». Vous pouvez enchaîner tout de suite.</p>
           <p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Continuer le cours</a></p>`
        : `<p><strong>Prochaine leçon :</strong> « ${opts.next.title} »${opts.next.unlockAt ? `, à partir du ${new Date(opts.next.unlockAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}. Vous pouvez d'ici là avancer sur vos autres cours.</p>
           <p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Voir mon planning</a></p>`)
    : `<p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Voir mon planning</a></p>`;
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Leçon validée${firstName ? `, ${firstName}` : ""} ! ✅</h1><p class="sub">${rang}${course.code}</p></div><div class="bd"><span class="badge">✅ Réussite</span><p>${name ? `Bonjour ${name},` : "Bonjour,"}</p><p>Vous venez de valider :</p><div class="info"><h3>${lesson.title}</h3><p style="margin-top:8px">Note : <strong style="color:#0d9488">${opts.score}/${opts.max}</strong> — ${pct}% de bonnes réponses</p><p style="margin-top:6px;font-size:12px;color:#6b7280">${course.code} · ${course.title}</p></div><p>Vous en êtes à <strong>${opts.done}/${opts.total} leçons</strong> de ce cours, soit <strong>${opts.progress}%</strong>.</p>${suite}<p class="muted">Les exercices sont corrigés côté serveur : cette note reflète vos réponses réelles, pas un simple clic. C'est du travail qui compte.</p></div>`);
}

// ── Email : nouveau cours débloqué ──
function courseUnlockedEmailHtml(
  name: string,
  course: { code: string; title: string; description?: string },
  firstLesson?: { title: string } | null,
  dueAt?: string,
) {
  const firstName = (name || "").split(" ")[0] || "";
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Nouveau cours débloqué 🔓</h1><p class="sub">${course.code} · ${course.title}</p></div><div class="bd"><span class="badge">🔓 Accès ouvert</span><p>${firstName ? `Bravo ${firstName},` : "Bravo,"}</p><p>Vous avez avancé assez loin pour ouvrir le cours suivant de votre parcours :</p><div class="info"><h3>${course.title}</h3>${course.description ? `<p style="margin-top:6px">${course.description}</p>` : ""}<p style="margin-top:10px;font-size:12px;color:#0d9488;font-weight:700">${course.code}</p></div>${firstLesson ? `<p><strong>Première leçon :</strong> « ${firstLesson.title} »${dueAt ? `, à rendre avant le ${new Date(dueAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}.</p>` : ""}<p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Commencer ce cours</a></p><p class="muted">Rappel : les dates du planning sont un rythme conseillé, pas un couperet. Vous pouvez prendre de l'avance, et une leçon en retard reste rattrapable jusqu'à la fin de votre période d'admission.</p></div>`);
}

// ── Email : quelqu'un a écrit dans un forum ──
function forumMessageEmailHtml(
  name: string,
  lieu: { titre: string; lien: string },
  auteur: string,
  corps: string,
) {
  const firstName = (name || "").split(" ")[0] || "";
  // Le corps vient d'un champ libre : on échappe avant de l'insérer, sinon un chevron dans
  // un message casserait la mise en page — ou pire.
  const echappe = corps
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  const auteurSur = auteur.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Nouveau message 💬</h1><p class="sub">${lieu.titre}</p></div><div class="bd"><p>${firstName ? `Bonjour ${firstName},` : "Bonjour,"}</p><p><strong>${auteurSur}</strong> vient d'écrire dans ${lieu.titre} :</p><div class="info"><p style="margin:0">${echappe}</p></div><p style="text-align:center"><a href="${SITE_URL}${lieu.lien}" class="btn">Lire et répondre</a></p><p class="muted">Pour ne pas encombrer votre boîte, ce rappel n'est envoyé qu'une fois toutes les trois heures, même si plusieurs messages se suivent : ouvrez le forum pour voir toute la discussion. Vous pouvez couper ces emails depuis votre profil.</p></div>`);
}

/**
 * Prévient les autres participants d'un forum qu'un message vient d'y être écrit.
 *
 * Une notification par PERSONNE et par forum toutes les trois heures — pas une par message.
 * C'est la décision qui compte ici : le forum de promotion réunit vingt-et-un étudiants, et
 * notifier chaque message aurait fait deux cents emails pour une discussion d'une dizaine de
 * réponses. Le coût n'est pas le vrai problème ; le vrai problème est qu'on n'écrit ce
 * volume qu'une fois. Ensuite les gens filtrent, se désabonnent ou signalent comme
 * indésirable — et ce qui se perd alors, ce sont les emails qui comptent : l'admission, la
 * correction d'un travail, le certificat. Une notification trop bavarde ne fait pas
 * qu'agacer, elle détruit le canal.
 *
 * Fenêtre glissante lue dans academy_emails plutôt que fenêtre fixe : un message à 14 h 59
 * suivi d'un autre à 15 h 01 ne doit pas produire deux emails simplement parce que l'heure
 * a changé.
 *
 * La clé de déduplication passée à sendAcademyEmail porte l'identifiant du message : sa
 * propre idempotence protège contre le double envoi d'un même message sans bloquer les
 * notifications suivantes.
 *
 * Silencieux par construction : ni l'auteur, ni les comptes non vérifiés, ni ceux qui ont
 * coupé les emails de cours. Aucune exception n'est levée vers l'appelant — un forum doit
 * accepter un message même quand la messagerie est en panne.
 */
async function notifierForum(opts: {
  /** Identifie le forum, pour la fenêtre de silence : « groupe:12 » ou « promo:2026-08 ». */
  portee: string;
  titre: string;
  lien: string;
  auteurId: number;
  auteurNom: string;
  corps: string;
  postId: number | undefined;
  /** Ids des participants. L'auteur en est retiré. Vide = toute la promotion admise. */
  destinataires: number[];
}): Promise<{ notifies: number }> {
  if (!resend) return { notifies: 0 };
  const cibles = opts.destinataires.filter(id => id !== opts.auteurId);
  if (!cibles.length) return { notifies: 0 };

  const { data: studs } = await supabase.from("students")
    .select("id, full_name, email, course_emails, email_verified, status")
    .in("id", cibles);

  const maintenant = Date.now();
  const seuil = new Date(maintenant - FENETRE_NOTIF_FORUM_MS).toISOString();
  let notifies = 0;

  for (const st of studs || []) {
    // Le dernier envoi POUR CE FORUM, dans la fenêtre. On ne lit la base que si la personne
    // passe déjà les autres critères : inutile d'interroger academy_emails pour quelqu'un
    // qui s'est désabonné.
    if (raisonDeNePasNotifier(st as any, opts.auteurId, null, maintenant)) continue;

    const { data: recent } = await supabase.from("academy_emails")
      .select("sent_at").eq("type", "forum_message").eq("email", st.email)
      .like("dedupe_key", `forum:${opts.portee}:%`)
      .gte("sent_at", seuil).order("sent_at", { ascending: false }).limit(1).maybeSingle();
    const dernier = recent?.sent_at ? new Date(recent.sent_at).getTime() : null;
    if (raisonDeNePasNotifier(st as any, opts.auteurId, dernier, maintenant)) continue;

    const r = await sendAcademyEmail({
      studentId: st.id, to: st.email, type: "forum_message",
      subject: `💬 ${opts.auteurNom} a écrit dans ${opts.titre}`,
      html: forumMessageEmailHtml(st.full_name, { titre: opts.titre, lien: opts.lien }, opts.auteurNom, opts.corps),
      dedupeKey: `forum:${opts.portee}:${st.id}:${opts.postId ?? "x"}`,
    });
    if (r.sent) notifies++;
  }
  return { notifies };
}

// ── Email : annonce du formateur à toute une promotion ──
function cohortAnnouncementEmailHtml(name: string, cohorte: string, corps: string) {
  const firstName = (name || "").split(" ")[0] || "";
  // Le corps vient d'un champ libre : on échappe avant de l'insérer dans le HTML, sinon un
  // chevron dans une consigne casserait la mise en page — ou pire.
  const echappe = corps
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Annonce à votre promotion 📣</h1><p class="sub">Promotion ${cohorte}</p></div><div class="bd"><p>${firstName ? `Bonjour ${firstName},` : "Bonjour,"}</p><div class="info"><p style="margin:0">${echappe}</p></div><p style="text-align:center"><a href="${SITE_URL}/academy/group-work" class="btn">Répondre sur le forum</a></p><p class="muted">Ce message a été adressé à toute votre promotion. Les échanges continuent sur le forum de la promotion, dans votre espace étudiant.</p></div>`);
}

// ── Email : admission remise à zéro pour retard ──
//
// Le ton compte plus que d'habitude. L'étudiant n'est pas renvoyé : son parcours est
// remis à zéro parce qu'il ne pouvait plus tenir dans sa fenêtre, et la porte reste
// ouverte immédiatement. Un message sec ferait perdre quelqu'un qui peut encore réussir.
// ── Email : une attestation attend une décision ──
//
// Destiné à l'exploitation. Il porte les trois chiffres sur lesquels la décision se
// prend — progression, moyenne, numéro — pour qu'elle puisse être prise sans ouvrir
// le dossier, et le lien pour le faire quand elle ne peut pas l'être.
function attestationAValiderEmailHtml(
  nom: string,
  cours: { code: string; title: string },
  certNo: string,
  score: number,
) {
  const esc = (t: string) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return academyEmailLayout(
    `<div class="hd">
       <div class="logo"><span>LOUISFARM LEARNING</span></div>
       <h1>Une attestation attend votre validation</h1>
       <p class="sub">${esc(cours.code)}</p>
     </div>
     <div class="bd">
       <p><strong>${esc(nom)}</strong> a terminé <strong>${esc(cours.title)}</strong> et demande son attestation.</p>
       <div class="info">
         <h3>Ce sur quoi décider</h3>
         <ul style="margin:10px 0 0;padding-left:18px;color:#6b7280;font-size:14px;line-height:1.7">
           <li>Cours achevé à 100&nbsp;%, adresse email confirmée — les deux conditions exigées avant la demande.</li>
           <li>Moyenne du cours&nbsp;: <strong>${esc(String(score))}&nbsp;%</strong></li>
           <li>Numéro réservé&nbsp;: <span style="font-family:monospace">${esc(certNo)}</span></li>
         </ul>
       </div>
       <p style="text-align:center"><a href="${SITE_URL}/pagesecure/students" class="btn">Ouvrir le dossier de l'étudiant</a></p>
       <p class="muted">Tant que la demande n'est pas validée, l'étudiant ne reçoit rien : il a terminé
       son cours et attend. Un refus se motive et lui est notifié ; il peut alors redemander.</p>
     </div>`
  );
}

/**
 * Le chemin du back-office, côté serveur.
 *
 * Doublon assumé de ADMIN_BASE dans client/src/lib/admin.ts : l'API ne peut pas importer un
 * module du client — ils ne sont pas compilés ensemble. La seule autre voie serait de le
 * poser dans shared/, ce qui l'exposerait dans le bundle du navigateur, exactement ce que le
 * renommage cherchait à éviter. Le doublon est donc le moindre mal ; il n'est utilisé que
 * dans des courriels envoyés à Louis.
 */
const ADMIN_SUPPORT_PATH = "/pagesecure/support";

/**
 * Email : une demande de support vient d'arriver.
 *
 * Le diagnostic est mis AVANT le message. Louis n'a pas besoin de reconstituer où en est
 * l'étudiant : la plateforme le savait au moment où la question a été posée, et c'est
 * souvent la réponse.
 */
function ticketAdminEmailHtml(
  nom: string,
  sujet: string,
  corps: string,
  constat: { titre: string; explication: string } | null,
  lien: string,
) {
  const esc = (t: string) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const diagnostic = constat
    ? `<div class="info">
         <h3>Ce que la plateforme voyait à cet instant</h3>
         <p style="margin:8px 0 0"><strong>${esc(constat.titre)}</strong></p>
         <p style="margin:6px 0 0;color:#6b7280;font-size:14px;line-height:1.7">${esc(constat.explication)}</p>
       </div>`
    : "";
  return academyEmailLayout(
    `<div class="hd">
       <div class="logo"><span>LOUISFARM LEARNING</span></div>
       <h1>${esc(sujet)}</h1>
       <p class="sub">Demande de ${esc(nom)}</p>
     </div>
     <div class="bd">
       <p style="white-space:pre-wrap">${esc(corps)}</p>
       ${diagnostic}
       <p style="text-align:center"><a href="${esc(lien)}" class="btn">Répondre dans le back-office</a></p>
       <p class="muted">Votre réponse arrive à l'étudiant par courriel et reste dans son espace.
       Si la question revient souvent, elle mérite un article du centre d'aide — le back-office
       permet de transformer une réponse en article.</p>
     </div>`
  );
}

/**
 * Email : la réponse de l'équipe à une demande de support.
 *
 * La question d'origine est rappelée sous la réponse. Une réponse reçue trois jours plus
 * tard, hors de son fil, est souvent incompréhensible sans elle — et l'étudiant ne se
 * souvient pas toujours de ce qu'il avait écrit.
 */
function reponseSupportEmailHtml(nom: string, sujet: string, corps: string, lien: string) {
  const esc = (t: string) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return academyEmailLayout(
    `<div class="hd">
       <div class="logo"><span>LOUISFARM LEARNING</span></div>
       <h1>Réponse à votre demande</h1>
       <p class="sub">${esc(sujet)}</p>
     </div>
     <div class="bd">
       <p>Bonjour ${esc(nom)},</p>
       <p style="white-space:pre-wrap">${esc(corps)}</p>
       <p style="text-align:center"><a href="${esc(lien)}" class="btn">Ouvrir mon espace</a></p>
       <p class="muted">Vous pouvez répondre depuis la fenêtre d'aide de votre espace : le fil
       de la demande y est conservé.</p>
     </div>`
  );
}

// ── Email : une tâche planifiée a échoué ──
//
// Destiné à l'exploitation, pas à un étudiant : ton sec, l'erreur brute, et les trois
// endroits où regarder. Un email d'alerte qui oblige à se souvenir de la marche à suivre
// arrive toujours au mauvais moment.
function tacheEchoueeEmailHtml(tache: string, erreur: string) {
  const esc = (t: string) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const quand = new Date().toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
  return academyEmailLayout(
    `<div class="hd" style="background:linear-gradient(135deg,#b91c1c,#7f1d1d)">
       <div class="logo"><span>LOUISFARM LEARNING</span></div>
       <h1>Tâche planifiée en échec</h1>
       <p class="sub">${esc(tache)}</p>
     </div>
     <div class="bd">
       <p>La tâche <strong>${esc(tache)}</strong> a échoué le ${esc(quand)}.</p>
       <div class="info" style="background:#fef2f2;border-color:#fecaca">
         <h3 style="color:#b91c1c">Erreur remontée</h3>
         <p style="font-family:monospace;font-size:13px;color:#7f1d1d;word-break:break-word">${esc(erreur)}</p>
       </div>
       <div class="info">
         <h3>Où regarder</h3>
         <ul style="margin:10px 0 0;padding-left:18px;color:#6b7280;font-size:14px;line-height:1.7">
           <li>Le journal des exécutions : table <code>cron_runs</code>, filtrée sur cette tâche.</li>
           <li>Les journaux de la fonction, onglet Logs du projet Vercel.</li>
           <li>L'état de la base Supabase, si l'erreur mentionne une table ou une requête.</li>
         </ul>
       </div>
       <p class="muted">Un seul message par tâche et par jour. Tant que l'échec se répète,
       ce rappel revient chaque jour — son absence signifie que la tâche est repassée au vert,
       ou qu'elle ne s'exécute plus du tout.</p>
     </div>`
  );
}

// ── Email : alerte de retard sur le rythme conseillé ──
//
// Ce message est le seul qui arrive AVANT la remise à zéro. Son texte n'est pas écrit ici
// mais dans shared/retard.ts, où le tableau de bord le lit aussi : l'écran et l'email
// annoncent forcément la même échéance. Ici, seule la mise en forme.
function retardEmailHtml(name: string, a: ReturnType<typeof alerteDeRetard>) {
  if (!a) return "";
  const esc = (t: string) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const firstName = (name || "").trim().split(" ")[0];
  const teinte = a.ton === "grave" ? "#b91c1c" : a.ton === "attention" ? "#b45309" : "#0d9488";
  const fond = a.ton === "grave" ? "#fef2f2" : a.ton === "attention" ? "#fffbeb" : "#f0fdfa";
  const bord = a.ton === "grave" ? "#fecaca" : a.ton === "attention" ? "#fde68a" : "#99f6e4";

  const compteur = a.joursAvantRemiseAZero > 0
    ? `<div class="code" style="background:${fond};border-color:${bord}">
         <p class="lbl">Il vous reste</p>
         <p class="val" style="color:${teinte};letter-spacing:2px">${a.joursAvantRemiseAZero} jour${a.joursAvantRemiseAZero > 1 ? "s" : ""}</p>
       </div>`
    : "";

  const liste = a.consequences.length
    ? `<div class="info" style="background:${fond};border-color:${bord}">
         <h3 style="color:${teinte}">Ce qu'une remise à zéro entraîne</h3>
         <ul style="margin:10px 0 0;padding-left:18px;color:#374151;font-size:14px;line-height:1.7">
           ${a.consequences.map(c => `<li>${esc(c)}</li>`).join("")}
         </ul>
       </div>
       <div class="info">
         <h3>Ce qu'elle ne touche pas</h3>
         <ul style="margin:10px 0 0;padding-left:18px;color:#6b7280;font-size:14px;line-height:1.7">
           ${a.conserve.map(c => `<li>${esc(c)}</li>`).join("")}
         </ul>
       </div>`
    : "";

  return academyEmailLayout(
    `<div class="hd" style="background:linear-gradient(135deg,${teinte},${teinte}dd)">
       <div class="logo"><span>LOUISFARM LEARNING</span></div>
       <h1>${esc(a.titre)}</h1>
       <p class="sub">${esc(a.resume)}</p>
     </div>
     <div class="bd">
       <p>${firstName ? `Bonjour ${esc(firstName)},` : "Bonjour,"}</p>
       ${a.paragraphes.map(t => `<p>${esc(t)}</p>`).join("")}
       ${compteur}
       ${liste}
       <p style="text-align:center"><a href="${SITE_URL}${a.action.href}" class="btn" style="background:${teinte}">${esc(a.action.libelle)}</a></p>
       <p class="muted">Vous pouvez répondre directement à cet email : il arrive dans une boîte lue par une personne.</p>
     </div>`
  );
}

/**
 * Email d'admission à un parcours.
 *
 * ── Ce qu'il dit du tarif, et comment ──
 *
 * Il l'annonce, sans en faire l'objet du message. L'étudiant vient de réussir un test ;
 * le sujet de l'email est cette réussite. Le tarif y figure comme un fait de calendrier —
 * ce qui se passera à la fin — au même rang que la date d'expiration de l'admission.
 *
 * C'est tout l'intérêt de l'annoncer tôt : à ce moment-là, dix mille francs contre huit
 * semaines de travail à venir est une information ; à la semaine huit, la même somme
 * découverte pour la première fois serait un piège. Le nombre ne change pas, le point de
 * comparaison si.
 *
 * Quand le parcours est gratuit, le bloc disparaît entièrement plutôt que d'afficher
 * « 0 F » : une gratuité qui s'annonce comme un prix n'en est plus une.
 */
function admissionParcoursEmailHtml(
  name: string, parcours: Program, score: number, expire: string | null,
) {
  const fin = expire
    ? new Date(expire).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const prix = parcours.prixAttestation;
  return academyEmailLayout(
    `<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div>`
    + `<h1>Vous êtes admis(e) 🎓</h1><p class="sub">${parcours.title}</p></div>`
    + `<div class="bd">`
    + `<span class="badge">✅ ${score}/${parcours.admission.nbQuestions} au test d'admission</span>`
    + `<p>Bonjour ${name},</p>`
    + `<p>Le parcours <strong>${parcours.title}</strong> vous est ouvert. Vos premières leçons `
    + `sont disponibles dès maintenant, au rythme d'${parcours.lessonsPerWeek === 1 ? "une leçon" : parcours.lessonsPerWeek + " leçons"} par semaine.</p>`
    + (parcours.credential
        ? `<div class="info"><p style="margin:0"><strong>À la clé :</strong> ${parcours.credential}</p></div>` : "")
    + (fin ? `<p class="muted">Votre admission court jusqu'au <strong>${fin}</strong>. Passé cette date, il faudra repasser le test.</p>` : "")
    + (prix > 0
        ? `<div class="info" style="border-color:#bfdbfe;background:#eff6ff">`
          + `<p style="margin:0"><strong>La formation est gratuite.</strong></p>`
          + `<p style="margin-top:6px;font-size:14px;color:#374151">À la fin du parcours, l'attestation vérifiable — `
          + `établie à votre nom, signée, avec son code de vérification — coûte `
          + `<strong>${prix.toLocaleString("fr-FR")} F CFA</strong>. Vous ne réglez rien avant de l'avoir terminé.</p></div>`
        : "")
    + `<p style="text-align:center"><a href="${SITE_URL}/academy/parcours/${parcours.id}" class="btn">Commencer le parcours</a></p>`
    + `</div>`);
}

function admissionResetEmailHtml(name: string, joursDeRetard: number, faites: number, total: number) {
  const firstName = (name || "").split(" ")[0] || "";
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Votre parcours repart de zéro</h1><p class="sub">Et vous pouvez recommencer dès aujourd'hui</p></div><div class="bd"><p>${firstName ? `Bonjour ${firstName},` : "Bonjour,"}</p><p>Votre parcours accusait <strong>${joursDeRetard} jours de retard</strong> sur le rythme conseillé (${faites} leçon${faites > 1 ? "s" : ""} validée${faites > 1 ? "s" : ""} sur ${total}). À ce stade, la fenêtre d'admission de trois mois qui vous restait ne permettait plus de terminer le cursus.</p><p>Plutôt que de vous laisser accumuler des échéances intenables, nous remettons votre parcours à zéro. <strong>Ce n'est pas une exclusion :</strong> vous pouvez repasser le test d'admission immédiatement, sans délai d'attente, et repartir avec la promotion suivante depuis la semaine 1 — avec un groupe de travail neuf.</p><div class="info"><p style="margin:0"><strong>Ce que vous gardez :</strong> vos notes et vos attestations déjà obtenues. Vous avez fait ce travail, il vous reste acquis.</p></div><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Repasser le test d'admission</a></p><p class="muted">Si quelque chose vous a empêché d'avancer et que nous pouvons aider, répondez simplement à cet email.</p></div>`);
}

// ── Email : le groupe est constitué ──
//
// Volontairement court. Il ne porte ni l'énoncé ni le modèle de rapport — ceux-là vivent
// dans le forum du groupe, où ils resteront trouvables dans trois semaines. Le message a
// un seul travail : dire QUI, et envoyer au bon endroit.
function groupFormedEmailHtml(
  name: string,
  groupe: { name: string; cohort: string },
  membres: { nom: string; email: string | null }[],
  gw: { title: string },
) {
  const firstName = (name || "").split(" ")[0] || "";
  const equipe = membres.map(m =>
    `<li>${m.nom}${m.email ? ` — <a href="mailto:${m.email}" style="color:#0d9488">${m.email}</a>` : ""}</li>`).join("");
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Votre groupe est constitué 👥</h1><p class="sub">${gw.title}</p></div><div class="bd"><span class="badge">👥 ${groupe.name} · ${membres.length} membres</span><p>${firstName ? `Bonjour ${firstName},` : "Bonjour,"}</p><p>Les équipes de <strong>${gw.title}</strong> viennent d'être tirées au sort. Voici la vôtre :</p><ul style="margin:0 0 14px 18px;padding:0;font-size:14px;color:#374151">${equipe}</ul><p>Votre espace de travail est ouvert : vous y trouvez le <strong>forum de votre groupe</strong>, l'<strong>énoncé de chaque projet</strong> et le <strong>modèle de rapport</strong> à remplir ensemble.</p><p style="text-align:center"><a href="${SITE_URL}/academy/group-work" class="btn">Ouvrir mon espace de groupe</a></p><p class="muted">Cette équipe vaut pour ce travail uniquement : les groupes sont retirés au sort avant chacun des trois projets. Écrivez-vous dès aujourd'hui — les groupes qui se parlent tout de suite sont ceux qui rendent dans les temps.</p></div>`);
}

// ── Email : un travail de groupe s'ouvre ──
// L'énoncé seul ne sert à rien : ce qui manque à l'étudiant, c'est de savoir AVEC QUI il
// travaille. Les coéquipiers et leurs adresses sont donc le cœur du message.
function groupWorkOpenedEmailHtml(
  name: string,
  gw: { title: string; brief?: string | null; deliverables?: any; max_score?: number },
  groupe: { name: string; cohort: string },
  membres: { nom: string; email: string | null }[],
  dueAt?: string,
) {
  const firstName = (name || "").split(" ")[0] || "";
  const livrables = Array.isArray(gw.deliverables) ? gw.deliverables : [];
  const equipe = membres.map(m => `<li>${m.nom}${m.email ? ` — <a href="mailto:${m.email}" style="color:#0d9488">${m.email}</a>` : ""}</li>`).join("");
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Travail de groupe ouvert 👥</h1><p class="sub">${gw.title}</p></div><div class="bd"><span class="badge">👥 ${groupe.name} · cohorte ${groupe.cohort}</span><p>${firstName ? `Bonjour ${firstName},` : "Bonjour,"}</p><p>Un travail collectif vient de s'ouvrir dans votre parcours. Un seul rendu est attendu <strong>pour tout le groupe</strong>, et la note est partagée par tous ses membres.</p>${gw.brief ? `<div class="info"><h3>${gw.title}</h3><p style="margin-top:6px">${gw.brief}</p></div>` : ""}${livrables.length ? `<p><strong>Livrables attendus :</strong></p><ul style="margin:0 0 12px 18px;padding:0;font-size:14px;color:#374151">${livrables.map((d: any) => `<li>${d}</li>`).join("")}</ul>` : ""}<p><strong>Votre groupe :</strong></p><ul style="margin:0 0 12px 18px;padding:0;font-size:14px;color:#374151">${equipe}</ul>${dueAt ? `<p><strong>À rendre avant le ${new Date(dueAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</strong> — vous avez deux semaines, prenez contact dès maintenant.</p>` : ""}<p style="text-align:center"><a href="${SITE_URL}/academy/group-work" class="btn">Voir le travail de groupe</a></p><p class="muted">Le premier réflexe utile : écrire à vos coéquipiers aujourd'hui et vous répartir les livrables. Un groupe qui se parle en semaine 1 rend dans les temps.</p></div>`);
}

// ── Email : rendu collectif corrigé ──
function groupWorkGradedEmailHtml(
  name: string,
  gw: { title: string },
  score: number,
  max: number,
  feedback: string | null,
) {
  const firstName = (name || "").split(" ")[0] || "";
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Travail de groupe corrigé 📝</h1><p class="sub">${gw.title}</p></div><div class="bd"><span class="badge">${pct >= 70 ? "✅ Validé" : "📝 Corrigé"}</span><p>${firstName ? `Bonjour ${firstName},` : "Bonjour,"}</p><p>Le rendu de votre groupe a été corrigé :</p><div class="info" style="text-align:center;border-color:#5eead4;background:#f0fdfa"><p style="margin:0;font-size:26px;font-weight:800;color:#0d9488">${score}/${max}</p><p style="margin-top:4px;font-size:12px;color:#6b7280">soit ${pct}%</p></div>${feedback ? `<p><strong>Commentaire du formateur :</strong></p><p style="font-size:14px;color:#374151">${feedback}</p>` : ""}<p>Cette note entre dans votre relevé et compte dans votre moyenne, au même titre qu'une évaluation individuelle.</p><p style="text-align:center"><a href="${SITE_URL}/academy/group-work" class="btn">Voir le détail</a></p></div>`);
}

// ── Email : demande d'attestation reçue (accusé) ──
function attestationRequestedEmailHtml(name: string, course: { code: string; title: string }, certNo: string, score: number) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Demande reçue 📋</h1><p class="sub">Votre attestation est en cours de validation</p></div><div class="bd"><span class="badge">⏳ En traitement</span><p>Bonjour ${name},</p><p>Nous avons bien reçu votre demande d'attestation pour le projet :</p><div class="info"><h3>${course.title}</h3><p style="margin-top:6px">Score final : <strong style="color:#0d9488">${score}%</strong></p><p style="margin-top:6px;font-size:12px;color:#6b7280">N° de certificat : <span style="font-family:monospace">${certNo}</span></p></div><p>Notre équipe vérifie votre parcours et validera votre attestation sous <strong>24 à 48 heures</strong>. Vous recevrez un email dès qu'elle sera émise.</p><p class="muted">Aucune action n'est requise de votre part pour le moment. Merci de votre patience.</p></div>`);
}

// ── Email : attestation émise (validée par l'admin) ──
function attestationIssuedEmailHtml(name: string, course: { code: string; title: string }, certNo: string, score: number) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Attestation délivrée ! 🎉</h1><p class="sub">Félicitations pour votre réussite</p></div><div class="bd"><span class="badge">🏆 Certifié</span><p>Bravo ${name},</p><p>Votre attestation de compétence est officiellement délivrée :</p><div class="info" style="text-align:center;border-color:#5eead4;background:#f0fdfa"><h3 style="color:#0d9488">${course.title}</h3><p style="margin-top:8px">Score final : <strong style="font-size:18px;color:#0d9488">${score}%</strong></p><p style="margin-top:10px;font-size:12px;color:#6b7280">Certificat N° <span style="font-family:monospace;font-weight:700">${certNo}</span></p></div><p>Vous pouvez désormais valoriser cette compétence dans votre CV, sur LinkedIn et auprès de vos employeurs. Ce certificat atteste de votre maîtrise pratique des outils MEAL.</p><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Voir mon attestation</a></p><p class="muted">Conservez votre numéro de certificat — il permet de vérifier l'authenticité de votre attestation.</p></div>`);
}

// ── Email : attestation refusée (complément requis) ──
function attestationRejectedEmailHtml(name: string, course: { code: string; title: string }) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Complément requis</h1><p class="sub">Votre attestation nécessite une vérification</p></div><div class="bd"><span class="badge">📝 À compléter</span><p>Bonjour ${name},</p><p>Après examen de votre demande d'attestation pour <strong>${course.title}</strong>, notre équipe a besoin que vous complétiez ou révisiez certains éléments du projet avant de pouvoir délivrer le certificat.</p><p>Reconnectez-vous à votre espace pour revoir le projet et le finaliser. Vous pourrez ensuite soumettre à nouveau votre demande.</p><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Revoir mon projet</a></p><p class="muted">Besoin d'aide ? Répondez simplement à cet email, nous vous accompagnerons.</p></div>`);
}


// ══════════════ Certificats téléchargeables (A4 paysage, signés) ══════════════
const SIGNATURE_B64 = "data:image/png;base64,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";

// ── Certificat en SVG autonome (pour conversion PDF fidèle) ──
/**
 * Décor du certificat. `withText: false` produit exactement le même dessin sans aucun
 * élément <text> : le rendu SVG→PNG dépend des polices du système, absentes du runtime
 * serverless, et tout le texte y sortait en carrés. Le texte est dessiné ensuite par
 * pdf-lib avec une police embarquée dans le PDF.
 */
function certificateSvg(opts: {
  name: string; type: "admission" | "final"; certNo: string;
  score?: number; issuedAt: string; expiresAt?: string | null;
}, withText: boolean = true): string {
  const txt = (markup: string) => (withText ? markup : "");
  const isFinal = opts.type === "final";
  const accent = isFinal ? "#7c3aed" : "#0d9488";
  const kicker = isFinal ? "SUPER-EXPERT MEAL" : "PROGRAMME MEAL · ADMISSION";
  const titleA = isFinal ? "Certificat" : "Attestation";
  const titleB = isFinal ? "de Réussite" : "d'Admission";
  const subtitle = isFinal
    ? "a complété avec succès l'intégralité du parcours par projets et démontré sa maîtrise opérationnelle du cycle MEAL."
    : "est admis(e) au programme de formation MEAL par projets de DataMEAL Academy.";
  const issued = new Date(opts.issuedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const expires = opts.expiresAt ? new Date(opts.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;
  const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const courses = [
    ["01", "KoboCollect", "Concevoir & déployer des enquêtes terrain"],
    ["02", "QGIS", "Cartographier & analyser les données spatiales"],
    ["03", "Pipeline MEAL", "Automatiser le reporting de bout en bout"],
  ];
  const courseCards = courses.map((co, i) => {
    const x = 90 + i * 510;
    return `<g transform="translate(${x},735)">
      <rect width="480" height="78" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>
      <rect width="5" height="78" rx="2.5" fill="${accent}"/>
      ${txt(`<text x="28" y="44" font-size="30" font-weight="800" fill="${accent}" opacity="0.45" font-family="Arial">${co[0]}</text>`)}
      ${txt(`<text x="74" y="36" font-size="22" font-weight="700" fill="#0f172a" font-family="Arial">${esc(co[1])}</text>`)}
      ${txt(`<text x="74" y="60" font-size="14" fill="#64748b" font-family="Arial">${esc(co[2])}</text>`)}
    </g>`;
  }).join("");

  const skills = isFinal
    ? "Compétences certifiées : collecte numérique, cartographie SIG, analyse Python, automatisation et reporting MEAL."
    : "Parcours couvrant la collecte de données (KoboCollect), la cartographie (QGIS) et l'automatisation du reporting MEAL.";

  // A4 paysage en px @ ~200dpi : 1684 x 1191
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1684" height="1191" viewBox="0 0 1684 1191" font-family="Arial, Helvetica, sans-serif">
    <defs>
      <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity="0.06"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>
      <linearGradient id="bg2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${accent}" stop-opacity="0.05"/><stop offset="1" stop-color="#0d9488" stop-opacity="0.04"/></linearGradient>
    </defs>
    <rect width="1684" height="1191" fill="#ffffff"/>
    <path d="M0 0 L340 0 L0 270 Z" fill="url(#bg1)"/>
    <path d="M1684 1191 L1010 1191 L1684 620 Z" fill="url(#bg2)"/>
    <circle cx="1520" cy="190" r="155" fill="none" stroke="${accent}" stroke-opacity="0.05" stroke-width="40"/>
    <path d="M0 960 Q420 850 850 990 T1684 950" fill="none" stroke="${accent}" stroke-opacity="0.08" stroke-width="3"/>
    <rect x="40" y="40" width="1604" height="1111" rx="22" fill="none" stroke="${accent}" stroke-opacity="0.25" stroke-width="3"/>

    <!-- header -->
    <g transform="translate(90,95)">
      <rect width="48" height="48" rx="12" fill="${accent}"/>
      ${txt(`<text x="24" y="34" font-size="26" font-weight="800" fill="#fff" text-anchor="middle">D</text>`)}
      ${txt(`<text x="64" y="22" font-size="22" font-weight="800" fill="#0f172a">DataMEAL Academy</text>`)}
      ${txt(`<text x="64" y="42" font-size="13" fill="#64748b" letter-spacing="2">FORMATION MEAL · AFRIQUE DE L'OUEST</text>`)}
    </g>
    <g transform="translate(1280,100)">
      <rect width="314" height="40" rx="20" fill="#f0fdfa" stroke="#99f6e4"/>
      ${txt(`<text x="157" y="26" font-size="14" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="3">${kicker}</text>`)}
    </g>

    ${opts.score != null ? `<g transform="translate(1470,250)"><circle r="62" fill="${isFinal ? "#faf5ff" : "#f0fdfa"}" stroke="${accent}" stroke-width="6"/>${txt(`<text y="-2" font-size="42" font-weight="800" fill="${accent}" text-anchor="middle">${opts.score}%</text>`)}${txt(`<text y="28" font-size="16" fill="#64748b" text-anchor="middle" letter-spacing="2">SCORE</text>`)}</g>` : ""}

    <!-- title -->
    ${txt(`<text x="90" y="330" font-size="86" font-weight="800" fill="#0f172a"><tspan fill="${accent}">${titleA}</tspan> ${titleB}</text>`)}
    ${txt(`<text x="92" y="400" font-size="20" fill="#64748b" letter-spacing="3">CE DOCUMENT CERTIFIE QUE</text>`)}
    ${txt(`<text x="90" y="500" font-size="72" font-weight="bold" fill="${isFinal ? "#6d28d9" : "#0f766e"}" font-family="Georgia, serif">${esc(opts.name)}</text>`)}
    <rect x="92" y="528" width="700" height="4" rx="2" fill="${accent}"/>
    ${txt(`<text x="92" y="588" font-size="24" fill="#334155">${esc(subtitle)}</text>`)}

    <!-- 3 cours -->
    ${courseCards}

    ${txt(`<text x="90" y="860" font-size="17" fill="#94a3b8" font-style="italic">${esc(skills)}</text>`)}

    <!-- footer : signature + meta + seal -->
    <g transform="translate(120,980)">
      <image href="${SIGNATURE_B64}" x="60" y="-110" height="130"/>
      <line x1="0" y1="20" x2="360" y2="20" stroke="#0f172a" stroke-width="2"/>
      ${txt(`<text x="0" y="48" font-size="22" font-weight="700" fill="#0f172a">TATCHIDA Issodo Louis</text>`)}
      ${txt(`<text x="0" y="72" font-size="15" fill="#64748b"><tspan fill="${accent}" font-weight="600">Ingénieur Agritech &amp; Data Science</tspan> · Finance agricole · Consultant</text>`)}
    </g>
    <g transform="translate(842,990)" text-anchor="middle">
      ${txt(`<text y="0" font-size="16" fill="#94a3b8">Délivré le ${esc(issued)}</text>`)}
      ${txt(`<text y="28" font-size="16" font-weight="600" fill="${expires ? "#d97706" : accent}">${expires ? "Valable jusqu'au " + esc(expires) : "Certification permanente"}</text>`)}
      ${txt(`<text y="56" font-size="15" fill="#94a3b8">Certificat N° <tspan font-family="monospace" font-weight="700" fill="${accent}">${esc(opts.certNo)}</tspan></text>`)}
      ${txt(`<text y="82" font-size="15" font-weight="600" fill="${accent}">Vérifiable sur louisfarm.com/academy/verify-certificate</text>`)}
    </g>

    <!-- QR de vérification.
         Dessiné hors de txt() : ce n'est pas du texte, donc il doit apparaître AUSSI dans le
         décor rasterisé du PDF (certificateSvg(opts, false)), sans quoi le PDF n'en aurait
         pas. Il occupe la bande libre entre le bloc de mentions, centré autour de x=842, et
         le sceau, qui commence à x=1408. -->
    ${qrSvg(urlVerification(SITE_URL, opts.certNo), { x: 1200, y: 940, taille: 150, couleur: "#0f172a" })}
    ${txt(`<text x="1275" y="1108" font-size="13" fill="#94a3b8" text-anchor="middle">Scanner pour vérifier</text>`)}
    <g transform="translate(1480,1010)">
      <circle r="72" fill="none" stroke="${accent}" stroke-width="3"/>
      <circle r="58" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle r="46" fill="${accent}"/>
      ${txt(`<text y="-4" font-size="15" font-weight="bold" fill="#fff" text-anchor="middle">DATAMEAL</text>`)}
      ${txt(`<text y="16" font-size="12" fill="#fff" text-anchor="middle">★ TOGO ★</text>`)}
      ${txt(`<text y="-58" font-size="11" font-weight="bold" fill="${accent}" text-anchor="middle">CERTIFIÉ</text>`)}
    </g>
  </svg>`;
}

// ── Génère le PDF du certificat ──
// Le décor passe par SVG→PNG, mais AUCUN texte : le rendu SVG dépend des polices du
// système, absentes du runtime serverless, et chaque glyphe y sortait en carré. Le texte
// est donc dessiné par pdf-lib avec des polices embarquées dans le fichier — il devient
// au passage vectoriel, sélectionnable et cherchable.
const FONT_DIR = path.join(process.cwd(), "api", "fonts");
let fontCache: { serif: Buffer; sans: Buffer; sansBold: Buffer } | null = null;
function certificateFonts() {
  if (!fontCache) {
    fontCache = {
      serif: fs.readFileSync(path.join(FONT_DIR, "serif-600.ttf")),
      sans: fs.readFileSync(path.join(FONT_DIR, "sans-400.ttf")),
      sansBold: fs.readFileSync(path.join(FONT_DIR, "sans-700.ttf")),
    };
  }
  return fontCache;
}

async function certificatePdf(opts: Parameters<typeof certificateSvg>[0]): Promise<Buffer> {
  // Chargés ici et pas en tête de fichier. L'API est UNE seule fonction serverless : tout ce
  // qui est importé au sommet est chargé à chaque démarrage à froid, y compris pour une
  // requête qui n'a rien à voir. pdf-lib, fontkit et leurs polices pèsent 2,45 Mo — mesurés —
  // sur les 5,7 Mo de la fonction, et ne servent qu'ici, quelques fois par mois. Les
  // basculer en import dynamique retire ce poids de la connexion, du tableau de bord et de
  // l'ouverture d'une leçon, qui eux arrivent tous les jours.
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const sharp = (await import("sharp")).default;

  const isFinal = opts.type === "final";
  const accent = isFinal ? rgb(0.486, 0.227, 0.929) : rgb(0.051, 0.580, 0.533);
  const slate900 = rgb(0.059, 0.090, 0.165);
  const slate600 = rgb(0.392, 0.455, 0.545);
  const slate400 = rgb(0.580, 0.639, 0.722);
  const slate700 = rgb(0.200, 0.255, 0.333);
  const amber = rgb(0.851, 0.467, 0.024);
  const white = rgb(1, 1, 1);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const f = certificateFonts();
  const serif = await pdf.embedFont(f.serif, { subset: true });
  const sans = await pdf.embedFont(f.sans, { subset: true });
  const bold = await pdf.embedFont(f.sansBold, { subset: true });

  const page = pdf.addPage([842, 595]);

  // Décor sans texte
  const png = await sharp(Buffer.from(certificateSvg(opts, false))).png().toBuffer();
  page.drawImage(await pdf.embedPng(png), { x: 0, y: 0, width: 842, height: 595 });

  // Le SVG mesure 1684×1191 pour une page de 842×595 points : le facteur est exactement
  // 1/2, et l'origine PDF est en bas à gauche.
  const K = 0.5;
  type Opt = { size: number; font?: any; color?: any; anchor?: "start" | "middle"; spacing?: number; opacity?: number };
  const draw = (sx: number, sy: number, text: string, o: Opt) => {
    if (!text) return;
    const font = o.font ?? sans;
    const size = o.size * K;
    const spacing = (o.spacing ?? 0) * K;
    const width = font.widthOfTextAtSize(text, size) + spacing * Math.max(0, text.length - 1);
    let x = sx * K - (o.anchor === "middle" ? width / 2 : 0);
    const y = 595 - sy * K;
    const common = { size, font, color: o.color ?? slate900, opacity: o.opacity };
    if (!spacing) { page.drawText(text, { x, y, ...common }); return; }
    // pdf-lib n'expose pas l'interlettrage : on avance caractère par caractère.
    for (const ch of text) {
      page.drawText(ch, { x, y, ...common });
      x += font.widthOfTextAtSize(ch, size) + spacing;
    }
  };

  const kicker = isFinal ? "SUPER-EXPERT MEAL" : "PROGRAMME MEAL · ADMISSION";
  const titleA = isFinal ? "Certificat" : "Attestation";
  const titleB = isFinal ? "de Réussite" : "d'Admission";
  const subtitle = isFinal
    ? "a complété avec succès l'intégralité du parcours par projets et démontré sa maîtrise opérationnelle du cycle MEAL."
    : "est admis(e) au programme de formation MEAL par projets de DataMEAL Academy.";
  const skills = isFinal
    ? "Compétences validées : KoboCollect · XLSForm · Python · pandas · QGIS · PyQGIS · Automatisation · Reporting MEAL"
    : "Programme : 3 projets terrain · KoboCollect, QGIS et pipeline de reporting automatisé";
  const issued = new Date(opts.issuedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const expires = opts.expiresAt ? new Date(opts.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

  // En-tête
  draw(90 + 24, 95 + 34, "D", { size: 26, font: bold, color: white, anchor: "middle" });
  draw(90 + 64, 95 + 22, "DataMEAL Academy", { size: 22, font: bold });
  draw(90 + 64, 95 + 42, "FORMATION MEAL · AFRIQUE DE L'OUEST", { size: 13, color: slate600, spacing: 2 });
  draw(1280 + 157, 100 + 26, kicker, { size: 14, font: bold, color: accent, anchor: "middle", spacing: 3 });

  // Pastille de score
  if (opts.score != null) {
    draw(1470, 250 - 2, `${opts.score}%`, { size: 42, font: bold, color: accent, anchor: "middle" });
    draw(1470, 250 + 28, "SCORE", { size: 16, color: slate600, anchor: "middle", spacing: 2 });
  }

  // Titre, en deux couleurs
  draw(90, 330, titleA, { size: 86, font: bold, color: accent });
  draw(90 + bold.widthOfTextAtSize(titleA, 86 * K) / K + 20, 330, titleB, { size: 86, font: bold });

  draw(92, 400, "CE DOCUMENT CERTIFIE QUE", { size: 20, color: slate600, spacing: 3 });
  draw(90, 500, opts.name, { size: 72, font: serif, color: isFinal ? rgb(0.427, 0.157, 0.851) : rgb(0.059, 0.463, 0.431) });
  draw(92, 588, subtitle, { size: 24, color: slate700 });

  // Les trois projets
  const courses = [
    ["01", "KoboCollect", "Concevoir & déployer des enquêtes terrain"],
    ["02", "QGIS", "Cartographier & analyser les données spatiales"],
    ["03", "Pipeline MEAL", "Automatiser le reporting de bout en bout"],
  ];
  courses.forEach((co, i) => {
    const x = 90 + i * 510;
    draw(x + 28, 735 + 44, co[0], { size: 30, font: bold, color: accent, opacity: 0.45 });
    draw(x + 74, 735 + 36, co[1], { size: 22, font: bold });
    draw(x + 74, 735 + 60, co[2], { size: 14, color: slate600 });
  });

  draw(90, 860, skills, { size: 17, color: slate400 });

  // Signature
  draw(120, 980 + 48, "TATCHIDA Issodo Louis", { size: 22, font: bold });
  draw(120, 980 + 72, "Ingénieur Agritech & Data Science", { size: 15, color: accent });
  draw(120 + sans.widthOfTextAtSize("Ingénieur Agritech & Data Science", 15 * K) / K + 8,
       980 + 72, "· Finance agricole · Consultant", { size: 15, color: slate600 });

  // Métadonnées
  draw(842, 990, `Délivré le ${issued}`, { size: 16, color: slate400, anchor: "middle" });
  draw(842, 990 + 28, expires ? `Valable jusqu'au ${expires}` : "Certification permanente",
       { size: 16, font: bold, color: expires ? amber : accent, anchor: "middle" });
  draw(842, 990 + 56, `Certificat N° ${opts.certNo}`, { size: 15, color: slate400, anchor: "middle" });
  draw(842, 990 + 82, "Vérifiable sur louisfarm.com/academy/verify-certificate",
       { size: 15, font: bold, color: accent, anchor: "middle" });

  // Sceau
  draw(1480, 1010 - 4, "DATAMEAL", { size: 15, font: bold, color: white, anchor: "middle" });
  draw(1480, 1010 + 16, "TOGO", { size: 12, color: white, anchor: "middle" });
  draw(1480, 1010 - 58, "CERTIFIÉ", { size: 11, font: bold, color: accent, anchor: "middle" });

  return Buffer.from(await pdf.save());
}

/**
 * Nom porté par un document officiel (attestation, certificat).
 *
 * Convention des documents administratifs d'Afrique de l'Ouest, celle de la signature
 * du certificat elle-même (« TATCHIDA Issodo Louis ») : NOM en capitales, puis les
 * prénoms. Tant que l'état civil décomposé n'est pas renseigné — comptes créés avant
 * son introduction — on retombe sur full_name plutôt que de deviner le découpage.
 */
function officialName(st: { first_name?: string | null; middle_name?: string | null; last_name?: string | null; full_name?: string | null }): string {
  const last = (st.last_name || "").trim();
  const first = (st.first_name || "").trim();
  const middle = (st.middle_name || "").trim();
  if (!last || !first) return (st.full_name || "").trim();
  return [last.toUpperCase(), first, middle].filter(Boolean).join(" ");
}

/** full_name affiché partout ailleurs (accueil, emails, admin), dérivé de l'état civil. */
function composeFullName(first?: string | null, middle?: string | null, last?: string | null): string | null {
  const parts = [first, middle, last].map(v => (v || "").trim()).filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

// ── Nom de fichier propre : Nom_Prenom_Type_ID.pdf ──
function certFileName(name: string, type: string, certNo: string): string {
  const clean = String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const kind = type === "final" ? "Certificat_Final" : "Attestation_Admission";
  return `${kind}_${clean}_${certNo}.pdf`;
}

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
  /* Le QR reprend la place et la taille qu'il occupe dans le SVG et le PDF : un même
     document doit se présenter pareil quel que soit le format téléchargé. */
  .qr { text-align:center; }
  .qr svg { width:22mm; height:22mm; display:block; }
  .qr span { display:block; margin-top:1.5mm; font-size:8px; color:#94a3b8; }
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
      <div class="qr">
        <svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">${qrSvg(urlVerification(SITE_URL, opts.certNo), { x: 0, y: 0, taille: 150 })}</svg>
        <span>Scanner pour vérifier</span>
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
    .select("full_name, first_name, middle_name, last_name, admitted_at, admission_expires, entry_score").eq("id", sid).single();
  if (!stud?.admitted_at) return res.status(403).send("Vous n'êtes pas encore admis(e).");
  const { data: cert } = await supabase.from("attestations")
    .select("certificate_no").eq("student_id", sid).eq("cert_type", "admission").maybeSingle();
  const opts = {
    name: officialName(stud), type: "admission" as const,
    certNo: cert?.certificate_no || `DMA-ADM-${sid}`,
    score: Math.round((stud.entry_score ?? 0) / 30 * 100),
    issuedAt: stud.admitted_at, expiresAt: stud.admission_expires,
  };
  // Aperçu HTML si demandé, sinon téléchargement PDF direct
  if (req.query.format === "html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(certificateHtml(opts));
  }
  try {
    const pdf = await certificatePdf(opts);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${certFileName(opts.name, "admission", opts.certNo)}"`);
    return res.send(pdf);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(certificateHtml(opts));
  }
});

// Certificat final (HTML téléchargeable)
app.get("/api/academy/certificate/final", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid;
  const { data: stud } = await supabase.from("students")
    .select("full_name, first_name, middle_name, last_name, final_certificate_no, final_certified_at").eq("id", sid).single();
  if (!stud?.final_certificate_no) return res.status(403).send(
    "Le certificat final s'obtient après les 3 cours du cursus ET la correction de vos travaux de groupe.");
  const { data: allGrades } = await supabase.from("grades").select("score, max_score").eq("student_id", sid);
  const ga = allGrades || [];
  const avg = ga.length ? Math.round(ga.reduce((a, g) => a + Number(g.score) / Number(g.max_score) * 100, 0) / ga.length) : 0;
  const opts = {
    name: officialName(stud), type: "final" as const,
    certNo: stud.final_certificate_no, score: avg, issuedAt: stud.final_certified_at,
  };
  if (req.query.format === "html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(certificateHtml(opts));
  }
  try {
    const pdf = await certificatePdf(opts);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${certFileName(opts.name, "final", opts.certNo)}"`);
    return res.send(pdf);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(certificateHtml(opts));
  }
});

function finalCertEmailHtml(name: string, certNo: string, avg: number) {
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Super-Expert MEAL ! 🎓</h1><p class="sub">Vous avez terminé les 3 projets</p></div><div class="bd"><span class="badge">🏆 Certificat final</span><p>Félicitations ${name},</p><p>Vous avez complété l'intégralité du programme LouisFarm Learning — KoboCollect, QGIS et Reporting automatisé. Vous êtes désormais <strong>Super-Expert MEAL</strong>.</p><div class="info" style="text-align:center;border-color:#5eead4;background:#f0fdfa"><p style="margin:0">Moyenne générale : <strong style="font-size:20px;color:#0d9488">${avg}%</strong></p><p style="margin-top:8px;font-size:12px;color:#6b7280">Certificat N° <span style="font-family:monospace;font-weight:700">${certNo}</span></p></div><p style="text-align:center"><a href="${SITE_URL}/academy/profile" class="btn">Télécharger mon certificat</a></p><p class="muted">Votre certificat A4 est téléchargeable depuis votre profil, signé et prêt à valoriser.</p></div>`);
}


// ── Email : admission réussie (félicitations + lien attestation) ──
function admissionPassedEmailHtml(name: string, scorePct: number, expiresIso: string, certUrl: string) {
  const expires = new Date(expiresIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>🎓 LOUISFARM LEARNING</span></div><h1>Félicitations, ${name.split(" ")[0]} ! 🎉</h1><p class="sub">Vous êtes officiellement admis(e)</p></div><div class="bd"><span class="badge">✅ Admission confirmée</span><p>Bonjour ${name},</p><p>Excellente nouvelle : vous avez réussi le test d'admission avec un score de <strong style="color:#0d9488">${scorePct}%</strong> et êtes désormais admis(e) au programme <strong>LouisFarm Learning</strong> !</p><div class="info" style="text-align:center;border-color:#5eead4;background:#f0fdfa"><p style="margin:0;font-size:14px">Votre attestation d'admission est prête</p><p style="margin-top:6px;font-size:12px;color:#6b7280">Valable jusqu'au ${expires}</p></div><p style="text-align:center"><a href="${certUrl}" class="btn">📄 Télécharger mon attestation (A4)</a></p><ul class="steps"><li><span class="n">1</span><span>Une leçon se débloque chaque semaine, dès aujourd'hui</span></li><li><span class="n">2</span><span>Vous avez une semaine par leçon (sinon recalé)</span></li><li><span class="n">3</span><span>Terminez les 3 projets pour décrocher le certificat final de Super-Expert MEAL</span></li></ul><p class="muted">Votre attestation est aussi téléchargeable à tout moment depuis votre profil. Bonne formation !</p></div>`);
}

// ── Vérification PUBLIQUE d'un certificat (style Credly, sans authentification) ──
app.get("/api/academy/verify-certificate/:certNo", rateLimit(30, 5 * 60 * 1000), async (req, res) => {
  const certNo = req.params.certNo;
  if (!certNo || certNo.length > 60) return res.status(400).json({ valid: false, message: "Numéro invalide." });

  // Chercher dans les attestations
  const { data: att } = await supabase.from("attestations")
    .select("certificate_no, cert_type, final_score, issued_at, expires_at, status, students(full_name, first_name, middle_name, last_name), sms_courses(code, title)")
    .eq("certificate_no", certNo).maybeSingle();

  // Chercher aussi le certificat final stocké sur l'étudiant
  let final: any = null;
  if (!att) {
    const { data: stud } = await supabase.from("students")
      .select("full_name, first_name, middle_name, last_name, final_certificate_no, final_certified_at").eq("final_certificate_no", certNo).maybeSingle();
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
      // Même nom que celui imprimé sur le document, sinon la vérification publique
      // semble désigner quelqu'un d'autre.
      holder: (att as any).students ? officialName((att as any).students) || "—" : "—",
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
    holder: officialName(final),
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
  return academyEmailLayout(`<div class="hd"><div class="logo"><span>📅 LOUISFARM LEARNING</span></div><h1>Rencontre en ligne planifiée</h1><p class="sub">${label}</p></div><div class="bd"><p>Bonjour ${name},</p><p>Une nouvelle ${label} est programmée :</p><div class="info" style="border-color:#5eead4;background:#f0fdfa"><p style="margin:0;font-size:15px;font-weight:700;color:#0d9488">${title}</p><p style="margin-top:8px;font-size:13px;color:#334155">🕒 ${when}</p></div><p style="text-align:center"><a href="${SITE_URL}/academy/dashboard" class="btn">Voir mes rencontres</a></p><p class="muted">Connectez-vous à votre tableau de bord pour rejoindre la session le moment venu. Aucun logiciel à installer — tout se passe dans le navigateur.</p></div>`);
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

/**
 * Normalise les diapositives reçues du client.
 *
 * Le support est stocké tel quel en base et projeté à tous les participants : on n'accepte
 * donc que des URL http(s), et on écarte tout le reste. Sans ce filtre, une URL `javascript:`
 * ou `data:` glissée dans la charge utile s'exécuterait dans la salle de tous les étudiants.
 */
function normaliserDiapositives(entree: any): { url: string; titre: string }[] | null {
  if (!Array.isArray(entree)) return null;
  return entree
    .map((d: any) => ({
      url: typeof d?.url === "string" ? d.url.trim() : "",
      titre: typeof d?.titre === "string" ? d.titre.trim().slice(0, 120) : "",
    }))
    .filter(d => /^https?:\/\//i.test(d.url))
    .slice(0, 100);
}

// ── Admin : créer une session ──
app.post("/api/admin/academy/meetings", requireAuth, async (req, res) => {
  const { title, description, kind, starts_at, duration_min, course_id } = req.body;
  const slides = normaliserDiapositives(req.body.slides) ?? [];
  if (!title || !starts_at) return res.status(400).json({ message: "Titre et date requis." });
  // room_name unique et difficile à deviner
  const slug = String(title).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const room_name = `datameal-${slug}-${crypto.randomBytes(4).toString("hex")}`;
  const { data, error } = await supabase.from("academy_meetings")
    .insert({ title, description, kind: kind || "meeting", starts_at, duration_min: duration_min || 60, course_id: course_id || null, room_name, status: "scheduled", slides, current_slide: 0 })
    .select().single();
  if (error) return res.status(400).json({ message: error.message });

  // Notifier les étudiants admis qui acceptent les emails
  try {
    const { data: students } = await supabase.from("students")
      .select("id, email, full_name, course_emails").not("admitted_at", "is", null);
    const recipients = (students || []).filter((s: any) => s.course_emails !== false && s.email);
    for (const s of recipients) {
      sendAcademyEmail({
        studentId: s.id, to: s.email, type: "meeting_scheduled",
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
  if (req.body.slides !== undefined) {
    const slides = normaliserDiapositives(req.body.slides);
    if (!slides) return res.status(400).json({ message: "slides doit être un tableau." });
    update.slides = slides;
    // Remplacer le support sans borner l'index projetterait une diapositive qui n'existe plus.
    update.current_slide = 0;
  }
  const { data, error } = await supabase.from("academy_meetings").update(update).eq("id", Number(req.params.id)).select().single();
  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
});

/**
 * Diapositive projetée — le présentateur écrit, les participants lisent.
 *
 * L'écriture exige une session d'administration : dans la salle, le contrôle du support ne
 * peut pas dépendre du rôle Jitsi, attribué au premier arrivé. Un étudiant qui rejoindrait
 * avant l'animateur pourrait sinon piloter la présentation de tout le monde.
 */
app.post("/api/admin/academy/meetings/:id/slide", requireAuth, async (req, res) => {
  const { data: m } = await supabase.from("academy_meetings")
    .select("slides").eq("id", Number(req.params.id)).maybeSingle();
  if (!m) return res.status(404).json({ message: "Session introuvable." });

  const total = Array.isArray(m.slides) ? m.slides.length : 0;
  if (!total) return res.status(400).json({ message: "Cette rencontre n'a pas de support." });

  // On borne au lieu de refuser : en fin de support, « suivant » ne doit pas afficher d'erreur
  // au présentateur en pleine séance, simplement ne rien faire.
  const demande = Number(req.body?.index);
  if (!Number.isFinite(demande)) return res.status(400).json({ message: "index requis." });
  const index = Math.min(total - 1, Math.max(0, Math.trunc(demande)));

  const { error } = await supabase.from("academy_meetings")
    .update({ current_slide: index }).eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ index, total });
});

/**
 * Consultation de l'état de projection, interrogée en boucle par les participants.
 * Réponse volontairement minimale : elle est demandée toutes les quelques secondes par
 * chaque personne présente, et renvoyer la session entière multiplierait la charge pour rien.
 */
app.get("/api/academy/meetings/:id/slide", requireStudent, async (req, res) => {
  const { data: m } = await supabase.from("academy_meetings")
    .select("current_slide, status").eq("id", Number(req.params.id)).maybeSingle();
  if (!m) return res.status(404).json({ message: "Session introuvable." });
  res.json({ index: m.current_slide ?? 0, status: m.status });
});

// ── Admin : supprimer une session ──
app.delete("/api/admin/academy/meetings/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("academy_meetings").delete().eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Supprimée" });
});

// ══════════════════════════════════════════════════════════════════════════════
//                            SUPPORT INTELLIGENT
// ══════════════════════════════════════════════════════════════════════════════
//
// Quatre niveaux, essayés dans l'ordre, et le premier qui sait répond :
//
//   1. le diagnostic   — la plateforme connaît l'état du dossier, donc la réponse exacte
//   2. la recherche    — les articles du centre d'aide, en français, dans PostgreSQL
//   3. l'action        — quand la réponse est un geste et non un texte
//   4. le ticket       — personne ne sait : la question part chez Louis avec son contexte
//
// Il n'y a pas de cinquième niveau. Sa place est réservée dans le protocole (le champ
// `niveau` de support_events accepte 5) mais aucun code ne l'appelle : rédiger une réponse
// demanderait un fournisseur de modèle de langage, donc un abonnement, et les questions
// observées ici sont déterministes — voir l'en-tête de shared/support.ts.

/**
 * Décode le jeton étudiant s'il y en a un, sans exiger qu'il y en ait un.
 *
 * Le centre d'aide est public : quelqu'un qui hésite à s'inscrire doit pouvoir lire comment
 * se passe l'admission. Mais s'il est connecté, il a droit à davantage d'articles et à un
 * diagnostic. Un garde tout-ou-rien obligerait à dédoubler chaque route.
 */
function etudiantOptionnel(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET) as any;
      if (decoded?.sid && decoded.role === "student") (req as any).studentOpt = Number(decoded.sid);
    } catch { /* jeton absent ou périmé : on continue en visiteur */ }
  }
  next();
}

/** Les articles qu'une personne a le droit de voir, du plus large au plus restreint. */
async function audiencesDe(sid: number | null): Promise<string[]> {
  if (!sid) return ["public"];
  const admis = await parcoursAdmis(sid);
  return admis.length ? ["public", "etudiant", "admis"] : ["public", "etudiant"];
}

/**
 * L'état du dossier, sous la forme que diagnostiquer() attend.
 *
 * Lecture SEULE, et c'est délibéré : refreshLessonStates() et refreshGroupWorkStates()
 * savent déjà calculer tout ceci, mais elles écrivent en base, constituent des groupes et
 * envoient des courriels. Ouvrir la fenêtre d'aide ne doit rien déclencher de tout cela —
 * un étudiant qui demande « pourquoi ma leçon est verrouillée ? » ne s'attend pas à ce que
 * la question forme un groupe.
 */
async function contexteSupport(sid: number, programId: string): Promise<ContexteSupport | null> {
  const parcours = programById(programId);
  if (!parcours) return null;

  const { data: st } = await supabase.from("students")
    .select("email_verified, admitted_at, admission_expires, test_attempts, next_test_allowed, final_certificate_no")
    .eq("id", sid).maybeSingle();
  if (!st) return null;

  // Le cursus MEAL est porté par les colonnes de `students`, les autres parcours par
  // academy_program_admissions — la même bifurcation que partout ailleurs.
  const surStudents = parcours.admission.surStudents;
  const pa = surStudents ? null : await admissionParcours(sid, programId);
  const admisAt   = surStudents ? st.admitted_at        : pa?.admitted_at ?? null;
  const expireAt  = surStudents ? st.admission_expires  : pa?.admission_expires ?? null;
  const prochain  = surStudents ? st.next_test_allowed  : pa?.next_test_allowed ?? null;
  const tentatives = Number((surStudents ? st.test_attempts : pa?.test_attempts) ?? 0);

  // Les leçons de CE parcours seulement.
  const { data: lps } = await supabase.from("lesson_progress")
    .select("unlock_at, status, sms_lessons(order_index, title), sms_courses(code, order_index)")
    .eq("student_id", sid);
  const duParcours = (lps || []).filter((l: any) => programOf(l.sms_courses?.code)?.id === programId);
  duParcours.sort((a: any, b: any) =>
    (a.sms_courses?.order_index ?? 0) - (b.sms_courses?.order_index ?? 0) ||
    (a.sms_lessons?.order_index ?? 0) - (b.sms_lessons?.order_index ?? 0));

  const indexProchaine = duParcours.findIndex((l: any) => l.status !== "completed");
  const brute: any = indexProchaine >= 0 ? duParcours[indexProchaine] : null;
  const prochaineLecon = brute ? {
    titre: brute.sms_lessons?.title ?? "la prochaine leçon",
    ouvertureAt: new Date(brute.unlock_at).getTime(),
    ouverte: brute.status !== "locked",
    // La leçon d'avant dans l'ordre du parcours : s'il n'y en a pas, la question ne se pose
    // pas et l'on considère le préalable rempli.
    precedenteTerminee: indexProchaine === 0
      ? true
      : duParcours[indexProchaine - 1].status === "completed",
  } : null;

  // Les travaux de groupe. `academy_group_works` ne porte pas de code de cours : les travaux
  // sont communs au dispositif, on ne les découpe donc pas par parcours.
  const { data: gwp } = await supabase.from("group_work_progress")
    .select("status").eq("student_id", sid);
  const travauxRestants = (gwp || []).filter((g: any) => g.status !== "completed").length;

  const { data: membre } = await supabase.from("academy_group_members")
    .select("id").eq("student_id", sid).limit(1);

  return {
    maintenant: Date.now(),
    parcours: parcours.title,
    leconsParSemaine: parcours.lessonsPerWeek,
    emailVerifie: !!st.email_verified,
    admisAt: admisAt ? new Date(admisAt).getTime() : null,
    admissionExpireAt: expireAt ? new Date(expireAt).getTime() : null,
    prochainTestAt: prochain ? new Date(prochain).getTime() : null,
    tentatives,
    prochaineLecon,
    aUnGroupe: !!membre?.length,
    travauxRestants,
    leconsToutesTerminees: duParcours.length > 0 && indexProchaine < 0,
    certificatDelivre: !!st.final_certificate_no,
  };
}

/**
 * Le parcours dont il faut parler.
 *
 * Celui que la page demande s'il est valide ; sinon le premier auquel l'étudiant est admis ;
 * sinon le cursus MEAL, qui est la porte d'entrée par défaut. Un étudiant inscrit à rien du
 * tout doit quand même obtenir un diagnostic — c'est précisément lui qui est bloqué.
 */
async function parcoursDuSupport(sid: number, demande?: string): Promise<string> {
  if (demande && programById(demande)) return demande;
  const admis = await parcoursAdmis(sid);
  return admis[0]?.programId ?? "meal";
}

/** Une trace, jamais bloquante : le support ne doit pas tomber parce qu'une mesure a raté. */
async function tracerSupport(e: {
  student_id?: number | null; genre: string; niveau?: number | null;
  question?: string; termes?: string; resultats?: number;
  article?: string; constat?: string; page?: string;
}) {
  await supabase.from("support_events").insert(e).then(() => {}, () => {});
}

async function chercherArticles(q: string, audiences: string[], n = 5) {
  const { data, error } = await supabase.rpc("support_chercher", { q, audiences, n });
  if (error) return [];
  return (data || []) as { slug: string; titre: string; resume: string; famille: string; rang: number; extrait: string }[];
}

// ── Niveau 1 : le diagnostic, sans question ─────────────────────────────────
// Ce que le widget montre à l'ouverture, avant que l'étudiant ait tapé quoi que ce soit.

app.get("/api/support/contexte", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid as number;
  const programId = await parcoursDuSupport(sid, String(req.query.parcours || ""));
  const ctx = await contexteSupport(sid, programId);
  if (!ctx) return res.status(404).json({ message: "Dossier introuvable." });

  const constats = diagnostiquer(ctx);
  res.json({
    parcours: { id: programId, titre: ctx.parcours },
    constats,
    // Ce qui bloque vraiment, mis en avant : c'est la seule ligne que beaucoup liront.
    principal: constats.find((c) => c.bloquant) ?? constats[0],
  });
});

// ── Niveaux 1 puis 2 : une question écrite ──────────────────────────────────

app.post("/api/support/question", rateLimit(30, 10 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid as number;
  const question = String(req.body?.question || "").trim().slice(0, 1000);
  const page = String(req.body?.page || "").slice(0, 200);
  if (!question) return res.status(400).json({ message: "La question est vide." });

  const programId = await parcoursDuSupport(sid, String(req.body?.parcours || ""));
  const ctx = await contexteSupport(sid, programId);
  const constats = ctx ? diagnostiquer(ctx) : [];
  const lu = repondre(question, constats);

  if (lu.niveau === 1) {
    await tracerSupport({
      student_id: sid, genre: "question", niveau: 1,
      question, constat: lu.constat.code, page,
    });
    return res.json({ niveau: 1, constat: lu.constat, articles: [] });
  }

  const audiences = await audiencesDe(sid);
  const articles = await chercherArticles(lu.termes || question, audiences);
  await tracerSupport({
    student_id: sid, genre: "question", niveau: articles.length ? 2 : 4,
    question, termes: lu.termes, resultats: articles.length, page,
  });

  // Aucun article : on ne renvoie pas une page vide, on propose d'écrire. C'est le niveau 4,
  // et c'est aussi la ligne qui alimentera la liste des articles à écrire.
  res.json({
    niveau: articles.length ? 2 : 4,
    sujet: intentionDe(question),
    articles,
    constat: null,
  });
});

// ── Niveau 2 : le centre d'aide ─────────────────────────────────────────────

app.get("/api/support/articles", etudiantOptionnel, async (req, res) => {
  const sid = ((req as any).studentOpt as number) ?? null;
  const audiences = await audiencesDe(sid);
  const q = String(req.query.q || "").trim().slice(0, 200);

  if (q) {
    const articles = await chercherArticles(q, audiences, 12);
    await tracerSupport({ student_id: sid, genre: "recherche", niveau: 2, termes: q, resultats: articles.length });
    return res.json({ recherche: q, articles });
  }

  const { data } = await supabase.from("support_articles")
    .select("slug, titre, resume, famille, ordre")
    .eq("publie", true).in("audience", audiences)
    .order("famille").order("ordre");
  res.json({ recherche: "", articles: data || [] });
});

app.get("/api/support/articles/:slug", etudiantOptionnel, async (req, res) => {
  const sid = ((req as any).studentOpt as number) ?? null;
  const audiences = await audiencesDe(sid);
  const { data } = await supabase.from("support_articles")
    .select("slug, titre, resume, contenu, famille, audience, utile, inutile")
    .eq("slug", String(req.params.slug)).eq("publie", true).maybeSingle();

  // Un article réservé aux étudiants demandé par un visiteur : 404 et non 403. Répondre
  // « existe mais pas pour vous » révélerait la carte des articles internes sans rien
  // apporter à personne.
  if (!data || !audiences.includes(data.audience)) {
    return res.status(404).json({ message: "Article introuvable." });
  }
  await tracerSupport({ student_id: sid, genre: "article_vu", article: data.slug });
  res.json(data);
});

/**
 * « Cela a-t-il répondu ? »
 *
 * Deux boutons, et c'est la mesure la plus utile du dispositif : elle dit quels articles
 * réécrire. Sans jeton non plus — un visiteur qui lit l'article sur l'admission a un avis
 * aussi valable qu'un étudiant.
 */
app.post("/api/support/articles/:slug/retour", rateLimit(40, 10 * 60 * 1000), etudiantOptionnel, async (req, res) => {
  const sid = ((req as any).studentOpt as number) ?? null;
  const utile = req.body?.utile === true;
  const slug = String(req.params.slug);

  const { data: a } = await supabase.from("support_articles")
    .select("id, utile, inutile").eq("slug", slug).maybeSingle();
  if (!a) return res.status(404).json({ message: "Article introuvable." });

  await supabase.from("support_articles")
    .update(utile ? { utile: (a.utile ?? 0) + 1 } : { inutile: (a.inutile ?? 0) + 1 })
    .eq("id", a.id);
  await tracerSupport({ student_id: sid, genre: utile ? "article_utile" : "article_inutile", article: slug });
  res.json({ message: "Merci." });
});

// ── Niveau 3 : les actions ──────────────────────────────────────────────────
//
// Quand la réponse est un geste. Une seule action pour l'instant, et volontairement : c'est
// celle des sept étudiants qui n'ont jamais validé leur adresse — le blocage le plus fréquent
// de la plateforme, et le seul qu'un bouton résout entièrement.

app.post("/api/support/action", rateLimit(6, 15 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid as number;
  const id = String(req.body?.id || "");

  if (id !== "renvoyer_verification") {
    return res.status(400).json({ message: "Action inconnue." });
  }

  const { data: st } = await supabase.from("students")
    .select("id, full_name, email, email_verified, verify_token, verify_code").eq("id", sid).maybeSingle();
  if (!st) return res.status(404).json({ message: "Compte introuvable." });
  if (st.email_verified) {
    // Pas une erreur : l'étudiant a validé entre-temps, souvent depuis un autre appareil.
    return res.json({ message: "Votre adresse est déjà validée.", dejaFait: true });
  }

  const token = st.verify_token || crypto.randomBytes(32).toString("hex");
  const code = st.verify_code || String(Math.floor(100000 + Math.random() * 900000));
  if (!st.verify_token || !st.verify_code) {
    await supabase.from("students").update({
      verify_token: token, verify_code: code,
      verify_expires: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    }).eq("id", sid);
  }

  await sendAcademyEmail({
    studentId: sid, type: "verify", to: st.email,
    subject: "Validez votre adresse — LouisFarm Learning",
    html: verifyEmailHtml(st.full_name || "", `${SITE_URL}/academy/verify?token=${token}`, code),
  });
  await tracerSupport({ student_id: sid, genre: "action", niveau: 3, constat: "adresse_non_verifiee" });
  res.json({ message: `Un nouveau lien vient de partir vers ${st.email}.` });
});

// ── Niveau 4 : le ticket ────────────────────────────────────────────────────

app.post("/api/support/tickets", rateLimit(5, 30 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid as number;
  const sujet = String(req.body?.sujet || "").trim().slice(0, 200);
  const corps = String(req.body?.message || "").trim().slice(0, 5000);
  const page = String(req.body?.page || "").slice(0, 200);
  if (!sujet || !corps) return res.status(400).json({ message: "Un sujet et un message sont nécessaires." });

  const { data: st } = await supabase.from("students")
    .select("full_name, email").eq("id", sid).maybeSingle();
  if (!st) return res.status(404).json({ message: "Compte introuvable." });

  // Le contexte est joint à la CRÉATION, pas à la lecture : c'est l'état au moment où la
  // question s'est posée qui l'explique. Relu trois jours plus tard, le dossier aura bougé
  // et la demande deviendra incompréhensible.
  const programId = await parcoursDuSupport(sid);
  const ctx = await contexteSupport(sid, programId);
  const constats = ctx ? diagnostiquer(ctx) : [];
  const principal = constats.find((c) => c.bloquant) ?? constats[0] ?? null;

  const { data: ticket, error } = await supabase.from("support_tickets").insert({
    student_id: sid, nom: st.full_name || "", email: st.email,
    sujet, page, constat: principal?.code ?? null,
    contexte: {
      parcours: programId,
      constats: constats.map((c) => ({ code: c.code, titre: c.titre, bloquant: c.bloquant })),
      admis: ctx?.admisAt != null,
      adresseValidee: ctx?.emailVerifie ?? null,
      travauxRestants: ctx?.travauxRestants ?? null,
    },
  }).select("id").single();
  if (error || !ticket) return res.status(400).json({ message: error?.message || "Création impossible." });

  await supabase.from("support_messages").insert({ ticket_id: ticket.id, auteur: "etudiant", corps });
  await tracerSupport({ student_id: sid, genre: "ticket", niveau: 4, question: sujet, constat: principal?.code, page });

  // La réponse part AVANT le courriel : l'étudiant n'a pas à attendre Resend pour voir que
  // sa demande est enregistrée. Même choix que les notifications du forum.
  res.status(201).json({ id: ticket.id, message: "Votre demande est enregistrée." });

  const alerte = process.env.ADMIN_ALERT_EMAIL;
  if (alerte) {
    await sendAcademyEmail({
      studentId: sid, type: "support_ticket", to: alerte,
      subject: `Support — ${sujet}`,
      html: ticketAdminEmailHtml(st.full_name || st.email, sujet, corps, principal, `${SITE_URL}${ADMIN_SUPPORT_PATH}`),
      dedupeKey: `support_ticket:${ticket.id}`,
    }).catch(() => {});
  }
});

app.get("/api/support/tickets", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid as number;
  const { data } = await supabase.from("support_tickets")
    .select("id, sujet, statut, created_at, updated_at")
    .eq("student_id", sid).order("created_at", { ascending: false }).limit(30);
  res.json(data || []);
});

app.get("/api/support/tickets/:id", requireStudent, async (req, res) => {
  const sid = (req as any).student.sid as number;
  // Le filtre sur student_id est dans la requête, pas dans une vérification qui suit : c'est
  // la seule barrière entre deux étudiants, et une barrière qu'on peut oublier d'écrire ne
  // vaut rien.
  const { data: t } = await supabase.from("support_tickets")
    .select("id, sujet, statut, created_at")
    .eq("id", Number(req.params.id)).eq("student_id", sid).maybeSingle();
  if (!t) return res.status(404).json({ message: "Demande introuvable." });

  const { data: messages } = await supabase.from("support_messages")
    .select("id, auteur, corps, created_at").eq("ticket_id", t.id).order("created_at");
  res.json({ ...t, messages: messages || [] });
});

app.post("/api/support/tickets/:id/messages", rateLimit(20, 10 * 60 * 1000), requireStudent, async (req, res) => {
  const sid = (req as any).student.sid as number;
  const corps = String(req.body?.message || "").trim().slice(0, 5000);
  if (!corps) return res.status(400).json({ message: "Le message est vide." });

  const { data: t } = await supabase.from("support_tickets")
    .select("id, sujet").eq("id", Number(req.params.id)).eq("student_id", sid).maybeSingle();
  if (!t) return res.status(404).json({ message: "Demande introuvable." });

  const { error } = await supabase.from("support_messages")
    .insert({ ticket_id: t.id, auteur: "etudiant", corps });
  if (error) return res.status(400).json({ message: error.message });

  // Une réponse de l'étudiant rouvre la demande : elle était peut-être « en attente ».
  await supabase.from("support_tickets")
    .update({ statut: "ouvert", updated_at: new Date().toISOString() }).eq("id", t.id);
  res.status(201).json({ message: "Envoyé." });
});

// ══════════════════════════════════════════════════════════════════════════════
//                    SUPPORT — CÔTÉ ADMINISTRATION
// ══════════════════════════════════════════════════════════════════════════════

/** La boîte des demandes. Le dossier de l'étudiant est déjà là : on ne le cherche pas. */
app.get("/api/admin/support/tickets", requireAuth, async (req, res) => {
  const statut = String(req.query.statut || "");
  let q = supabase.from("support_tickets")
    .select("id, student_id, nom, email, sujet, statut, priorite, page, constat, created_at, updated_at, first_reply_at")
    .order("created_at", { ascending: false }).limit(200);
  if (statut && ["ouvert", "en_attente", "resolu"].includes(statut)) q = q.eq("statut", statut);
  const { data, error } = await q;
  if (error) return res.status(400).json({ message: error.message });
  res.json(data || []);
});

app.get("/api/admin/support/tickets/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { data: t } = await supabase.from("support_tickets").select("*").eq("id", id).maybeSingle();
  if (!t) return res.status(404).json({ message: "Demande introuvable." });
  const { data: messages } = await supabase.from("support_messages")
    .select("id, auteur, corps, email_envoye, created_at").eq("ticket_id", id).order("created_at");
  res.json({ ...t, messages: messages || [] });
});

/**
 * Répondre. Le message est enregistré AVANT l'envoi du courriel et la réponse HTTP part
 * ensuite : une panne de Resend ne doit pas faire perdre une réponse déjà écrite, ni
 * laisser croire qu'elle n'a pas été enregistrée.
 */
app.post("/api/admin/support/tickets/:id/messages", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const corps = String(req.body?.message || "").trim().slice(0, 5000);
  const resoudre = req.body?.resoudre === true;
  if (!corps) return res.status(400).json({ message: "Le message est vide." });

  const { data: t } = await supabase.from("support_tickets")
    .select("id, student_id, nom, email, sujet, first_reply_at").eq("id", id).maybeSingle();
  if (!t) return res.status(404).json({ message: "Demande introuvable." });

  const { data: msg, error } = await supabase.from("support_messages")
    .insert({ ticket_id: id, auteur: "admin", corps }).select("id").single();
  if (error) return res.status(400).json({ message: error.message });

  const maintenant = new Date().toISOString();
  await supabase.from("support_tickets").update({
    statut: resoudre ? "resolu" : "en_attente",
    updated_at: maintenant,
    first_reply_at: t.first_reply_at ?? maintenant,
    closed_at: resoudre ? maintenant : null,
  }).eq("id", id);

  res.status(201).json({ message: resoudre ? "Répondu et clos." : "Réponse envoyée." });

  if (t.email) {
    const r = await sendAcademyEmail({
      studentId: t.student_id ?? null, type: "support_reponse", to: t.email,
      subject: `Réponse — ${t.sujet}`,
      html: reponseSupportEmailHtml(t.nom || "", t.sujet, corps, `${SITE_URL}/academy/dashboard`),
    }).catch(() => ({ sent: false }));
    if (r.sent && msg) {
      await supabase.from("support_messages").update({ email_envoye: true }).eq("id", msg.id)
        .then(() => {}, () => {});
    }
  }
});

app.put("/api/admin/support/tickets/:id", requireAuth, async (req, res) => {
  const maj: any = { updated_at: new Date().toISOString() };
  const statut = String(req.body?.statut || "");
  const priorite = String(req.body?.priorite || "");
  if (["ouvert", "en_attente", "resolu"].includes(statut)) {
    maj.statut = statut;
    maj.closed_at = statut === "resolu" ? new Date().toISOString() : null;
  }
  if (["basse", "normale", "haute"].includes(priorite)) maj.priorite = priorite;

  const { error } = await supabase.from("support_tickets").update(maj).eq("id", Number(req.params.id));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Mis à jour." });
});

// ── Les articles ────────────────────────────────────────────────────────────

app.get("/api/admin/support/articles", requireAuth, async (_req, res) => {
  const { data, error } = await supabase.from("support_articles")
    .select("id, slug, titre, resume, contenu, famille, audience, publie, ordre, utile, inutile, updated_at")
    .order("famille").order("ordre");
  if (error) return res.status(400).json({ message: error.message });
  res.json(data || []);
});

app.post("/api/admin/support/articles", requireAuth, async (req, res) => {
  const b = req.body || {};
  const slug = String(b.slug || "").trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!slug || !String(b.titre || "").trim()) {
    return res.status(400).json({ message: "Un identifiant et un titre sont nécessaires." });
  }
  const ligne = {
    slug, titre: String(b.titre).trim().slice(0, 200),
    resume: String(b.resume || "").trim().slice(0, 400),
    contenu: String(b.contenu || "").slice(0, 20000),
    famille: String(b.famille || "compte"),
    audience: ["public", "etudiant", "admis"].includes(b.audience) ? b.audience : "public",
    publie: b.publie !== false,
    ordre: Number(b.ordre) || 0,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("support_articles")
    .upsert(ligne, { onConflict: "slug" }).select("slug").single();
  if (error) return res.status(400).json({ message: error.message });
  res.json({ slug: data.slug, message: "Enregistré." });
});

app.delete("/api/admin/support/articles/:slug", requireAuth, async (req, res) => {
  const { error } = await supabase.from("support_articles").delete().eq("slug", String(req.params.slug));
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: "Supprimé." });
});

/**
 * Les mesures, et surtout la liste des questions restées sans réponse.
 *
 * C'est cette liste qui fait vivre la base de connaissances : sans elle, le centre d'aide
 * répondrait indéfiniment aux questions qu'on a imaginées plutôt qu'à celles qu'on nous
 * pose. Les recherches infructueuses sont donc regroupées et classées par fréquence — c'est
 * une liste de travail, pas un journal.
 */
app.get("/api/admin/support/mesures", requireAuth, async (req, res) => {
  const jours = Math.min(365, Math.max(7, Number(req.query.jours) || 30));
  const depuis = new Date(Date.now() - jours * 24 * 3600 * 1000).toISOString();

  const [evts, tickets, articles] = await Promise.all([
    supabase.from("support_events").select("genre, niveau, termes, question, resultats, article, created_at")
      .gte("created_at", depuis).limit(5000),
    supabase.from("support_tickets").select("statut, created_at, first_reply_at").gte("created_at", depuis),
    supabase.from("support_articles").select("slug, titre, utile, inutile"),
  ]);
  const e = evts.data || [];
  const t = tickets.data || [];

  const questions = e.filter((x: any) => x.genre === "question");
  const parNiveau = [1, 2, 3, 4].map((n) => ({
    niveau: n, nombre: questions.filter((x: any) => x.niveau === n).length,
  }));
  const repondues = questions.filter((x: any) => x.niveau != null && x.niveau <= 3).length;

  // Les recherches sans résultat, regroupées sur le texte normalisé.
  const sansReponse = new Map<string, { terme: string; nombre: number; dernier: string }>();
  for (const x of e as any[]) {
    const vide = (x.genre === "recherche" && x.resultats === 0)
              || (x.genre === "question" && x.niveau === 4);
    if (!vide) continue;
    const brut = String(x.termes || x.question || "").trim();
    if (!brut) continue;
    const cle = brut.toLowerCase();
    const dejaLa = sansReponse.get(cle);
    if (dejaLa) { dejaLa.nombre++; if (x.created_at > dejaLa.dernier) dejaLa.dernier = x.created_at; }
    else sansReponse.set(cle, { terme: brut, nombre: 1, dernier: x.created_at });
  }

  const delais = t.filter((x: any) => x.first_reply_at)
    .map((x: any) => new Date(x.first_reply_at).getTime() - new Date(x.created_at).getTime());

  res.json({
    jours,
    questions: questions.length,
    // Part résolue sans intervention humaine. `null` plutôt que 0 % quand rien n'a encore
    // été demandé : un taux calculé sur zéro question ne veut rien dire et se lirait comme
    // un échec.
    partAutonome: questions.length ? Math.round((repondues / questions.length) * 100) : null,
    parNiveau,
    tickets: {
      total: t.length,
      ouverts: t.filter((x: any) => x.statut === "ouvert").length,
      resolus: t.filter((x: any) => x.statut === "resolu").length,
      delaiMedianHeures: delais.length
        ? Math.round(delais.sort((a, b) => a - b)[Math.floor(delais.length / 2)] / 3600000)
        : null,
    },
    sansReponse: [...sansReponse.values()].sort((a, b) => b.nombre - a.nombre).slice(0, 25),
    articles: (articles.data || [])
      .map((a: any) => ({ ...a, total: (a.utile || 0) + (a.inutile || 0) }))
      .filter((a: any) => a.total > 0)
      .sort((a: any, b: any) => (b.inutile - b.utile) - (a.inutile - a.utile))
      .slice(0, 15),
  });
});

export default app;
