import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Image, Loader2, CheckCircle2 } from "lucide-react";
import { getToken } from "@/lib/admin";

interface FileUploadProps {
  type: "document" | "image";
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
}

const ACCEPT_MAP = {
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx",
  image: ".jpg,.jpeg,.png,.gif,.webp,.svg",
};

export function FileUpload({ type, value, onChange, accept }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/admin/upload/${type}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      const data = await res.json();
      onChange(data.url);
      setFileName(data.filename);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const Icon = type === "image" ? Image : FileText;

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept={accept || ACCEPT_MAP[type]} onChange={handleUpload} className="hidden" />

      {value ? (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border/50">
          {type === "image" && value ? (
            <img src={value} alt="" className="w-16 h-16 object-cover rounded-lg border border-border/50" />
          ) : (
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName || "File uploaded"}</p>
            <p className="text-xs text-muted-foreground truncate">{value}</p>
          </div>
          <div className="flex gap-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { onChange(""); setFileName(""); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed gap-3 flex-col"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs">Uploading {fileName}...</span></>
          ) : (
            <><Upload className="w-6 h-6" /><span className="text-xs text-muted-foreground">
              {type === "image" ? "Upload image (JPG, PNG, WebP, SVG)" : "Upload file (PDF, Word, Excel, PPT)"}
            </span></>
          )}
        </Button>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
