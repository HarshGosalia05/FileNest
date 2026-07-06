import { createFileRoute, Link } from "@tanstack/react-router";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Inbox, LogIn } from "lucide-react";
import { ClassResourceCard } from "@/components/class-resource-card";
import { ClassResourceUpload } from "@/components/class-resource-upload";
import { useClassResources } from "@/lib/class-resources";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/class-resources")({
  head: () => ({
    meta: [
      { title: "Class Resources — FileNest" },
      {
        name: "description",
        content:
          "Publicly shared class files on FileNest — preview and download without an account.",
      },
      { property: "og:title", content: "Class Resources — FileNest" },
      {
        property: "og:description",
        content: "Publicly shared class files on FileNest.",
      },
    ],
  }),
  component: ClassResourcesPage,
});

function ClassResourcesPage() {
  const { user, loading } = useAuth();
  const { data: files, isLoading } = useClassResources();
  const total = files?.length ?? 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="shrink-0" />
              <span className="text-sm font-medium text-muted-foreground">Public library</span>
            </div>
            {!loading && !user && (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            )}
          </header>
          <main className="flex-1 px-4 py-8 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
              <section className="flex items-center gap-3 animate-fade-in">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-card)]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Class Resources
                  </h1>
                  <p className="truncate text-sm text-muted-foreground">
                    {isLoading
                      ? "Loading shared files…"
                      : `${total} file${total === 1 ? "" : "s"} available to everyone`}
                  </p>
                </div>
              </section>

              {user && <ClassResourceUpload />}

              <section>
                {isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="flex items-center gap-3 border-border/60 p-3 shadow-[var(--shadow-card)] sm:p-4">
                        <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : !files || files.length === 0 ? (
                  <Card className="border-border/60 shadow-[var(--shadow-card)]">
                    <CardContent className="py-16">
                      <div className="mx-auto flex max-w-sm flex-col items-center text-center animate-fade-in">
                        <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary-glow/10">
                          <Inbox className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="mt-6 text-base font-semibold">No class resources yet.</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {user
                            ? "Upload the first file to share it with everyone."
                            : "Check back soon — nothing has been shared here yet."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {files.map((f) => (
                      <ClassResourceCard key={f.id} file={f} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
