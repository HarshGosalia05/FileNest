import { Search, X } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

/**
 * Global filename search. Typing navigates to /my-files with `?q=` so
 * the matching file is scrolled into view and briefly highlighted there.
 */
export function SearchBar({ placeholder = "Search files…" }: { placeholder?: string }) {
  const navigate = useNavigate();
  const { pathname, searchStr } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
  });
  const urlQ = (() => {
    const params = new URLSearchParams(searchStr);
    return params.get("q") ?? "";
  })();
  const [value, setValue] = useState(urlQ);

  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  // Debounced navigation. Always route the query through /my-files so a
  // single page owns the "scroll to and highlight" behavior.
  useEffect(() => {
    const t = setTimeout(() => {
      const onMyFiles = pathname === "/my-files";
      if (onMyFiles) {
        if (value === urlQ) return;
      } else if (!value) {
        // don't teleport to /my-files just because the search bar mounted
        return;
      }
      navigate({
        to: "/my-files",
        search: { q: value || undefined } as never,
        replace: true,
      });
    }, 150);
    return () => clearTimeout(t);
  }, [value, urlQ, pathname, navigate]);


  return (
    <div className="relative mx-auto flex w-full max-w-xl items-center">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-full pl-9 pr-9 bg-muted/60 border-transparent focus-visible:bg-background"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
