import { Link } from "wouter";
import { ArrowRight, BookOpen, Leaf, LineChart, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";

export default function Home() {
  return (
    <>
      <SEO title="Home" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center rounded-full px-4 py-1.5 border border-primary/20 bg-primary/5 text-primary text-sm font-medium">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Available for Consulting & Research Collaboration
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
              Pioneering the Future of <br/>
              <span className="text-gradient">Agriculture & AI</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl font-serif">
              Bridging cutting-edge artificial intelligence, sustainable climate practices, and robust agricultural finance frameworks to secure global food systems.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/research" className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium transition-colors bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0">
                Explore Research
              </Link>
              <Link href="/booking" className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium transition-colors border-2 border-border bg-background hover:bg-muted text-foreground rounded-xl hover:-translate-y-0.5 active:translate-y-0">
                Schedule Meeting
              </Link>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            <div className="aspect-square max-w-md mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-[2rem] rotate-6 opacity-20 blur-2xl" />
              {/* landing page hero scenic agriculture technology landscape */}
              <img 
                src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=1000" 
                alt="Agricultural Technology"
                className="relative rounded-[2rem] shadow-2xl object-cover w-full h-full border border-border/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Expertise Areas */}
      <section className="py-24 bg-muted/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Core Expertise</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Interdisciplinary approaches solving complex global challenges.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Leaf, title: "Climate Agriculture", desc: "Resilient farming practices adapting to global climate shifts." },
              { icon: LineChart, title: "Agricultural Finance", desc: "Economic modeling for sustainable rural development." },
              { icon: Cpu, title: "AI in Farming", desc: "Machine learning for crop yield prediction and optimization." },
              { icon: BookOpen, title: "Rural Digitalization", desc: "Integrating technology into traditional farming communities." }
            ].map((area, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border/50 hover-elevate group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <area.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{area.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{area.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary -z-20" />
        {/* subtle pattern overlay */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=2000')] opacity-10 mix-blend-overlay -z-10 object-cover" />
        
        <div className="max-w-4xl mx-auto px-6 text-center text-primary-foreground">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to collaborate?</h2>
          <p className="text-xl opacity-90 mb-10 font-serif max-w-2xl mx-auto">
            Whether you are looking for academic partnerships, consulting on agricultural finance, or insights into AI integration.
          </p>
          <Link href="/booking" className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold bg-background text-primary rounded-xl shadow-xl hover:scale-105 transition-transform gap-2">
            Book a Consultation
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
