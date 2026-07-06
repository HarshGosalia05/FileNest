import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ClassResourceRow = Tables<"class_resources">;

export const CLASS_BUCKET = "class-resources";
export const classResourcesQueryKey = ["class_resources"] as const;

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
