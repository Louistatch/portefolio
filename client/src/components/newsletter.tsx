import { useState } from "react";
import { useSubscribe } from "@/hooks/use-newsletter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const subscribe = useSubscribe();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate(email, {
      onSuccess: () => { setDone(true); setEmail(""); },
    });
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 text-primary font-medium">
        <CheckCircle2 className="w-5 h-5" /> Inscription réussie !
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-md">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="pl-10 bg-background"
          required
        />
      </div>
      <Button type="submit" disabled={subscribe.isPending} size="sm">
        {subscribe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "S'abonner"}
      </Button>
      {subscribe.isError && (
        <p className="text-destructive text-xs mt-1">{subscribe.error.message}</p>
      )}
    </form>
  );
}
