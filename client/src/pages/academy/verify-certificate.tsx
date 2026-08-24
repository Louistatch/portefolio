import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ShieldX, Loader2, Search, Award, Calendar, Hash, User, BadgeCheck } from "lucide-react";

export default function VerifyCertificate() {
  const [, params] = useRoute("/academy/verify-certificate/:certNo");
  const [, navigate] = useLocation();
  const [certNo, setCertNo] = useState(params?.certNo || "");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function check(no: string) {
    if (!no.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const r = await fetch(`/api/academy/verify-certificate/${encodeURIComponent(no.trim())}`);
      setResult(await r.json());
    } catch { setResult({ valid: false, message: "Erreur de vérification." }); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (params?.certNo) check(params.certNo); }, [params?.certNo]);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <SEO title="Vérifier un certificat — LouisFarm Learning" description="Vérifiez l'authenticité d'un certificat délivré par LouisFarm Learning." />

      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BadgeCheck className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Vérification de certificat</h1>
        <p className="text-muted-foreground text-sm mt-2">Entrez le numéro de certificat pour confirmer son authenticité.</p>
      </div>

      <div className="flex gap-2 mb-8">
        <Input value={certNo} onChange={e => setCertNo(e.target.value)}
          onKeyDown={e => e.key === "Enter" && check(certNo)}
          placeholder="Ex : DMA-ADM-12-ABC123" className="font-mono" />
        <Button onClick={() => check(certNo)} disabled={loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Vérifier
        </Button>
      </div>

      {searched && !loading && result && (
        result.valid ? (
          <div className="bg-card border border-primary/30 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-teal-700 p-5 text-white flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div>
              <div>
                <p className="font-bold text-lg">Certificat authentique ✓</p>
                <p className="text-white/80 text-sm">Délivré par {result.issuer}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <Row icon={User} label="Titulaire" value={result.holder} />
              <Row icon={Award} label="Type" value={result.type} />
              {result.score != null && <Row icon={BadgeCheck} label="Score" value={`${result.score}%`} />}
              <Row icon={Calendar} label="Délivré le" value={fmt(result.issued_at)} />
              {result.expires_at
                ? <Row icon={Calendar} label="Valable jusqu'au" value={fmt(result.expires_at)} />
                : <Row icon={Calendar} label="Validité" value="Permanente" />}
              <Row icon={Hash} label="N° de certificat" value={result.certificate_no} mono />
              {result.status === "expired" && (
                <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">⚠ Ce certificat est expiré mais a bien été délivré.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-destructive/30 rounded-3xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldX className="w-7 h-7 text-destructive" />
            </div>
            <p className="font-bold text-lg mb-1">Certificat non vérifié</p>
            <p className="text-muted-foreground text-sm">{result.message || "Aucun certificat ne correspond à ce numéro."}</p>
          </div>
        )
      )}

      <div className="text-center mt-8">
        <Link href="/elearning"><Button variant="outline" size="sm">Découvrir LouisFarm Learning</Button></Link>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-muted-foreground" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${mono ? "font-mono" : ""} break-all`}>{value}</p>
      </div>
    </div>
  );
}
