import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type FileRow = Tables<"files">;

export const filesQueryKey = (userId: string | undefined) => ["files", userId] as const;

async function fetchFiles(userId: string): Promise<FileRow[]> {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useFiles(userId: string | undefined) {
  return useQuery({
    queryKey: filesQueryKey(userId),
    queryFn: () => fetchFiles(userId as string),
    enabled: !!userId,
  });
}

const MEDIA_EXTS = new Set([
  "png","jpg","jpeg","gif","webp","svg","bmp",
  "mp4","mov","avi","mkv","webm",
  "mp3","wav","ogg","m4a",
]);
const IMAGE_EXTS = new Set(["png","jpg","jpeg","gif","webp","svg","bmp"]);
const VIDEO_EXTS = new Set(["mp4","mov","avi","mkv","webm"]);
const AUDIO_EXTS = new Set(["mp3","wav","ogg","m4a"]);
const ARCHIVE_EXTS = new Set(["zip","rar","7z"]);
const CODE_EXTS = new Set(["js","jsx","ts","tsx","html","css","scss","java","c","cpp","h","hpp","cs","go","rs","rb","php","sh","sql","py","ipynb","json","xml","yaml","yml","md"]);
const DOC_EXTS = new Set(["pdf","doc","docx","ppt","pptx","xls","xlsx","txt","csv"]);

export function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export type FileKind = "image" | "video" | "audio" | "archive" | "code" | "doc" | "other";

export function kindOf(name: string): FileKind {
  const e = extOf(name);
  if (IMAGE_EXTS.has(e)) return "image";
  if (VIDEO_EXTS.has(e)) return "video";
  if (AUDIO_EXTS.has(e)) return "audio";
  if (ARCHIVE_EXTS.has(e)) return "archive";
  if (CODE_EXTS.has(e)) return "code";
  if (DOC_EXTS.has(e)) return "doc";
  return "other";
}

export function isMedia(name: string) {
  return MEDIA_EXTS.has(extOf(name));
}
export function isDocument(name: string) {
  return DOC_EXTS.has(extOf(name));
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function filterFiles(files: FileRow[] | undefined, query: string): FileRow[] {
  if (!files) return [];
  const q = query.trim().toLowerCase();
  if (!q) return files;
  return files.filter((f) => f.original_name.toLowerCase().includes(q));
}

export function isPreviewableImage(name: string) {
  return IMAGE_EXTS.has(extOf(name));
}
export function isPreviewablePdf(name: string) {
  return extOf(name) === "pdf";
}

export function computeStats(files: FileRow[]) {
  let docs = 0;
  let media = 0;
  let bytes = 0;
  for (const f of files) {
    bytes += Number(f.file_size) || 0;
    if (isMedia(f.original_name)) media++;
    else if (isDocument(f.original_name)) docs++;
  }
  return { docs, media, bytes, total: files.length };
}
