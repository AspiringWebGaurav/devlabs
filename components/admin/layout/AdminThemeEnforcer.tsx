"use client";

import { useEffect, useLayoutEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Enforces pure light Swiss theme on html/body while inside /admin/* routes,
 * eliminating any dark theme flashes during new tab loads, navigation, or hard refreshes.
 */
export function AdminThemeEnforcer() {
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");

    // Synchronously strip dark class before browser paint
    root.classList.remove("dark");
    root.style.backgroundColor = "#FAFAFA";
    root.style.colorScheme = "light";

    if (document.body) {
      document.body.style.backgroundColor = "#FAFAFA";
      document.body.style.color = "#000000";
    }

    return () => {
      // Restore dark theme when unmounting back to main portfolio
      if (hadDark) {
        root.classList.add("dark");
        root.style.backgroundColor = "";
        root.style.colorScheme = "dark";
        if (document.body) {
          document.body.style.backgroundColor = "";
          document.body.style.color = "";
        }
      }
    };
  }, []);

  return null;
}
