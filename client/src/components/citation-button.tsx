import { useState } from "react";
import { Quote, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CitationProps {
  title: string;
  author?: string;
  year?: number | string;
  url: string;
  type?: "article" | "publication";
}

function generateCitations(p: CitationProps) {
  const author = p.author || "TATCHIDA, L.";
  const year = p.year || new Date().getFullYear();
  const accessed = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = `${siteUrl}${p.url}`;

  return {
    APA: `${author} (${year}). ${p.title}. Portefolio Louis TATCHIDA. ${fullUrl}`,
    MLA: `${author}. "${p.title}." Portefolio Louis TATCHIDA, ${year}. Web. ${accessed}. <${fullUrl}>.`,
    BibTeX: `@article{tatchida${year},\n  title={${p.title}},\n  author={${author}},\n  year={${year}},\n  url={${fullUrl}}\n}`,
    Chicago: `${author}. "${p.title}." Portefolio Louis TATCHIDA, ${year}. ${fullUrl}.`,
  };
}

export function CitationButton(props: CitationProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const citations = generateCitations(props);

  const copy = (format: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
        <Quote className="w-3.5 h-3.5 mr-1.5" /> Citer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Quote className="w-5 h-5 text-primary" /> Citer cette publication
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {Object.entries(citations).map(([format, text]) => (
              <div key={format} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{format}</span>
                  <button
                    onClick={() => copy(format, text)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {copied === format ? <><Check className="w-3 h-3 text-green-500" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
                  </button>
                </div>
                <div className="bg-muted/50 p-3 rounded-xl border border-border/50 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
