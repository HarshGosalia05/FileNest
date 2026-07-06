import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudUpload, FolderLock, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FileNest — Your files, beautifully organized" },
      {
        name: "description",
        content:
          "Choose your space: a private workspace for your files, or public class resources anyone can access.",
      },
      { property: "og:title", content: "FileNest — Your files, beautifully organized" },
      {
        property: "og:description",
        content:
          "Choose your space: a private workspace for your files, or public class resources anyone can access.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-primary-glow/20 blur-3xl" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]">
            <CloudUpload className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">FileNest</span>
        </Link>
        <Link to="/login">
          <Button variant="ghost" className="text-sm font-medium">
            Sign in
          </Button>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            Welcome to FileNest
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Pick a space to get started — keep files private in your workspace, or share
            resources with your whole class.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="group relative flex flex-col overflow-hidden border-border/60 bg-card/80 p-8 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lg animate-fade-in">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]">
              <FolderLock className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              <span aria-hidden className="mr-2">📁</span>My Workspace
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Store and manage your personal files securely.
            </p>
            <Link to="/login" className="mt-6">
              <Button className="h-11 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)] transition-transform group-hover:scale-[1.01]">
                Open Workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>

          <Card className="group relative flex flex-col overflow-hidden border-border/60 bg-card/80 p-8 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lg animate-fade-in">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              <span aria-hidden className="mr-2">🎓</span>Class Resources
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Access and share class files without logging in.
            </p>
            <Link to="/class-resources" className="mt-6">
              <Button
                variant="outline"
                className="h-11 w-full border-primary/40 transition-transform group-hover:scale-[1.01]"
              >
                Open Class Resources
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}
