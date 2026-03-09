import { SEO } from "@/components/seo";
import { useState } from "react";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Booking() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { toast } = useToast();
  const createAppointment = useCreateAppointment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name || !email || !topic) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs et sélectionner une date.", variant: "destructive" });
      return;
    }

    createAppointment.mutate({ name, email, date, topic }, {
      onSuccess: () => {
        setIsSuccess(true);
        toast({ title: "Demande envoyée", description: "Votre demande de rendez-vous a été reçue." });
      },
      onError: (err) => {
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Demande Envoyée</h1>
        <p className="text-xl text-muted-foreground font-serif mb-8">
          Merci pour votre demande. Je reviendrai vers vous par email pour confirmer les détails du rendez-vous.
        </p>
        <Button onClick={() => window.location.href = '/'}>Retour à l'accueil</Button>
      </div>
    );
  }

  return (
    <>
      <SEO title="Prendre Rendez-vous" description="Planifiez une consultation ou une réunion avec Louis TATCHIDA." />
      
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">Prendre Rendez-vous</h1>
          <p className="text-lg text-muted-foreground font-serif">
            Sélectionnez une date et décrivez l'objet de la consultation. Je suis disponible pour des collaborations académiques, du conseil technique et des interventions terrain.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start bg-card p-8 lg:p-12 rounded-3xl border border-border/50 shadow-xl">
          <div className="flex flex-col space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" /> Choisir une Date
            </h2>
            <div className="bg-background border border-border/50 p-4 rounded-2xl flex justify-center shadow-inner">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
              />
            </div>
            {date && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center gap-3 text-primary font-medium">
                <Clock className="w-5 h-5" />
                {date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-6">
            <h2 className="text-2xl font-bold">Vos Informations</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom complet</label>
                <Input placeholder="Votre nom" value={name} onChange={e => setName(e.target.value)} className="bg-background px-4 py-6 rounded-xl" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Adresse email</label>
                <Input type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} className="bg-background px-4 py-6 rounded-xl" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sujet / Ordre du jour</label>
                <Textarea placeholder="Décrivez l'objet de notre rencontre..." value={topic} onChange={e => setTopic(e.target.value)} className="bg-background min-h-[150px] p-4 rounded-xl resize-none" required />
              </div>
              <Button type="submit" className="w-full py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-shadow" disabled={createAppointment.isPending}>
                {createAppointment.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer la Demande"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
