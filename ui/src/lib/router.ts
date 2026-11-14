import { useEffect, useState } from "react";

export type Route = "home" | "overview" | "body" | "trends" | "live" | "routine" | "guide";
const routes: Route[] = ["home", "overview", "body", "trends", "live", "routine", "guide"];

function read(): Route {
  const r = location.hash.replace(/^#\/?/, "") as Route;
  return routes.includes(r) ? r : "home";
}

/** Tiny hash router so every view has a shareable link and Back works. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo({ top: 0 });
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (r: Route) => {
  location.hash = r === "home" ? "/" : `/${r}`;
};
