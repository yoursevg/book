import { useEffect, useMemo, useState } from "react";

function getInitialIsDark(): boolean {
  if (typeof document !== "undefined") {
    // Highest priority: actual DOM class
    if (document.documentElement.classList.contains("dark")) return true;
  }
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {}
  if (typeof window !== "undefined" && "matchMedia" in window) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => getInitialIsDark());

  useEffect(() => {
    const el = document.documentElement;

    // Observe class changes on <html>
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });

    // Listen to storage changes (other tabs/windows)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "theme") {
        setIsDark(getInitialIsDark());
      }
    };
    window.addEventListener("storage", onStorage);

    // Listen to system preference changes if user didn't force a theme
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMedia = () => setIsDark(getInitialIsDark());
    if (mq.addEventListener) mq.addEventListener("change", onMedia);
    else mq.addListener(onMedia);

    // Initial sync in case something changed before mount
    setIsDark(getInitialIsDark());

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", onStorage);
      if (mq.removeEventListener) mq.removeEventListener("change", onMedia);
      else mq.removeListener(onMedia);
    };
  }, []);

  // Stable boolean
  return useMemo(() => isDark, [isDark]);
}
