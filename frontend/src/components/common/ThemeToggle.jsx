import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// <ThemeToggle />            -> inline button for headers
// <ThemeToggle floating />   -> fixed top-right button (for pages without a header)
export default function ThemeToggle({ floating = false }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${floating ? "floating" : ""}`}
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      <span className="theme-toggle-label">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}