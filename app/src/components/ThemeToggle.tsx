import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, systemPrefersDark, type Theme } from "../lib/theme";
import Icon, { type IconName } from "./Icon";

/** Zyklus: System -> Hell -> Dunkel -> System. */
export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme | null>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const next = (): Theme | null => {
    if (theme === null) return systemPrefersDark() ? "light" : "dark"; // erster Klick geht in die "andere" Richtung
    if (theme === "dark") return "light";
    return null; // zurück zu System
  };

  const icon: IconName = theme === "dark" ? "moon" : theme === "light" ? "sun" : "auto";
  const text = theme === "dark" ? "Dunkel" : theme === "light" ? "Hell" : "System";

  return (
    <button
      onClick={() => setThemeState(next())}
      aria-label={`Farbschema: ${text}. Klicken zum Wechseln.`}
      title="Farbschema wechseln"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        border: "1px solid var(--color-border)",
        background: "transparent",
        color: "inherit",
        borderRadius: "0.5rem",
        padding: "0.35rem 0.6rem",
        cursor: "pointer",
      }}
    >
      <Icon name={icon} size={18} />
      {text}
    </button>
  );
}
