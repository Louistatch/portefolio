import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "Louis TATCHIDA <onboarding@resend.dev>";
const SITE_URL = process.env.SITE_URL || "https://portefolio-louistatchs-projects.vercel.app";

function isConfigured(): boolean {
  return !!resend;
}

// ── Welcome email ──
export async function sendWelcomeEmail(to: string, name?: string) {
  if (!isConfigured()) return;
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  try {
    await resend!.emails.send({
      from: FROM_EMAIL, to, subject: "Bienvenue dans la communauté — Louis TATCHIDA",
      html: welcomeTemplate(greeting),
    });
  } catch (err) { console.error("Welcome email error:", err); }
}

// ── New publication notification ──
export async function sendPublicationNotification(
  subscribers: { email: string; name?: string }[],
  post: { title: string; slug: string; summary?: string; image_url?: string }
) {
  if (!isConfigured() || !subscribers.length) return;
  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50).map(s => ({
      from: FROM_EMAIL, to: s.email,
      subject: `Nouvelle publication : ${post.title}`,
      html: publicationTemplate(s.name, post),
    }));
    try { await resend!.batch.send(batch); } catch (err) { console.error("Publication notification error:", err); }
  }
}

// ── Campaign email ──
export async function sendCampaignEmail(
  subscribers: { email: string; name?: string }[],
  subject: string, content: string
) {
  if (!isConfigured() || !subscribers.length) return;
  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50).map(s => ({
      from: FROM_EMAIL, to: s.email, subject,
      html: campaignTemplate(s.name, subject, content),
    }));
    try { await resend!.batch.send(batch); } catch (err) { console.error("Campaign email error:", err); }
  }
  return subscribers.length;
}


// ══════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════

const PHOTO_URL = "https://gcfcdkzmfybiigbnlwvb.supabase.co/storage/v1/object/public/images/332d9e01-a89e-49f4-b078-60b4a133aa0a.jpeg";

function baseLayout(content: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.container{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)}.header{background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 32px;text-align:center}.header h1{color:#fff;font-size:24px;margin:0;font-weight:700}.header p{color:rgba(255,255,255,.85);font-size:14px;margin:8px 0 0}.avatar{width:64px;height:64px;border-radius:50%;border:3px solid #fff;object-fit:cover;margin-bottom:12px}.body{padding:32px}.body p{color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px}.cta{display:inline-block;background:#16a34a;color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;margin:8px 0 24px}.card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:16px 0}.card h3{color:#111;font-size:17px;margin:0 0 8px}.card p{color:#6b7280;font-size:14px;margin:0}.card img{width:100%;height:200px;object-fit:cover;border-radius:8px;margin-bottom:12px}.footer{padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb}.footer p{color:#9ca3af;font-size:12px;margin:0 0 4px}.footer a{color:#16a34a;text-decoration:none}.divider{height:1px;background:#e5e7eb;margin:24px 0}.badge{display:inline-block;background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:16px}</style></head><body><div class="container">${content}<div class="footer"><img src="${PHOTO_URL}" alt="Louis TATCHIDA" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-bottom:8px"><p>Louis TATCHIDA — Agronome & Expert Finance Agricole</p><p>Lomé, Togo · <a href="mailto:tatchida@gmail.com">tatchida@gmail.com</a></p><p style="margin-top:12px"><a href="${SITE_URL}">Site</a> · <a href="${SITE_URL}/publications">Publications</a> · <a href="${SITE_URL}/blog">Blog</a></p><p style="margin-top:16px;font-size:11px;color:#d1d5db">Vous recevez cet email car vous êtes abonné(e) à la newsletter.</p></div></div></body></html>`;
}

function welcomeTemplate(greeting: string) {
  return baseLayout(`<div class="header"><img src="${PHOTO_URL}" alt="Louis TATCHIDA" class="avatar"><h1>Bienvenue dans la communauté !</h1><p>Newsletter de Louis TATCHIDA</p></div><div class="body"><span class="badge">✨ Nouveau membre</span><p>${greeting}</p><p>Merci de rejoindre ma communauté de professionnels passionnés par le développement agricole durable en Afrique de l'Ouest.</p><div class="card"><h3>📄 Nouvelles publications</h3><p>Notification dès qu'un nouvel article est publié.</p></div><div class="card"><h3>📊 Analyses exclusives</h3><p>Décryptages sur la finance agricole et la digitalisation rurale.</p></div><div class="card"><h3>🌍 Actualités terrain</h3><p>Retours d'expérience de mes missions au Togo et en Afrique de l'Ouest.</p></div><div class="divider"></div><p style="text-align:center"><a href="${SITE_URL}/publications" class="cta">Voir les publications</a></p><p>À très bientôt,<br><strong>Louis TATCHIDA</strong></p></div>`);
}

function publicationTemplate(name: string | undefined, post: { title: string; slug: string; summary?: string; image_url?: string }) {
  const g = name ? `Bonjour ${name},` : "Bonjour,";
  const img = post.image_url ? `<img src="${post.image_url}" alt="${post.title}">` : "";
  return baseLayout(`<div class="header"><img src="${PHOTO_URL}" alt="Louis TATCHIDA" class="avatar"><h1>Nouvelle Publication</h1><p>Louis TATCHIDA vient de publier un nouvel article</p></div><div class="body"><span class="badge">📝 Nouveau contenu</span><p>${g}</p><p>Un nouvel article vient d'être publié :</p><div class="card">${img}<h3>${post.title}</h3>${post.summary ? `<p>${post.summary}</p>` : ""}</div><p style="text-align:center"><a href="${SITE_URL}/blog/${post.slug}" class="cta">Lire l'article</a></p><p>Bonne lecture,<br><strong>Louis TATCHIDA</strong></p></div>`);
}

function campaignTemplate(name: string | undefined, subject: string, content: string) {
  const g = name ? `Bonjour ${name},` : "Bonjour,";
  const html = content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
  return baseLayout(`<div class="header"><img src="${PHOTO_URL}" alt="Louis TATCHIDA" class="avatar"><h1>${subject}</h1><p>Newsletter de Louis TATCHIDA</p></div><div class="body"><p>${g}</p><p>${html}</p><div class="divider"></div><p style="text-align:center"><a href="${SITE_URL}" class="cta">Visiter le site</a></p><p>Cordialement,<br><strong>Louis TATCHIDA</strong></p></div>`);
}
