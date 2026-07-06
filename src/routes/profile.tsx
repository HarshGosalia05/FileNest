import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Camera, Lock, Mail, Save, ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile, useUpdateProfile, useAvatarUrl, getInitials } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — FileNest" },
      { name: "description", content: "Manage your FileNest profile and account security." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger className="shrink-0" />
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">My Profile</h1>
          </header>
          <main className="flex-1 px-4 py-8 sm:px-8">
            <div className="mx-auto flex max-w-4xl flex-col gap-8">
              <ProfileInfoCard userId={user.id} email={user.email ?? ""} />
              <SecurityCard email={user.email ?? ""} onSignedOut={() => navigate({ to: "/login" })} />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function ProfileInfoCard({ userId, email }: { userId: string; email: string }) {
  const { data: profile, isLoading } = useProfile(userId);
  const update = useUpdateProfile(userId);
  const { data: avatarSignedUrl } = useAvatarUrl(profile?.avatar_url ?? null);

  const [fullName, setFullName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
  }, [profile]);

  const initials = getInitials(fullName || email);
  const created = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const handleAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      // Best-effort cleanup of previous avatar
      if (profile?.avatar_url && profile.avatar_url !== path) {
        await supabase.storage.from("avatars").remove([profile.avatar_url]);
      }
      await update.mutateAsync({ avatar_url: path });
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload picture");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = z
      .string()
      .trim()
      .min(2, "Please enter your full name")
      .max(80, "Name must be under 80 characters")
      .safeParse(fullName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    try {
      await update.mutateAsync({ full_name: parsed.data });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)] animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserIcon className="h-5 w-5 text-primary" />
          Profile information
        </CardTitle>
        <CardDescription>Update your personal details and profile picture.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border border-border shadow-[var(--shadow-card)]">
                {avatarSignedUrl ? (
                  <AvatarImage src={avatarSignedUrl} alt={fullName || email} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-2xl font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-input"
                className="absolute -bottom-1 -right-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)] transition hover:scale-105"
                title="Change picture"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatar(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-lg font-semibold tracking-tight">
                {isLoading ? "Loading…" : fullName || "Add your name"}
              </div>
              <div className="text-sm text-muted-foreground">{email}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG or JPG, up to 3 MB.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 pl-9"
                  placeholder="Your full name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_ro">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email_ro"
                  value={email}
                  readOnly
                  className="h-11 cursor-not-allowed pl-9 opacity-80"
                />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Account created</Label>
              <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {created}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={update.isPending}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]"
            >
              <Save className="mr-2 h-4 w-4" />
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SecurityCard({ email, onSignedOut }: { email: string; onSignedOut: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const schema = z
      .object({
        current: z.string().min(1, "Enter your current password"),
        next: z.string().min(6, "New password must be at least 6 characters"),
        confirm: z.string(),
      })
      .refine((v) => v.next === v.confirm, {
        message: "Passwords do not match",
        path: ["confirm"],
      });
    const parsed = schema.safeParse({ current, next, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      // Verify current password by re-authenticating.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: parsed.data.current,
      });
      if (signInErr) {
        toast.error("Current password is incorrect");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
      void onSignedOut; // no forced sign-out — session remains valid
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)] animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Security
        </CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="current">Current password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="h-11 pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="h-11 pl-9"
                placeholder="At least 6 characters"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 pl-9"
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
