import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/profile-sync";


export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Войти · RONIN" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          await ensureUserProfile(data.user);
          toast.success("Аккаунт создан. Добро пожаловать в Додзё.");
          nav({ to: "/play" });
        } else {
          toast.success("Готово! Проверь почту для подтверждения, затем войди.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("С возвращением, ронин.");
        nav({ to: "/play" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="min-h-[calc(100vh-200px)] grid place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface/70 backdrop-blur p-8">
        <div className="text-center mb-6">
          <div className="font-zen text-5xl text-primary">浪人</div>
          <h1 className="font-serif text-2xl mt-2">{mode === "login" ? "Вход в Додзё" : "Стать ронином"}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "login" ? "Продолжи свой путь" : "Создай нового странника"}
          </p>
        </div>

        <button
          onClick={googleLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-md border border-border hover:border-primary text-sm flex items-center justify-center gap-2 mb-4"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Продолжить с Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">или</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя ронина" className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm" />
          )}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm" />
          <button disabled={loading} type="submit" className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-serif tracking-wider">
            {loading ? "..." : mode === "login" ? "Войти" : "Создать"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full text-xs text-muted-foreground mt-4 hover:text-primary">
          {mode === "login" ? "Нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </div>
  );
}
