import { SEO } from "@/components/seo";
import { Award, GraduationCap, Briefcase, Globe, Wrench, Download, ExternalLink, Loader2, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface Profile {
  full_name: string; title: string; bio: string; photo_url: string; cv_pdf_url: string;
  email: string; phone: string; location: string; linkedin: string; researchgate: string; orcid: string;
  education: { degree: string; institution: string; year: string; description?: string }[];
  experience: { role: string; organization: string; period: string; description?: string }[];
  skills: string[];
  awards: { title: string; year?: string; description?: string }[];
  languages: string[];
  certifications: { title: string; year?: string; issuer?: string }[];
}

export default function About() {
  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => { const r = await fetch("/api/profile"); return r.json(); },
  });

  if (isLoading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const p = profile;

  return (
    <>
      <SEO title="About" description={`Biography and professional background of ${p?.full_name || "Louis Tatchida"}.`} />
      
      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        {/* Hero */}
        <div className="flex flex-col md:flex-row gap-12 items-start mb-16">
          <div className="w-full md:w-1/3 aspect-[3/4] relative rounded-2xl overflow-hidden shadow-xl shrink-0 border border-border/50">
            <img 
              src={p?.photo_url || "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800"} 
              alt={p?.full_name || "Louis Tatchida"}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-2xl font-bold">{p?.full_name || "Louis Tatchida"}</h1>
              <p className="text-sm opacity-90">{p?.title || ""}</p>
            </div>
          </div>
          
          <div className="flex-1">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">{p?.full_name || "About"}</h1>
            <p className="text-lg text-primary font-medium mb-6">{p?.title || ""}</p>
            
            <div className="prose prose-lg dark:prose-invert mb-8">
              {p?.bio?.split("\n").map((para, i) => (
                <p key={i} className="font-serif leading-relaxed text-foreground/80">{para}</p>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {p?.cv_pdf_url && (
                <Button asChild variant="default">
                  <a href={p.cv_pdf_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" /> Download CV
                  </a>
                </Button>
              )}
              {p?.linkedin && (
                <Button asChild variant="outline">
                  <a href={p.linkedin} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> LinkedIn
                  </a>
                </Button>
              )}
              {p?.researchgate && (
                <Button asChild variant="outline">
                  <a href={p.researchgate} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> ResearchGate
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Education & Experience & Awards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Education */}
          {p?.education && p.education.length > 0 && (
            <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
              <GraduationCap className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-4">Education</h3>
              <ul className="space-y-4">
                {p.education.map((edu, i) => (
                  <li key={i}>
                    <p className="font-semibold text-foreground">{edu.degree}</p>
                    <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    <p className="text-xs text-muted-foreground">{edu.year}</p>
                    {edu.description && <p className="text-xs text-muted-foreground mt-1">{edu.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Experience */}
          {p?.experience && p.experience.length > 0 && (
            <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
              <Briefcase className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-4">Experience</h3>
              <ul className="space-y-4">
                {p.experience.map((exp, i) => (
                  <li key={i}>
                    <p className="font-semibold text-foreground">{exp.role}</p>
                    <p className="text-sm text-muted-foreground">{exp.organization}</p>
                    <p className="text-xs text-muted-foreground">{exp.period}</p>
                    {exp.description && <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Awards */}
          {p?.awards && p.awards.length > 0 && (
            <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
              <Award className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-4">Awards & Honors</h3>
              <ul className="space-y-4">
                {p.awards.map((a, i) => (
                  <li key={i}>
                    <p className="font-semibold text-foreground">{a.title}</p>
                    {a.year && <p className="text-xs text-muted-foreground">{a.year}</p>}
                    {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Skills */}
        {p?.skills && p.skills.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Wrench className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">Skills & Expertise</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {p.skills.map((skill, i) => (
                <span key={i} className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages & Certifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {p?.languages && p.languages.length > 0 && (
            <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
              <Globe className="w-8 h-8 text-emerald-500 mb-4" />
              <h3 className="font-bold text-xl mb-4">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {p.languages.map((lang, i) => (
                  <span key={i} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full text-sm font-medium">{lang}</span>
                ))}
              </div>
            </div>
          )}

          {p?.certifications && p.certifications.length > 0 && (
            <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
              <BadgeCheck className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="font-bold text-xl mb-4">Certifications</h3>
              <ul className="space-y-3">
                {p.certifications.map((c, i) => (
                  <li key={i}>
                    <p className="font-semibold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.issuer} {c.year && `• ${c.year}`}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
