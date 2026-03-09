import { SEO } from "@/components/seo";
import { usePublications } from "@/hooks/use-publications";
import { BookOpen, FileText, Download, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Publications() {
  const { data: publications, isLoading } = usePublications();

  // Group by category if we have data
  const categories = publications 
    ? Array.from(new Set(publications.map(p => p.category)))
    : [];

  return (
    <>
      <SEO title="Publications & Papers" description="Scientific library and PDF downloads." />
      
      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <div className="mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">Publications Archive</h1>
          <p className="text-xl text-muted-foreground max-w-3xl font-serif">
            A comprehensive library of peer-reviewed papers, whitepapers, and conference proceedings.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : publications?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-serif">Library is currently being updated.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {categories.map(category => (
              <div key={category}>
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 border-b border-border/50 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  {category}
                </h2>
                
                <div className="space-y-6">
                  {publications?.filter(p => p.category === category).map(pub => (
                    <div key={pub.id} className="bg-card p-6 lg:p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-primary font-bold">{pub.year}</span>
                          </div>
                          <h3 className="text-xl font-bold mb-3">{pub.title}</h3>
                          <p className="text-sm text-muted-foreground font-serif leading-relaxed mb-6">
                            {pub.abstract}
                          </p>
                          
                          <div className="bg-muted/50 p-4 rounded-xl border border-border/50 text-xs font-mono text-muted-foreground overflow-x-auto">
                            {pub.citation}
                          </div>
                        </div>
                        
                        <div className="flex lg:flex-col gap-3 w-full lg:w-auto shrink-0">
                          <Button className="w-full lg:w-40 hover-elevate bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" variant="secondary" onClick={() => window.open(pub.pdfUrl, '_blank')}>
                            <Download className="w-4 h-4 mr-2" /> PDF
                          </Button>
                          <Button className="w-full lg:w-40 hover-elevate" variant="outline" onClick={() => navigator.clipboard.writeText(pub.citation)}>
                            <Quote className="w-4 h-4 mr-2" /> Copy Cite
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
