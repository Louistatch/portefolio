import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  User, Loader2, Save, Lock, Mail, CheckCircle2, AlertCircle,
  ArrowLeft, Bell, BellOff, Award, Download, FileText, TrendingUp,
} from "lucide-react";
import { studentFetch, isStudentLoggedIn, setStudent, getStudent, getStudentToken } from "@/lib/student";

const INTERESTS = ["KoboCollect", "Python", "QGIS", "Analyse de données", "Cartographie", "Reporting", "Évaluation", "Nutrition", "WASH", "Sécurité alimentaire"];
const LEVELS = [{ v: "debutant", l: "Débutant" }, { v: "intermediaire", l: "Intermédiaire" }, { v: "avance", l: "Avancé" }];

export default function AcademyProfile() {
  const [, navigate] = useLocation();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState("");
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [transcript, setTranscript] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<any>(null);

  useEffect(() => {
    if (!isStudentLoggedIn()) { navigate("/academy/login"); return; }
    (async () => {
      try {
        const [data, tr, ts] = await Promise.all([
          studentFetch("/api/academy/me").then(r => r.json()),
          studentFetch("/api/academy/transcript").then(r => r.json()).catch(() => null),
          studentFetch("/api/academy/test-status").then(r => r.json()).catch(() => null),
        ]);
        setP(data); setTranscript(tr); setTestStatus(ts);
      }
      finally { setLoading(false); }
    })();
  }, []);

  function up(k: string, v: any) { setP((prev: any) => ({ ...prev, [k]: v })); }
  function toggleInterest(i: string) {
    const cur = p.interests || [];
    up("interests", cur.includes(i) ? cur.filter((x: string) => x !== i) : [...cur, i]);
  }

  async function save() {
    setSaving(true); setMsg("");
    try {
      const data = await studentFetch("/api/academy/me", {
        method: "PUT",
        body: JSON.stringify({
          full_name: p.full_name, phone: p.phone, country: p.country, city: p.city,
          organization: p.organization, profession: p.profession, bio: p.bio,
          gender: p.gender, birth_year: p.birth_year ? Number(p.birth_year) : null,
          linkedin: p.linkedin, experience_level: p.experience_level,
          interests: p.interests, course_emails: p.course_emails,
        }),
      }).then(r => r.json());
      const cur = getStudent();
      if (cur) setStudent({ ...cur, full_name: data.full_name });
      setMsg("Profil enregistré ✓");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) { setMsg(e.message); } finally { setSaving(false); }
  }

  async function changePwd() {
    setPwdMsg("");
    if (pwd.next !== pwd.confirm) { setPwdMsg("Les mots de passe ne correspondent pas."); return; }
    try {
      const res = await studentFetch("/api/academy/change-password", {
        method: "PUT",
        body: JSON.stringify({ current_password: pwd.current, new_password: pwd.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPwdMsg("Mot de passe modifié ✓"); setPwd({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwdMsg(""), 3000);
    } catch (e: any) { setPwdMsg(e.message); }
  }

  async function resendVerify() {
    await studentFetch("/api/academy/resend-verify", { method: "POST" });
    setMsg("Email de validation renvoyé ✓");
    setTimeout(() => setMsg(""), 3000);
  }

  async function verifyCode() {
    setCodeMsg("");
    try {
      const res = await studentFetch("/api/academy/verify-code", { method: "POST", body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCodeMsg("Email vérifié ✓");
      setP((prev: any) => ({ ...prev, email_verified: true }));
    } catch (e: any) { setCodeMsg(e.message); }
  }

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!p) return null;

  const field = "w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <SEO title="Mon profil — DataMEAL Academy" description="Gérez votre profil étudiant." />
      <button onClick={() => navigate("/academy/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4" /> Tableau de bord
      </button>

      {/* Header avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
          {p.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "ET"}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{p.full_name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {p.email}
            {p.email_verified
              ? <span className="inline-flex items-center gap-1 text-primary text-xs"><CheckCircle2 className="w-3 h-3" /> vérifié</span>
              : <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs"><AlertCircle className="w-3 h-3" /> non vérifié</span>}
          </p>
        </div>
      </div>

      {/* Email non vérifié — vérification par code (Supabase) */}
      {!p.email_verified && (
        <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Votre email n'est pas encore vérifié</p>
          </div>
          <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mb-3">Entrez le code à 6 chiffres reçu par email, ou cliquez sur le lien dans l'email.</p>
          <div className="flex gap-2 flex-wrap">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" maxLength={6}
              className="w-32 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-background text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
            <Button size="sm" onClick={verifyCode} disabled={code.length !== 6}>Vérifier</Button>
            <Button size="sm" variant="outline" onClick={resendVerify}>Renvoyer l'email</Button>
          </div>
          {codeMsg && <p className={`text-sm mt-2 ${codeMsg.includes("✓") ? "text-primary" : "text-destructive"}`}>{codeMsg}</p>}
        </div>
      )}

      {/* Infos personnelles */}
      <section className="bg-card rounded-2xl border border-border/50 p-6 mb-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Informations personnelles</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1.5">Nom complet</label><input className={field} value={p.full_name || ""} onChange={e => up("full_name", e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1.5">Profession</label><input className={field} value={p.profession || ""} onChange={e => up("profession", e.target.value)} placeholder="Agent MEAL, Chargé de projet…" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Téléphone</label><input className={field} value={p.phone || ""} onChange={e => up("phone", e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1.5">Organisation</label><input className={field} value={p.organization || ""} onChange={e => up("organization", e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1.5">Pays</label><input className={field} value={p.country || ""} onChange={e => up("country", e.target.value)} placeholder="Togo" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Ville</label><input className={field} value={p.city || ""} onChange={e => up("city", e.target.value)} placeholder="Lomé" /></div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Genre</label>
            <select className={field} value={p.gender || ""} onChange={e => up("gender", e.target.value)}>
              <option value="">—</option><option value="F">Femme</option><option value="M">Homme</option><option value="autre">Autre</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1.5">Année de naissance</label><input className={field} type="number" value={p.birth_year || ""} onChange={e => up("birth_year", e.target.value)} placeholder="1995" /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1.5">LinkedIn</label><input className={field} value={p.linkedin || ""} onChange={e => up("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" /></div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea className={field} rows={3} value={p.bio || ""} onChange={e => up("bio", e.target.value)} placeholder="Parlez un peu de vous, votre parcours, vos objectifs MEAL…" />
          </div>
        </div>
      </section>

      {/* Niveau & intérêts */}
      <section className="bg-card rounded-2xl border border-border/50 p-6 mb-5">
        <h2 className="font-semibold mb-4">Profil d'apprentissage</h2>
        <label className="block text-sm font-medium mb-2">Niveau d'expérience</label>
        <div className="flex gap-2 mb-5">
          {LEVELS.map(lv => (
            <button key={lv.v} onClick={() => up("experience_level", lv.v)}
              className={`px-4 py-2 rounded-xl text-sm border transition-colors ${p.experience_level === lv.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>{lv.l}</button>
          ))}
        </div>
        <label className="block text-sm font-medium mb-2">Centres d'intérêt</label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(i => {
            const on = (p.interests || []).includes(i);
            return <button key={i} onClick={() => toggleInterest(i)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}>{i}</button>;
          })}
        </div>
      </section>

      {/* Préférences email */}
      <section className="bg-card rounded-2xl border border-border/50 p-6 mb-5">
        <h2 className="font-semibold mb-4">Préférences de notification</h2>
        <button onClick={() => up("course_emails", !p.course_emails)} className="flex items-center justify-between w-full">
          <span className="flex items-center gap-2 text-sm">
            {p.course_emails ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            Recevoir un email lors de la publication de nouveaux cours
          </span>
          <span className={`w-10 h-6 rounded-full transition-colors relative ${p.course_emails ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${p.course_emails ? "left-5" : "left-1"}`} />
          </span>
        </button>
      </section>

      {msg && <p className="text-sm text-primary mb-4">{msg}</p>}
      <Button className="gap-2 mb-8" size="lg" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer mon profil
      </Button>

      {/* Certificats téléchargeables */}
      {testStatus?.passed && (
        <section className="bg-card rounded-2xl border border-border/50 p-6 mb-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Mes certificats</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border border-border/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Attestation d'admission</p>
                <p className="text-xs text-muted-foreground">{testStatus.admissionExpires ? `Valable jusqu'au ${new Date(testStatus.admissionExpires).toLocaleDateString("fr-FR")}` : "Valable 3 mois"}</p>
              </div>
              <a href={`/api/academy/certificate/admission?token=${getStudentToken()}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5"><Download className="w-3.5 h-3.5" /> A4</Button>
              </a>
            </div>
            <div className={`border rounded-xl p-4 flex items-center justify-between ${p.final_certificate_no ? "border-primary/40 bg-primary/5" : "border-border/50 opacity-60"}`}>
              <div>
                <p className="text-sm font-medium">Certificat final (Super-Expert)</p>
                <p className="text-xs text-muted-foreground">{p.final_certificate_no ? "Les 3 cours terminés ✓" : "Terminez les 3 cours"}</p>
              </div>
              {p.final_certificate_no ? (
                <a href={`/api/academy/certificate/final?token=${getStudentToken()}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> A4</Button>
                </a>
              ) : <Button size="sm" variant="outline" disabled><Lock className="w-3.5 h-3.5" /></Button>}
            </div>
          </div>
        </section>
      )}

      {/* Relevé de notes (transcript) */}
      {transcript && transcript.grades?.length > 0 && (
        <section className="bg-card rounded-2xl border border-border/50 p-6 mb-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Relevé de notes</h2>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="bg-primary/10 rounded-xl px-4 py-2">
              <p className="text-xs text-muted-foreground">Moyenne générale</p>
              <p className="text-xl font-bold text-primary">{transcript.overall}%</p>
            </div>
            {transcript.courseAverages?.map((ca: any) => (
              <div key={ca.code} className="bg-muted rounded-xl px-3 py-2">
                <p className="text-xs text-muted-foreground">{ca.code}</p>
                <p className="text-sm font-bold">{ca.average}%</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs border-b border-border/50">
                <tr><th className="text-left py-2">Évaluation</th><th className="text-left py-2 hidden sm:table-cell">Cours</th><th className="text-left py-2">Type</th><th className="text-right py-2">Note</th></tr>
              </thead>
              <tbody>
                {transcript.grades.map((g: any) => {
                  const pct = Math.round(Number(g.score) / Number(g.max_score) * 100);
                  return (
                    <tr key={g.id} className="border-b border-border/30">
                      <td className="py-2">{g.title}</td>
                      <td className="py-2 hidden sm:table-cell text-muted-foreground text-xs">{g.sms_courses?.code || "—"}</td>
                      <td className="py-2"><span className="text-xs bg-muted px-2 py-0.5 rounded-full">{g.type}</span></td>
                      <td className={`py-2 text-right font-medium ${pct >= 70 ? "text-primary" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>{g.score}/{g.max_score} ({pct}%)</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Changement mot de passe */}
      <section className="bg-card rounded-2xl border border-border/50 p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Sécurité</h2>
        <div className="space-y-3 max-w-sm">
          <input className={field} type="password" placeholder="Mot de passe actuel" value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })} />
          <input className={field} type="password" placeholder="Nouveau mot de passe" value={pwd.next} onChange={e => setPwd({ ...pwd, next: e.target.value })} />
          <input className={field} type="password" placeholder="Confirmer le nouveau mot de passe" value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} />
        </div>
        {pwdMsg && <p className={`text-sm mt-3 ${pwdMsg.includes("✓") ? "text-primary" : "text-destructive"}`}>{pwdMsg}</p>}
        <Button variant="outline" className="mt-4 gap-2" onClick={changePwd} disabled={!pwd.current || !pwd.next}>
          <Lock className="w-4 h-4" /> Changer le mot de passe
        </Button>
      </section>
    </div>
  );
}
