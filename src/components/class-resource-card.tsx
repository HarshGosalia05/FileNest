import { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileArchive,
  Code2,
  File as FileIcon,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extOf, formatDate, formatSize, isPreviewableImage, isPreviewablePdf, kindOf } from "@/lib/files";
import { CLASS_BUCKET, type ClassResourceRow } from "@/lib/class-resources";
import { ClassResourcePreviewDialog } from "@/components/class-resource-preview-dialog";

const iconMap = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  archive: FileArchive,
  code: Code2,
  doc: FileText,
  other: FileIcon,
} as const;

const toneMap = {
  image: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  video: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  audio: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  archive: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  code: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  doc: "bg-primary/10 text-primary",
  other: "bg-muted text-muted-foreground",
} as const;

export function ClassResourceCard({ file }: { file: ClassResourceRow }) {
  const kind = kindOf(file.original_name);
  const Icon = iconMap[kind];
  const ext = extOf(file.original_name) || "file";
  const canPreview = isPreviewableImage(file.original_name) || isPreviewablePdf(file.original_name);
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from(CLASS_BUCKET)
        .download(file.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${file.original_name}`);
    } catch (e) {
      toast.error(`Download failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Card className="group flex items-center gap-3 border-border/60 p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] sm:p-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneMap[kind]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={file.original_name}>
            {file.original_name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-semibold uppercase tracking-wide">
              {ext}
            </Badge>
            <span>{formatSize(Number(file.file_size))}</span>
            <span>·</span>
            <span>{formatDate(file.uploaded_at)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canPreview && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewOpen(true)}
              aria-label="Preview file"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download file"
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>

      <ClassResourcePreviewDialog file={file} open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}
