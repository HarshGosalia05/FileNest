import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDate, formatSize, previewKindOf } from "@/lib/files";
import { FileViewer, UnavailableFallback } from "@/components/file-viewer";
import { CLASS_BUCKET, type ClassResourceRow } from "@/lib/class-resources";

interface Props {
  file: ClassResourceRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassResourcePreviewDialog({ file, open, onOpenChange }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const previewKind = file ? previewKindOf(file.original_name) : "none";
  const previewable = previewKind !== "none";

  useEffect(() => {
    if (!file || !open || !previewable) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase.storage
      .from(CLASS_BUCKET)
      .createSignedUrl(file.storage_path, 300)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
          return;
        }
        setUrl(data?.signedUrl ?? null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [file, open, previewable]);

  const handleDownload = async () => {
    if (!file) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from(CLASS_BUCKET)
        .download(file.storage_path);
      if (error) throw error;
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded ${file.original_name}`);
    } catch (e) {
      toast.error(`Download failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="truncate text-base">
            {file?.original_name ?? "Preview"}
          </DialogTitle>
          {file && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {formatSize(Number(file.file_size))} · {formatDate(file.uploaded_at)}
            </p>
          )}
        </DialogHeader>

        <div className="bg-muted/30">
          {!file ? null : loading ? (
            <div className="grid h-[60vh] place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="grid h-[40vh] place-items-center px-6 text-center text-sm text-destructive">
              Couldn't load preview: {error}
            </div>
          ) : previewable && url ? (
            <FileViewer
              url={url}
              name={file.original_name}
              kind={previewKind}
              size={Number(file.file_size)}
            />
          ) : (
            <UnavailableFallback name={file.original_name} />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
