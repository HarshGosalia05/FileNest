import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Folder } from "lucide-react";
import { FileList } from "@/components/file-list";
import { SearchBar } from "@/components/search-bar";
import { useAuth } from "@/lib/auth";
import { filterFiles, useFiles } from "@/lib/files";

export const Route = createFileRoute("/my-files")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "My Files — FileNest" },
      { name: "description", content: "Browse every file you've uploaded to FileNest." },
    ],
  }),
  component: MyFilesPage,
});

function MyFilesPage() {
  const { user, loading } = useAuth();
  const { q } = Route.useSearch();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const { data: files, isLoading } = useFiles(user.id);
  const filtered = filterFiles(files, q);
  const total = files?.length ?? 0;
  const trimmed = q.trim();
  const isSearching = trimmed.length > 0;
  const highlightId = isSearching && filtered.length > 0 ? filtered[0].id : null;

  const subtitle = isLoading
    ? "Loading your files…"
    : isSearching
      ? `${filtered.length} of ${total} match "${trimmed}"`
      : `${total} file${total === 1 ? "" : "s"} · newest first`;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger className="shrink-0" />
            <SearchBar placeholder="Search your files…" />
          </header>
          <main className="flex-1 px-4 py-8 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
              <section className="flex items-center gap-3 animate-fade-in">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-card)]">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My Files</h2>
                  <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                </div>
              </section>

              <FileList
                files={filtered}
                isLoading={isLoading}
                skeletonCount={6}
                highlightId={highlightId}
                highlightSignal={trimmed}
                emptyTitle={isSearching ? "No matching files found." : "No files yet."}
                emptyDescription={
                  isSearching
                    ? `Nothing in your workspace matches "${trimmed}". Try a different search term.`
                    : "Head to the dashboard to upload your first file."
                }
              />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

