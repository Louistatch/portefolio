import { SEO } from "@/components/seo";
import { Network, Droplets, ShieldCheck } from "lucide-react";

export default function Research() {
  const projects = [
    {
      title: "Predictive Modeling for Climate-Resilient Crops",
      icon: Droplets,
      status: "Ongoing",
      description: "Utilizing deep learning neural networks to analyze decades of meteorological data and predict optimal crop yields under shifting climate paradigms. This project partners with local farming co-ops.",
      tags: ["AI", "Climate", "Machine Learning"]
    },
    {
      title: "Micro-insurance Frameworks for Rural Farmers",
      icon: ShieldCheck,
      status: "Published",
      description: "Developing decentralized, blockchain-backed insurance models that automatically trigger payouts to farmers based on verified satellite weather data, eliminating bureaucratic delays.",
      tags: ["Finance", "Insurance", "Blockchain"]
    },
    {
      title: "Rural Digitalization and Supply Chain Ethics",
      icon: Network,
      status: "Ongoing",
      description: "Analyzing the socio-economic impact of smartphone penetration and dedicated app usage among smallholder farmers, tracking improvements in market access and pricing fairness.",
      tags: ["Digitalization", "Economics"]
    }
  ];

  return (
    <>
      <SEO title="Research" description="Current and past research projects by Louis Tatchida." />
      
      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <div className="mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">Research Focus</h1>
          <p className="text-xl text-muted-foreground max-w-3xl font-serif">
            Investigating the nexus of technology, finance, and ecology. My lab's mission is to translate complex data into actionable strategies for global food security.
          </p>
        </div>

        <div className="space-y-8">
          {projects.map((project, idx) => (
            <div key={idx} className="group bg-card rounded-3xl p-8 lg:p-10 border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <project.icon className="w-8 h-8 text-primary" />
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="text-2xl font-bold text-foreground">{project.title}</h2>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      project.status === 'Ongoing' ? 'bg-accent/20 text-accent-foreground border border-accent/30' : 'bg-muted text-muted-foreground'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  
                  <p className="text-muted-foreground font-serif leading-relaxed mb-6">
                    {project.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-secondary/5 text-secondary-foreground border border-secondary/10 rounded-md text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
