import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  LogOut,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Sparkles,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { useProfile, displayNameOf } from "@/lib/profile";
import { FileUpload } from "@/components/file-upload";
import { FileList } from "@/components/file-list";
import { SearchBar } from "@/components/search-bar";
import { useAuth } from "@/lib/auth";
import { computeStats, formatSize, useFiles } from "@/lib/files";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "Dashboard — FileNest" },
      { name: "description", content: "Manage your files in FileNest." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { q: _q } = Route.useSearch();
  void _q; // search is handled by /my-files; retained for URL compatibility

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const { data: profile } = useProfile(user.id);
  const displayName = displayNameOf(profile?.full_name, user.email);
  const { data: files, isLoading } = useFiles(user.id);
  const stats = computeStats(files ?? []);
  const totalGb = 15;
  const usedGb = stats.bytes / (1024 * 1024 * 1024);
  const pct = Math.min(100, Math.round((usedGb / totalGb) * 100));
  const recent = (files ?? []).slice(0, 6);


  const handleLogout = async () => {
    await signOut();
    toast("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          {/* Top nav */}
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger className="shrink-0" />
            <SearchBar placeholder="Search files, folders…" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <UserAvatar
                    fullName={profile?.full_name}
                    email={user.email}
                    avatarPath={profile?.avatar_url}
                    className="h-9 w-9"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 animate-in fade-in-0 zoom-in-95"
              >
                <DropdownMenuLabel className="truncate">
                  <div className="truncate text-sm font-semibold">{displayName}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <UserIcon className="mr-2 h-4 w-4" /> My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Settings — coming soon")}>
                  <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Main */}
          <main className="flex-1 px-4 py-8 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-8">
              {/* Welcome */}
              <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between animate-fade-in">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Welcome back</span>
                  </div>
                  <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Hi, {displayName} 👋
                  </h1>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={() => document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="shrink-0 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.02]"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </section>

              {/* Stat cards */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="border-border/60 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-soft)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Storage used
                    </CardTitle>
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <HardDrive className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatSize(stats.bytes)}{" "}
                      <span className="text-base font-medium text-muted-foreground">/ {totalGb} GB</span>
                    </div>
                    <Progress value={pct} className="mt-3 h-2" />
                    <p className="mt-2 text-xs text-muted-foreground">{pct}% of your plan used</p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-soft)]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.docs}</div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {stats.docs === 0 ? "No documents yet" : "Documents in your workspace"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-soft)] sm:col-span-2 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Media</CardTitle>
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.media}</div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {stats.media === 0 ? "No images or videos yet" : "Images, video & audio"}
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Upload */}
              <section id="upload-section">
                <FileUpload />
              </section>

              {/* Recent Files */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Recent files</h2>
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                    <Link to="/my-files">View all</Link>
                  </Button>
                </div>
                <FileList
                  files={recent}
                  isLoading={isLoading}
                  onUploadClick={() =>
                    document
                      .getElementById("upload-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  emptyTitle="No files uploaded yet."
                  emptyDescription="Upload your first file to get started. Your recent activity will appear here."
                />

              </section>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
