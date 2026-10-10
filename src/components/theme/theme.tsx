"use client";

import { useEffect } from "react";
import type { ThemePreference } from "@/lib/account/preferences";
import { themeStorageKey } from "./boot";

export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }

  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // A private browser can block storage. The profile still has the choice.
  }
}

export function ThemeSync({ theme }: { theme: ThemePreference }) {
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return null;
}
