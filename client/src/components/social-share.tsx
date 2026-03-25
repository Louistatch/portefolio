import { useState } from "react";
import { Share2, Facebook, Linkedin, Twitter, Link2, Check, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
}

const platforms = [
  { name: "LinkedIn", icon: Linkedin, color: "hover:bg-[#0077B5] hover:text-white", getUrl: (u: string, t: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { name: "Twitter / X", icon: Twitter, color: "hover:bg-[#1DA1F2] hover:text-white", getUrl: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { name: "Facebook", icon: Facebook, color: "hover:bg-[#1877F2] hover:text-white", getUrl: (u: string, t: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { name: "WhatsApp", icon: MessageCircle, color: "hover:bg-[#25D366] hover:text-white", getUrl: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(t + " " + u)}` },
  { name: "Telegram", icon: Send, color: "hover:bg-[#0088CC] hover:text-white", getUrl: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
];

export function SocialShare({ url, title, description, image }: ShareProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${url}` : url;

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast({ title: "Lien copié", description: "Le lien a été copié dans le presse-papiers." });
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description || title, url: fullUrl });
      } catch {}
    } else {
      setOpen(!open);
    }
  };

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={nativeShare} className="gap-2 rounded-full">
        <Share2 className="w-4 h-4" /> Partager
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 bg-card border border-border/50 rounded-2xl shadow-2xl p-4 w-72 animate-in fade-in slide-in-from-top-2">
            {/* Mini preview card */}
            <div className="mb-4 rounded-xl overflow-hidden border border-border/30 bg-muted/30">
              {image && <img src={image} alt="" className="w-full h-32 object-cover" />}
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-1">louisfarm.com</p>
                <p className="text-sm font-semibold line-clamp-2">{title}</p>
                {description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{description}</p>}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-3">
              {platforms.map(p => (
                <button
                  key={p.name}
                  title={p.name}
                  onClick={() => { window.open(p.getUrl(fullUrl, title), "_blank", "width=600,height=400"); setOpen(false); }}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border border-border/50 transition-all duration-200 ${p.color}`}
                >
                  <p.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
              {copied ? "Copié !" : "Copier le lien"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
