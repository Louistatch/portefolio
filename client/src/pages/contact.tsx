import { SEO } from "@/components/seo";
import { Mail, MapPin, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <>
      <SEO title="Contact" description="Get in touch with Louis Tatchida." />
      
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-24 text-center">
        <h1 className="text-4xl lg:text-6xl font-bold mb-6">Get in Touch</h1>
        <p className="text-xl text-muted-foreground font-serif max-w-2xl mx-auto mb-16">
          For general inquiries, speaking opportunities, or media requests, please use the provided contact information. For consulting, please use the booking calendar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-card p-10 rounded-3xl border border-border/50 flex flex-col items-center shadow-sm hover-elevate">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Email</h3>
            <p className="text-muted-foreground mb-6">Direct line for research and media.</p>
            <a href="mailto:contact@louistatchida.com" className="text-lg font-medium text-primary hover:underline">
              contact@louistatchida.com
            </a>
          </div>

          <div className="bg-card p-10 rounded-3xl border border-border/50 flex flex-col items-center shadow-sm hover-elevate">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Location</h3>
            <p className="text-muted-foreground mb-6">Global reach, based in.</p>
            <span className="text-lg font-medium text-foreground">
              Geneva, Switzerland
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <Button variant="outline" size="lg" className="rounded-full px-8 py-6 hover-elevate gap-2" onClick={() => window.open('https://linkedin.com', '_blank')}>
            <Linkedin className="w-5 h-5" /> LinkedIn
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-8 py-6 hover-elevate gap-2" onClick={() => window.open('https://twitter.com', '_blank')}>
            <Twitter className="w-5 h-5" /> Twitter / X
          </Button>
        </div>
      </div>
    </>
  );
}
