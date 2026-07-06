import { Inbox, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileCard, FileCardSkeleton } from "@/components/file-card";
import type { FileRow } from "@/lib/files";

interface Props {
  files: FileRow[] | undefined;
  isLoading: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onUploadClick?: () => void;
  skeletonCount?: number;
  /** id of the file to briefly glow + scroll into view */
  highlightId?: string | null;
  /** changes when the user issues a new search, retriggers highlight */
  highlightSignal?: string;
}

export function FileList({
  files,
  isLoading,
  emptyTitle = "No files uploaded yet.",
  emptyDescription = "Upload your first file to get started. It will appear here.",
  onUploadClick,
  skeletonCount = 4,
  highlightId,
  highlightSignal,
}: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <FileCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardContent className="py-16">
          <div className="mx-auto flex max-w-sm flex-col items-center text-center animate-fade-in">
            <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary-glow/10">
              <Inbox className="h-10 w-10 text-primary" />
              <div className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-background shadow-[var(--shadow-card)]">
                <Upload className="h-4 w-4 text-primary" />
              </div>
            </div>
            <h3 className="mt-6 text-base font-semibold">{emptyTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
            {onUploadClick && (
              <Button
                onClick={onUploadClick}
                className="mt-6 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload files
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {files.map((f) => (
        <FileCard
          key={f.id}
          file={f}
          highlight={highlightId === f.id}
          highlightSignal={highlightSignal}
        />
      ))}
    </div>
  );
}
