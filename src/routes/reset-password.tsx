import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CloudUpload, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — FileNest" },
      { name: "description", content: "Set a new password for your FileNest account." },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setReady(true);
        setVerifying(false);
        setVerifyError(null);
      }
    });

    const finish = (err: string | null) => {
      if (cancelled) return;
      setVerifying(false);
      if (err) setVerifyError(err);
    };

    const verify = async () => {
      try {
        const url = new URL(window.location.href);
        const rawHash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(rawHash);

        const errorDesc =
          url.searchParams.get("error_description") || hashParams.get("error_description");
        if (errorDesc) {
          finish(errorDesc.replace(/\+/g, " "));
          return;
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (cancelled) return;
          window.history.replaceState(null, "", window.location.pathname);
          if (error) return finish(error.message);
          setReady(true);
          return finish(null);
        }

        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          window.history.replaceState(null, "", window.location.pathname);
          if (error) return finish(error.message);
          setReady(true);
          return finish(null);
        }

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setReady(true);
          finish(null);
        } else {
          finish(
            "This password reset link is invalid or has expired. Please request a new one.",
          );
        }
      } catch (e) {
        finish(e instanceof Error ? e.message : "Verification failed");
      }
    };

    verify();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-border/60 bg-card/80 p-8 shadow-[var(--shadow-soft)] backdrop-blur-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)]">
            <CloudUpload className="h-6 w-6" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">FileNest</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Reset your password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {verifying
              ? "Verifying reset link…"
              : verifyError
                ? verifyError
                : "Enter and confirm your new password below."}
          </p>
        </div>

        {!verifying && verifyError && (
          <p className="mb-4 text-sm text-destructive">
            <a href="/forgot-password" className="font-medium underline">
              Request a new reset link
            </a>
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="h-11 pl-9"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || !ready}
            className="h-11 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.01]"
          >
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
