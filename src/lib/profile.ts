import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export const profileQueryKey = (userId: string | undefined) => ["profile", userId] as const;
export const avatarQueryKey = (path: string | null | undefined) => ["avatar-url", path] as const;

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });
}

export function useUpdateProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "full_name" | "avatar_url">>) => {
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select()
        .single();
      if (error) throw error;
      // Also mirror full_name into auth user metadata so it's available everywhere.
      if (patch.full_name !== undefined) {
        await supabase.auth.updateUser({ data: { full_name: patch.full_name } });
      }
      return data as Profile;
    },
    onSuccess: (data) => {
      qc.setQueryData(profileQueryKey(userId), data);
    },
  });
}

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: avatarQueryKey(path),
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 55 * 60 * 1000,
  });
}

export function getInitials(fullName: string | null | undefined, fallback = "?"): string {
  if (!fullName) return fallback;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function displayNameOf(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  const n = fullName?.trim();
  if (n) return n;
  return email ?? "there";
}
