import { SEO } from "@/components/seo";
import { Mail, MapPin, Phone, Linkedin, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContactForm } from "@/hooks/use-contact";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Profile {
  email: string; phone: string; location: string; linkedin: string; researchgate: string;
}

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const contactForm = useContactForm();
  const { toast } = useToast();

  const { data: profile } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => { const r = await fetch("/api/profile"); return r.json(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactForm.mutate({ name, email, subject, message }, {
      onSuccess: () => {
        setSent(true);
        toast({ title: "Message envoyé", description: "Je vous répondrai dans les plus brefs délais." });
      },
      onError: (err) => {
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <>
      <SEO title="Contact" description="Contactez Louis TATCHIDA pour la recherche, le consulting ou les collaborations." path="/contact" />

      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">Me Contacter</h1>
          <p className="text-xl text-muted-foreground font-serif max-w-2xl mx-auto">
            Pour toute demande de collaboration, consultation ou opportunité professionnelle.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
              <Mail className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Email</h3>
              <a href={`mailto:${profile?.email || "contact@louisfarm.com"}`} className="text-primary hover:underline text-sm">
                {profile?.email || "contact@louisfarm.com"}
              </a>
            </div>
            <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
              <Phone className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Téléphone</h3>
              <a href={`tel:${profile?.phone || "+228 92 54 88 38"}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {profile?.phone || "+228 92 54 88 38"}
              </a>
            </div>
            <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
              <MapPin className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Localisation</h3>
              <span className="text-sm text-muted-foreground">{profile?.location || "Lomé, Togo"}</span>
            </div>
            <div className="flex gap-3">
              {profile?.linkedin && (
                <Button variant="outline" className="flex-1 rounded-xl hover:shadow-md transition-shadow gap-2" onClick={() => window.open(profile.linkedin, '_blank')}>
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            {sent ? (
              <div className="bg-card p-12 rounded-3xl border border-border/50 text-center">
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-3">Message Envoyé</h2>
                <p className="text-muted-foreground font-serif">Merci pour votre message. Je vous répondrai dans les plus brefs délais.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card p-8 rounded-3xl border border-border/50 shadow-sm space-y-5">
                <h2 className="text-2xl font-bold mb-2">Envoyer un Message</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nom</label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" className="bg-background" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" className="bg-background" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sujet</label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet de votre message" className="bg-background" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Message</label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Votre message..." className="bg-background min-h-[150px]" required />
                </div>
                <Button type="submit" className="w-full py-6 rounded-xl" disabled={contactForm.isPending}>
                  {contactForm.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Envoyer <Send className="w-4 h-4 ml-2" /></>)}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
