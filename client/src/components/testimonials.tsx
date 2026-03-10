import { useQuery } from "@tanstack/react-query";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  title: string;
  organization: string;
  content: string;
  photo_url?: string;
  rating: number;
}

export function Testimonials() {
  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const r = await fetch("/api/testimonials");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!testimonials?.length) return null;

  return (
    <section className="py-24 bg-muted/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Ce qu'ils disent</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-serif">
            Témoignages de collaborateurs, partenaires et bénéficiaires.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map(t => (
            <div key={t.id} className="bg-card p-8 rounded-3xl border border-border/50 shadow-sm hover:shadow-lg transition-shadow relative">
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" />
              
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < t.rating ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                ))}
              </div>

              <p className="text-sm text-muted-foreground font-serif leading-relaxed mb-6 italic">
                "{t.content}"
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.title}, {t.organization}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
