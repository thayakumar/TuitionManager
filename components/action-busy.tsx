"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

const BusyContext = createContext<(label: string) => () => void>(
  () => () => {},
);

/** Foreground actions opt in; autosaves and notification polls must stay unobtrusive. */
export function useActionBusy(active: boolean, label = "Saving changes…") {
  const register = useContext(BusyContext);
  useEffect(() => {
    if (active) return register(label);
  }, [active, label, register]);
}

/** Place inside a native server-action form to report React's actual pending state. */
export function FormBusy({ label = "Saving changes…" }: { label?: string }) {
  const { pending } = useFormStatus();
  useActionBusy(pending, label);
  return null;
}

export function BusyProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentPath = useRef(pathname);
  const [actions, setActions] = useState<Map<symbol, string>>(() => new Map());
  const [navigating, setNavigating] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const app = useRef<HTMLDivElement>(null);
  const register = useCallback((label: string) => {
    const key = Symbol(label);
    setActions((current) => new Map(current).set(key, label));
    return () =>
      setActions((current) => {
        const next = new Map(current);
        next.delete(key);
        return next;
      });
  }, []);
  useEffect(() => {
    currentPath.current = pathname;
    setNavigating(false);
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
  }, [pathname]);
  useEffect(() => {
    function startNavigation() {
      setNavigating(true);
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
      // A cancelled/failed navigation must not trap the old page behind an overlay.
      navigationTimer.current = setTimeout(() => setNavigating(false), 20000);
    }
    const click = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (
        event.target as Element | null
      )?.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.dataset.busyIgnore !== undefined
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname)
        return;
      startNavigation();
    };
    const popstate = () => {
      if (location.pathname !== currentPath.current) startNavigation();
    };
    document.addEventListener("click", click);
    window.addEventListener("popstate", popstate);
    const refreshLoading = () => {
      if (
        Array.from(
          document.querySelectorAll<HTMLElement>("[data-page-error]"),
        ).some((node) => node.getClientRects().length > 0)
      ) {
        setNavigating(false);
        if (navigationTimer.current) clearTimeout(navigationTimer.current);
      }
      const showing = Array.from(
        document.querySelectorAll<HTMLElement>("[data-page-loading]"),
      ).some(
        (node) => node.getClientRects().length > 0 && !node.closest("[hidden]"),
      );
      setStreaming(showing);
    };
    const observer = new MutationObserver(refreshLoading);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "style"],
    });
    refreshLoading();
    return () => {
      document.removeEventListener("click", click);
      window.removeEventListener("popstate", popstate);
      observer.disconnect();
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    };
  }, []);
  const busy = actions.size > 0 || navigating || streaming;
  useEffect(() => {
    if (!busy) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const host = app.current;
    if (host) host.inert = true;
    const blockBackgroundKeys = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (["Enter", " ", "Tab", "Escape"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("keydown", blockBackgroundKeys, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (host) host.inert = false;
      document.removeEventListener("keydown", blockBackgroundKeys, true);
    };
  }, [busy]);
  const label = actions.size
    ? Array.from(actions.values()).at(-1)
    : "Loading page…";
  return (
    <BusyContext.Provider value={register}>
      <div ref={app} data-busy-root="true" aria-busy={busy || undefined}>
        {children}
      </div>
      {busy && (
        <div
          data-action-busy="true"
          className="fixed inset-0 z-[2147483000] grid cursor-wait place-items-center bg-background/75 p-6 backdrop-blur-[2px]"
        >
          <div
            role="status"
            aria-live="polite"
            className="flex max-w-sm items-center gap-4 rounded-2xl border border-border bg-card px-6 py-5 text-base font-semibold shadow-xl"
          >
            <LoaderCircle
              size={26}
              className="shrink-0 animate-spin text-primary motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>{label}</span>
          </div>
        </div>
      )}
    </BusyContext.Provider>
  );
}
