import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Image, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

const BUCKET_MAP = {
  document: "documents",
  image: "images",
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

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const uniqueName = `${crypto.randomUUID()}.${ext}`;
      const bucket = BUCKET_MAP[type];

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(uniqueName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
      onChange(urlData.publicUrl);
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
            <p className="text-sm font-medium truncate">{fileName || "Fichier uploadé"}</p>
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
            <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs">Upload de {fileName}...</span></>
          ) : (
            <><Upload className="w-6 h-6" /><span className="text-xs text-muted-foreground">
              {type === "image" ? "Upload image (JPG, PNG, WebP, SVG)" : "Upload fichier (PDF, Word, Excel, PPT)"}
            </span></>
          )}
        </Button>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
