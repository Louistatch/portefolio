import nodemailer from "nodemailer";

// ── Gmail SMTP Configuration ──
// Requires: 2FA enabled on Google account + App Password generated
// Generate at: https://myaccount.google.com/apppasswords
const GMAIL_USER = process.env.GMAIL_USER || "tatchida@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const FROM_EMAIL = `Louis TATCHIDA <${GMAIL_USER}>`;
const SITE_URL = process.env.SITE_URL || "https://portefolio-louistatchs-projects.vercel.app";

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

function isConfigured(): boolean {
  return !!GMAIL_APP_PASSWORD && GMAIL_APP_PASSWORD.length > 0;
}

// ── Welcome email ──
export async function sendWelcomeEmail(to: string, name?: string) {
  if (!isConfigured()) return;
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: "Bienvenue dans la communauté — Louis TATCHIDA",
      html: welcomeTemplate(greeting),
    });
  } catch (err) {
    console.error("Welcome email error:", err);
  }
}

// ── New publication notification ──
export async function sendPublicationNotification(
  subscribers: { email: string; name?: string }[],
  post: { title: string; slug: string; summary?: string; image_url?: string }
) {
  if (!isConfigured() || !subscribers.length) return;

  const transporter = createTransporter();
  // Send one by one to avoid Gmail rate limits (max ~100/day for free accounts)
  for (const sub of subscribers) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: sub.email,
        subject: `Nouvelle publication : ${post.title}`,
        html: publicationTemplate(sub.name, post),
      });
    } catch (err) {
      console.error(`Publication notification error for ${sub.email}:`, err);
    }
  }
}

// ── Campaign email ──
export async function sendCampaignEmail(
  subscribers: { email: string; name?: string }[],
  subject: string,
  content: string
) {
  if (!isConfigured() || !subscribers.length) return;

  const transporter = createTransporter();
  for (const sub of subscribers) {
    try {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: sub.email,
        subject,
        html: campaignTemplate(sub.name, subject, content),
      });
    } catch (err) {
      console.error(`Campaign email error for ${sub.email}:`, err);
    }
  }
  return subscribers.length;
}


// ══════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:32px;margin-bottom:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
  .header{background:linear-gradient(135deg,#16a34a,#15803d);padding:40px 32px;text-align:center}
  .header h1{color:#fff;font-size:24px;margin:0;font-weight:700}
  .header p{color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0}
  .body{padding:32px}
  .body p{color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px}
  .cta{display:inline-block;background:#16a34a;color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;margin:8px 0 24px}
  .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:16px 0}
  .card h3{color:#111827;font-size:17px;margin:0 0 8px}
  .card p{color:#6b7280;font-size:14px;margin:0}
  .card img{width:100%;height:200px;object-fit:cover;border-radius:8px;margin-bottom:12px}
  .footer{padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb}
  .footer p{color:#9ca3af;font-size:12px;margin:0 0 4px}
  .footer a{color:#16a34a;text-decoration:none}
  .divider{height:1px;background:#e5e7eb;margin:24px 0}
  .badge{display:inline-block;background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:16px}
</style>
</head>
<body>
<div class="container">
${content}
<div class="footer">
  <p>Louis TATCHIDA — Agronome & Expert Finance Agricole</p>
  <p>Lomé, Togo · <a href="mailto:tatchida@gmail.com">tatchida@gmail.com</a></p>
  <p style="margin-top:12px"><a href="${SITE_URL}">Visiter le site</a> · <a href="${SITE_URL}/publications">Publications</a> · <a href="${SITE_URL}/blog">Blog</a></p>
  <p style="margin-top:16px;font-size:11px;color:#d1d5db">Vous recevez cet email car vous êtes abonné(e) à la newsletter de Louis TATCHIDA.</p>
</div>
</div>
</body>
</html>`;
}

function welcomeTemplate(greeting: string) {
  return baseLayout(`
<div class="header">
  <h1>Bienvenue dans la communauté !</h1>
  <p>Newsletter de Louis TATCHIDA</p>
</div>
<div class="body">
  <span class="badge">✨ Nouveau membre</span>
  <p>${greeting}</p>
  <p>Merci de rejoindre ma communauté de professionnels passionnés par le développement agricole durable en Afrique de l'Ouest.</p>
  <p>En tant qu'abonné(e), vous recevrez :</p>
  <div class="card">
    <h3>📄 Nouvelles publications</h3>
    <p>Soyez notifié(e) dès qu'un nouvel article ou une nouvelle pensée scientifique est publiée.</p>
  </div>
  <div class="card">
    <h3>📊 Analyses exclusives</h3>
    <p>Décryptages sur la finance agricole, la résilience climatique et la digitalisation rurale.</p>
  </div>
  <div class="card">
    <h3>🌍 Actualités terrain</h3>
    <p>Retours d'expérience de mes missions au Togo et en Afrique de l'Ouest.</p>
  </div>
  <div class="divider"></div>
  <p>En attendant, découvrez mes dernières publications :</p>
  <p style="text-align:center"><a href="${SITE_URL}/publications" class="cta">Voir les publications</a></p>
  <p>À très bientôt,<br><strong>Louis TATCHIDA</strong><br><em>Agronome & Expert en Finance Agricole</em></p>
</div>`);
}

function publicationTemplate(name: string | undefined, post: { title: string; slug: string; summary?: string; image_url?: string }) {
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  const imageHtml = post.image_url ? `<img src="${post.image_url}" alt="${post.title}">` : "";

  return baseLayout(`
<div class="header">
  <h1>Nouvelle Publication</h1>
  <p>Louis TATCHIDA vient de publier un nouvel article</p>
</div>
<div class="body">
  <span class="badge">📝 Nouveau contenu</span>
  <p>${greeting}</p>
  <p>Un nouvel article vient d'être publié sur mon site. Je pense qu'il pourrait vous intéresser :</p>
  <div class="card">
    ${imageHtml}
    <h3>${post.title}</h3>
    ${post.summary ? `<p>${post.summary}</p>` : ""}
  </div>
  <p style="text-align:center"><a href="${SITE_URL}/blog/${post.slug}" class="cta">Lire l'article complet</a></p>
  <p>N'hésitez pas à laisser un commentaire et à partager avec votre réseau !</p>
  <p>Bonne lecture,<br><strong>Louis TATCHIDA</strong></p>
</div>`);
}

function campaignTemplate(name: string | undefined, subject: string, content: string) {
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  const htmlContent = content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");

  return baseLayout(`
<div class="header">
  <h1>${subject}</h1>
  <p>Newsletter de Louis TATCHIDA</p>
</div>
<div class="body">
  <p>${greeting}</p>
  <p>${htmlContent}</p>
  <div class="divider"></div>
  <p style="text-align:center"><a href="${SITE_URL}" class="cta">Visiter le site</a></p>
  <p>Cordialement,<br><strong>Louis TATCHIDA</strong></p>
</div>`);
}
