import { Link, useLocation } from "@tanstack/react-router";
import { Sun, Moon, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useThemeMode } from "@/hooks/useThemeMode";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Додзё" },
  { to: "/play", label: "Дуэль" },
  { to: "/daily", label: "Дуэль дня" },
  { to: "/leaderboard", label: "Рейтинг" },
  { to: "/shop", label: "Лавка" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { mode, toggle } = useThemeMode();
  const loc = useLocation();
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 backdrop-blur-md bg-background/70 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="font-zen text-2xl text-primary leading-none">浪人</span>
            <span className="font-serif tracking-[0.3em] text-sm text-foreground hidden sm:inline">RONIN</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((n) => {
              const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "px-3 py-1.5 text-xs sm:text-sm rounded-md font-serif tracking-wider transition-colors whitespace-nowrap",
                    active
                      ? "text-primary bg-surface-2 border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Сменить тему"
              className="h-8 w-8 grid place-items-center rounded-md border border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="h-8 px-3 grid place-items-center rounded-md border border-border hover:border-primary text-xs gap-2 hidden sm:flex"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5" />
                  )}
                  Профиль
                </Link>
                <button
                  onClick={handleLogout}
                  className="h-8 w-8 grid place-items-center rounded-md border border-border hover:border-destructive text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Выйти"
                  title="Выйти"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="h-8 px-3 flex items-center gap-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
              >
                <LogIn className="h-3.5 w-3.5" /> Войти
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/40 mt-12 py-6 text-center text-xs text-muted-foreground">
        <span className="font-zen text-base text-primary mr-3">禅</span>
        RONIN · Mahjong для тех, кто ищет путь · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
