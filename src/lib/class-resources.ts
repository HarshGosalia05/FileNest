import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ClassResourceRow = Tables<"class_resources">;

export const CLASS_BUCKET = "class-resources";
export const classResourcesQueryKey = ["class_resources"] as const;

type AuthUser = { id: string } | null | undefined;

/** Narrows to a signed-in user id, so callers can keep using `user` after the check. */
export function isSignedIn(user: AuthUser): user is { id: string } {
  return typeof user?.id === "string" && user.id.length > 0;
}

/**
 * The single source of truth for who may contribute to (and therefore remove from)
 * Class Resources.
 *
 * Class Resources are intentionally public to read, but writing is restricted to signed-in
 * users. Uploads are written to storage under `<auth uid>/...`, which is what the RLS
 * policies key off — see `20260706152507_cb686e5c-...sql` (table) and
 * `20260930120000_b182e211-...sql` (delete).
 *
 * This helper only drives *UI affordances*. It is never the security boundary: the browser
 * holds only the publishable anon key, so any caller can hit the REST/storage API directly,
 * and the database rejects unauthorized deletes regardless of what the frontend renders.
 */
export function canUploadClassResources(user: AuthUser): boolean {
  return isSignedIn(user);
}

/**
 * A class resource may be deleted only by the user who uploaded it. Rows whose uploader was
 * removed (`uploaded_by` is `ON DELETE SET NULL`, so it becomes NULL) are deliberately not
 * deletable by anyone, matching the RLS policy which never matches a NULL `auth.uid()`.
 */
export function canDeleteClassResource(
  user: AuthUser,
  file: Pick<ClassResourceRow, "uploaded_by">,
): boolean {
  if (!isSignedIn(user)) return false;
  return typeof file.uploaded_by === "string" && file.uploaded_by === user.id;
}

/**
 * Deletes a class resource: the storage object first, then the database row.
 *
 * Security notes:
 * - The storage policy is scoped to the caller's own folder, so a caller who does not own
 *   the file is rejected on the very first call and nothing is mutated. This is the
 *   fail-closed gate; the `canDeleteClassResource` check in the UI is only a courtesy that
 *   avoids a pointless round trip.
 * - The row delete uses `.select(...)` because PostgREST reports an RLS-blocked DELETE as a
 *   *success* with an empty result set. Without it we could not distinguish "denied" from
 *   "deleted".
 * - Storage is removed before the row so a storage failure leaves the row intact and
 *   retryable, rather than a live public row pointing at a missing object.
 */
export function useDeleteClassResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: ClassResourceRow) => {
      const { error: storageError } = await supabase.storage
        .from(CLASS_BUCKET)
        .remove([file.storage_path]);
      if (storageError) throw storageError;

      const { data, error } = await supabase
        .from("class_resources")
        .delete()
        .eq("id", file.id)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("You do not have permission to delete this file.");
      }

      return data[0].id;
    },
    onSuccess: (_id, file) => {
      toast.success(`Deleted ${file.original_name}`);
      queryClient.invalidateQueries({ queryKey: classResourcesQueryKey });
    },
    onError: (e) => {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : "unknown"}`);
    },
  });
}

async function fetchClassResources(): Promise<ClassResourceRow[]> {
  const { data, error } = await supabase
    .from("class_resources")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useClassResources() {
  return useQuery({
    queryKey: classResourcesQueryKey,
    queryFn: fetchClassResources,
  });
}
