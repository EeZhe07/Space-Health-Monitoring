import { useEffect, useState } from "react";

/** Registers the offline cache (production builds only; the dev server reloads too often). */
export function registerOffline() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js");
      const reg = await navigator.serviceWorker.ready;
      // Cache everything this first visit already downloaded (scripts, styles, fonts).
      const urls = performance.getEntriesByType("resource").map((r) => r.name).filter((u) => u.startsWith("http"));
      reg.active?.postMessage({ type: "cache", urls: [location.href.split("#")[0], ...urls] });
    } catch {
      // Offline support is a bonus; the app works without it.
    }
  });
}

/** True while the device has a network connection. */
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    addEventListener("online", on);
    addEventListener("offline", on);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", on);
    };
  }, []);
  return online;
}

export type OfflineStatus = "dev" | "unsupported" | "preparing" | "ready";

/** Whether this device has a saved copy of the app that opens with no connection. */
export function useOfflineStatus(): OfflineStatus {
  const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const [status, setStatus] = useState<OfflineStatus>(!import.meta.env.PROD ? "dev" : supported ? "preparing" : "unsupported");
  useEffect(() => {
    if (status !== "preparing") return;
    let alive = true;
    const check = async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const saved = reg?.active && (await caches.match("./"));
      if (alive && saved) setStatus("ready");
    };
    void check();
    const id = setInterval(check, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [status]);
  return status;
}
