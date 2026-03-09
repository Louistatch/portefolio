import { SEO } from "@/components/seo";
import { Award, GraduationCap, Briefcase } from "lucide-react";

export default function About() {
  return (
    <>
      <SEO title="About" description="Biography and professional background of Louis Tatchida." />
      
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
        <h1 className="text-4xl lg:text-5xl font-bold mb-8">About Louis</h1>
        
        <div className="flex flex-col md:flex-row gap-12 items-start mb-16">
          <div className="w-full md:w-1/3 aspect-[3/4] relative rounded-2xl overflow-hidden shadow-xl shrink-0 border border-border/50">
            {/* professional headshot abstract portrait */}
            <img 
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800" 
              alt="Louis Tatchida"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          
          <div className="prose prose-lg dark:prose-invert">
            <p className="text-xl text-muted-foreground font-serif mb-6 leading-relaxed">
              I am an interdisciplinary researcher and consultant dedicated to solving the complex challenges at the intersection of global agriculture, climate change, and artificial intelligence.
            </p>
            <p className="font-serif leading-relaxed text-foreground/80 mb-6">
              With a background in computational economics and sustainable farming systems, my work focuses on developing robust frameworks for rural digitalization. I believe that integrating advanced AI models into agricultural finance can provide unprecedented resilience for farming communities facing climate uncertainty.
            </p>
            <p className="font-serif leading-relaxed text-foreground/80">
              Through rigorous academic research and practical field applications, I aim to create financial instruments and insurance products tailored for the modern, climate-affected agricultural sector.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
            <GraduationCap className="w-10 h-10 text-primary mb-4" />
            <h3 className="font-bold text-xl mb-3">Education</h3>
            <ul className="space-y-3 text-muted-foreground text-sm">
              <li><strong className="text-foreground">Ph.D. in Agricultural Economics</strong><br/>Global Institute of Tech</li>
              <li><strong className="text-foreground">M.Sc. in Data Science</strong><br/>Tech University</li>
            </ul>
          </div>
          
          <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
            <Briefcase className="w-10 h-10 text-primary mb-4" />
            <h3 className="font-bold text-xl mb-3">Experience</h3>
            <ul className="space-y-3 text-muted-foreground text-sm">
              <li><strong className="text-foreground">Lead Researcher</strong><br/>AgriTech Global Initiative</li>
              <li><strong className="text-foreground">Consultant</strong><br/>World Rural Finance Board</li>
            </ul>
          </div>
          
          <div className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm">
            <Award className="w-10 h-10 text-primary mb-4" />
            <h3 className="font-bold text-xl mb-3">Awards</h3>
            <ul className="space-y-3 text-muted-foreground text-sm">
              <li><strong className="text-foreground">Innovation in Climate Finance 2023</strong></li>
              <li><strong className="text-foreground">Excellence in AI Research</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
