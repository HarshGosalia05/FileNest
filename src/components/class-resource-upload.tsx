import { useCallback, useRef, useState } from "react";
import { Upload, FileUp, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CLASS_BUCKET, classResourcesQueryKey } from "@/lib/class-resources";

const MAX_SIZE = 50 * 1024 * 1024;

type Status = "uploading" | "success" | "error";

interface Item {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: Status;
  error?: string;
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function ClassResourceUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const uploadOne = useCallback(
    async (file: File) => {
      if (!user) {
        toast.error("Sign in to share class resources.");
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (file.size > MAX_SIZE) {
        setItems((prev) => [
          ...prev,
          { id, name: file.name, size: file.size, progress: 0, status: "error", error: "File exceeds 50MB limit" },
        ]);
        toast.error(`${file.name} is too large (max 50MB)`);
        return;
      }

      const storagePath = `${user.id}/${Date.now()}-${sanitize(file.name)}`;

      setItems((prev) => [
        ...prev,
        { id, name: file.name, size: file.size, progress: 5, status: "uploading" },
      ]);

      const ramp = setInterval(() => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id && it.status === "uploading" && it.progress < 90
              ? { ...it, progress: it.progress + 8 }
              : it,
          ),
        );
      }, 200);

      try {
        const { error: upErr } = await supabase.storage
          .from(CLASS_BUCKET)
          .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase.from("class_resources").insert({
          uploaded_by: user.id,
          original_name: file.name,
          file_size: file.size,
          file_type: file.type || ext || "application/octet-stream",
          storage_path: storagePath,
        });
        if (dbErr) {
          if (dbErr.code === "23505") throw new Error("This file was already shared");
          throw dbErr;
        }

        clearInterval(ramp);
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, progress: 100, status: "success" } : it)),
        );
        toast.success(`Shared ${file.name}`);
        queryClient.invalidateQueries({ queryKey: classResourcesQueryKey });
      } catch (e) {
        clearInterval(ramp);
        const msg = e instanceof Error ? e.message : "Upload failed";
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status: "error", error: msg } : it)),
        );
        toast.error(`${file.name}: ${msg}`);
      }
    },
    [user, queryClient],
  );

  const handleFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      Array.from(list).forEach((f) => void uploadOne(f));
    },
    [uploadOne],
  );

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Share a class resource</h2>
            <p className="text-sm text-muted-foreground">
              Anything you upload here is visible to everyone with the link.
            </p>
          </div>
          <Button
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Add file
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={cn(
            "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all",
            "border-border bg-muted/30 hover:border-primary/60 hover:bg-primary/5",
            dragging && "border-primary bg-primary/10 scale-[1.01]",
          )}
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary-glow/15 text-primary transition-transform group-hover:scale-110">
            <Upload className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium">
            {dragging ? "Drop to share" : "Drag & drop files here"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse • max 50MB per file
          </p>
        </div>

        {items.length > 0 && (
          <ul className="mt-5 space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                  {it.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : it.status === "error" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{it.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatSize(it.size)}
                    </span>
                  </div>
                  {it.status === "uploading" && (
                    <Progress value={it.progress} className="mt-2 h-1.5" />
                  )}
                  {it.status === "error" && (
                    <p className="mt-1 text-xs text-destructive">{it.error}</p>
                  )}
                  {it.status === "success" && (
                    <p className="mt-1 text-xs text-muted-foreground">Shared successfully</p>
                  )}
                </div>
                <button
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
                  className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
