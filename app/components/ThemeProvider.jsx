"use client";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeCtx = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export default function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("apudesk_dark_mode");
    if (saved === "1") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = (value) => {
    const next = value !== undefined ? value : !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("apudesk_dark_mode", "1");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("apudesk_dark_mode", "0");
    }
  };

  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}
