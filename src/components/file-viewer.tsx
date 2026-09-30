import { useEffect, useState } from "react";
import { FileText, Loader2, Music } from "lucide-react";
import { extOf, type PreviewKind } from "@/lib/files";

const MAX_TEXT_BYTES = 5 * 1024 * 1024;

function stripAnsi(value: string) {
  let out = "";
  let i = 0;
  while (i < value.length) {
    const ch = value[i];
    if (ch === "\u001b" && value[i + 1] === "[") {
      i += 2;
      while (i < value.length && /[\d;]/.test(value[i])) i++;
      if (i < value.length) i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

interface Props {
  url: string;
  name: string;
  kind: PreviewKind;
  size?: number;
}

export function UnavailableFallback({ name }: { name?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="h-7 w-7" />
      </div>
      <div>
        <h3 className="text-base font-semibold">Preview isn't available</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{name ? `.${extOf(name)}` : "This"}</span>{" "}
          file can't be previewed in the browser. You can download it to open on your device.
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="grid h-[60vh] place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function joinText(value: unknown): string {
  if (Array.isArray(value)) return value.join("");
  return typeof value === "string" ? value : "";
}

interface NbOutput {
  output_type?: string;
  text?: unknown;
  data?: Record<string, unknown>;
  traceback?: unknown;
  ename?: string;
  evalue?: string;
}

interface NbCell {
  cell_type?: string;
  source?: unknown;
  outputs?: NbOutput[];
}

function isNotebook(value: unknown): value is { cells: NbCell[] } {
  if (!value || typeof value !== "object") return false;
  const cells = (value as { cells?: unknown }).cells;
  return Array.isArray(cells);
}

function OutputBlock({ output }: { output: NbOutput }) {
  const data = output.data;

  if (data && typeof data === "object") {
    const png = data["image/png"];
    if (png) {
      return (
        <img
          src={`data:image/png;base64,${joinText(png)}`}
          alt="cell output"
          className="max-w-full rounded-md border border-border/60 bg-background"
        />
      );
    }
    const jpeg = data["image/jpeg"];
    if (jpeg) {
      return (
        <img
          src={`data:image/jpeg;base64,${joinText(jpeg)}`}
          alt="cell output"
          className="max-w-full rounded-md border border-border/60 bg-background"
        />
      );
    }
    const svg = data["image/svg+xml"];
    if (svg) {
      const raw = joinText(svg);
      const src = raw.includes("<svg")
        ? `data:image/svg+xml;utf8,${encodeURIComponent(raw)}`
        : `data:image/svg+xml;base64,${raw}`;
      return (
        <img
          src={src}
          alt="cell output"
          className="max-w-full rounded-md border border-border/60 bg-background"
        />
      );
    }
    const html = data["text/html"];
    if (html) {
      return (
        <div className="max-h-72 overflow-auto rounded-md border border-border/60 bg-background p-3">
          <div dangerouslySetInnerHTML={{ __html: joinText(html) }} />
        </div>
      );
    }
    const plain = data["text/plain"];
    if (plain) {
      return (
        <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-background p-3 text-xs leading-relaxed">
          {joinText(plain)}
        </pre>
      );
    }
    return null;
  }

  if (output.output_type === "error") {
    const detail = output.traceback
      ? joinText(output.traceback)
      : `${output.ename ?? "Error"}: ${output.evalue ?? ""}`;
    return (
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
        {stripAnsi(detail)}
      </pre>
    );
  }

  const text = joinText(output.text);
  if (text) {
    return (
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-background p-3 text-xs leading-relaxed">
        {stripAnsi(text)}
      </pre>
    );
  }

  return null;
}

function NotebookView({ text }: { text: string }) {
  let cells: NbCell[] | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (isNotebook(parsed)) cells = parsed.cells;
  } catch {
    cells = null;
  }

  if (!cells) {
    return <TextView text={text} />;
  }

  return (
    <div className="max-h-[70vh] space-y-4 overflow-auto bg-background p-4">
      {cells.map((cell, i) => {
        const source = joinText(cell.source).replace(/\s+$/, "");
        const cellType = cell.cell_type ?? "code";
        if (!source && !(cell.outputs?.length ?? 0)) return null;
        return (
          <div
            key={i}
            className={`overflow-hidden rounded-lg border border-border/60 ${
              cellType === "code" ? "bg-card" : "bg-background"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {cellType === "markdown" ? "Markdown" : cellType === "raw" ? "Raw" : "Code"}
              </span>
              <span className="text-[10px] text-muted-foreground">[{i}]</span>
            </div>
            {source && (
              <pre
                className={
                  cellType === "code"
                    ? "overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed"
                    : "whitespace-pre-wrap break-words p-3 text-sm leading-relaxed"
                }
              >
                {source}
              </pre>
            )}
            {cell.outputs && cell.outputs.length > 0 && (
              <div className="space-y-2 border-t border-border/60 bg-muted/20 p-3">
                {cell.outputs.map((output, j) => (
                  <OutputBlock key={j} output={output} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TextView({ text }: { text: string }) {
  return (
    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words bg-background p-4 font-mono text-xs leading-relaxed">
      {text}
    </pre>
  );
}

export function FileViewer({ url, name, kind, size }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const needsText = kind === "text" || kind === "notebook";
  const tooLarge = (size ?? 0) > MAX_TEXT_BYTES;

  useEffect(() => {
    if (!needsText) return;
    if (tooLarge) return;
    let cancelled = false;
    setLoading(true);
    setFailed(null);
    setContent(null);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        const head = buf.subarray(0, Math.min(buf.length, 8000));
        if (head.includes(0)) {
          if (!cancelled) setFailed("binary");
          return;
        }
        const text = new TextDecoder("utf-8").decode(buf);
        if (text.includes("\uFFFD")) {
          if (!cancelled) setFailed("binary");
        } else if (!cancelled) {
          setContent(text);
        }
      } catch (e) {
        if (!cancelled) setFailed(e instanceof Error ? e.message : "unknown");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, needsText, tooLarge]);

  if (needsText) {
    if (tooLarge) return <UnavailableFallback name={name} />;
    if (loading) return <Spinner />;
    if (failed) {
      if (failed === "binary") return <UnavailableFallback name={name} />;
      return (
        <div className="grid h-[40vh] place-items-center px-6 text-center text-sm text-destructive">
          Couldn't load preview: {failed}
        </div>
      );
    }
    if (content === null) return <Spinner />;
    return kind === "notebook" ? <NotebookView text={content} /> : <TextView text={content} />;
  }

  if (kind === "image") {
    return (
      <div className="grid max-h-[70vh] place-items-center overflow-auto p-4">
        <img
          src={url}
          alt={name}
          className="max-h-[65vh] w-auto rounded-lg object-contain shadow-[var(--shadow-card)]"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="grid max-h-[70vh] place-items-center overflow-auto bg-background p-4">
        <video src={url} controls className="max-h-[64vh] w-full rounded-lg bg-black">
          Your browser doesn't support video playback.
        </video>
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="grid h-[40vh] place-items-center px-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Music className="h-7 w-7" />
          </div>
          <p className="truncate text-sm font-medium">{name}</p>
          <audio src={url} controls className="w-full">
            Your browser doesn't support audio playback.
          </audio>
        </div>
      </div>
    );
  }

  return <iframe title={name} src={url} className="h-[70vh] w-full border-0 bg-background" />;
}
