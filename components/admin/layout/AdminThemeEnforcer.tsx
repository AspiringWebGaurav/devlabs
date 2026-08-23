"use client";

import { useEffect } from "react";

/**
 * Enforces pure light Swiss theme on html/body while inside /admin/* routes,
 * preventing any dark theme flashes during new tab loads or client navigation.
 */
export function AdminThemeEnforcer() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");

    // Remove dark class in admin panel
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    return () => {
      // Restore dark theme when unmounting back to main portfolio
      if (hadDark) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);

  return null;
}
