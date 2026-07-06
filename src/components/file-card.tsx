import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileArchive,
  Code2,
  File as FileIcon,
  MoreVertical,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { extOf, filesQueryKey, formatDate, formatSize, kindOf, type FileRow } from "@/lib/files";
import { FilePreviewDialog } from "@/components/file-preview-dialog";

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

async function downloadFile(file: FileRow) {
  const { data, error } = await supabase.storage
    .from("filenest-files")
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
}

export function FileCard({
  file,
  highlight = false,
  highlightSignal,
}: {
  file: FileRow;
  highlight?: boolean;
  highlightSignal?: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const kind = kindOf(file.original_name);
  const Icon = iconMap[kind];
  const ext = extOf(file.original_name) || "file";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    if (!highlight) return;
    setGlow(true);
    const el = cardRef.current;
    if (el) {
      // rAF so layout is ready before we scroll.
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    }
    const t = setTimeout(() => setGlow(false), 2000);
    return () => clearTimeout(t);
  }, [highlight, highlightSignal]);


  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadFile(file);
      toast.success(`Downloaded ${file.original_name}`);
    } catch (e) {
      toast.error(`Download failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setDownloading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error: storageErr } = await supabase.storage
        .from("filenest-files")
        .remove([file.storage_path]);
      if (storageErr) throw storageErr;
      const { error: dbErr } = await supabase.from("files").delete().eq("id", file.id);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      toast.success(`Deleted ${file.original_name}`);
      queryClient.invalidateQueries({ queryKey: filesQueryKey(user?.id) });
    },
    onError: (e) => {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : "unknown"}`);
    },
  });

  return (
    <>
      <Card
        ref={cardRef}
        className={`group flex items-center gap-3 border-border/60 p-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] sm:p-4 ${glow ? "file-glow" : ""}`}
      >
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
          aria-label={`Preview ${file.original_name}`}
        >
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneMap[kind]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold group-hover:text-primary" title={file.original_name}>
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
        </button>
        <div className="flex shrink-0 items-center gap-1">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="File actions"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleDownload} disabled={downloading}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{file.original_name}</span> will be
              permanently removed from your storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilePreviewDialog file={file} open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}

export function FileCardSkeleton() {
  return (
    <Card className="flex items-center gap-3 border-border/60 p-3 shadow-[var(--shadow-card)] sm:p-4">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </Card>
  );
}
