"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AuthProvider } from "@/context/AuthContext";

// Ре-экспортируем настоящий AuthContext, чтобы существующие импорты работали
export { useAuth } from "@/context/AuthContext";
export type { CurrentUser } from "@/context/AuthContext";

/* ------------------------------- Тема ---------------------------------- */
interface ThemeCtx {
  theme: "dark" | "light";
  toggle: () => void;
}
const ThemeContext = createContext<ThemeCtx>({ theme: "dark", toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

/* ------------------------------ Сайдбар -------------------------------- */
interface SidebarCtx {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}
const SidebarContext = createContext<SidebarCtx>({
  collapsed: false,
  mobileOpen: false,
  toggle: () => {},
  openMobile: () => {},
  closeMobile: () => {},
});
export const useSidebar = () => useContext(SidebarContext);

/* ------------------------------- Тосты --------------------------------- */
interface Toast {
  id: number;
  text: string;
}
interface ToastCtx {
  toast: (text: string) => void;
}
const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

/* ------------------------------ Провайдер ------------------------------- */
export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    const t = (localStorage.getItem("sf-theme") as "dark" | "light") || "dark";
    setTheme(t);
    const c = localStorage.getItem("sf-sidebar");
    if (c === "1") setCollapsed(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("sf-theme", next);
      return next;
    });
  }, []);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const sidebarValue: SidebarCtx = {
    collapsed,
    mobileOpen,
    toggle: () => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setMobileOpen((v) => !v);
      } else {
        setCollapsed((v) => {
          localStorage.setItem("sf-sidebar", v ? "0" : "1");
          return !v;
        });
      }
    },
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <AuthProvider>
        <ThemeContext.Provider value={{ theme, toggle: toggleTheme }}>
          <SidebarContext.Provider value={sidebarValue}>
            {children}
            {/* Тосты */}
            <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className="toast-in rounded-xl bg-neutral-900 px-5 py-3 text-sm text-white shadow-pop dark:bg-white dark:text-neutral-900"
                >
                  {t.text}
                </div>
              ))}
            </div>
          </SidebarContext.Provider>
        </ThemeContext.Provider>
      </AuthProvider>
    </ToastContext.Provider>
  );
}
