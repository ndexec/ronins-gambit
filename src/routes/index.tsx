import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sword, Trophy, Sparkles, Calendar, Brain, Crown, GraduationCap, Flame } from "lucide-react";
import { PROVINCES } from "@/lib/ronin";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RONIN · Mahjong с душой самурая" },
      { name: "description", content: "Странствуй по провинциям древней Японии. Каждая раскладка — дуэль. Ежедневные испытания, рейтинг, AI-коуч." },
    ],
  }),
  component: Index,
});

function Index() {
  const [showSplash, setShowSplash] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(true);

  useEffect(() => {
    try {
      const done = localStorage.getItem("ronin_tutorial_done") === "1";
      const seen = localStorage.getItem("ronin_splash_seen") === "1";
      setTutorialDone(done);
      if (!seen) setShowSplash(true);
    } catch {}
  }, []);

  function dismissSplash() {
    try { localStorage.setItem("ronin_splash_seen", "1"); } catch {}
    setShowSplash(false);
  }

  return (
    <div>
      {showSplash && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm grid place-items-center px-5 animate-fade-in">
          <div className="max-w-lg text-center">
            <div className="font-zen text-8xl text-primary mb-2 leading-none">浪人</div>
            <div className="text-[10px] tracking-[0.5em] text-primary/70 font-serif">RONIN</div>
            <h2 className="font-serif text-3xl mt-6">Ты — ронин без господина.</h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Дороги пусты, слава забыта. Каждое поле плиток — дуэль за честь, которую ты потерял.
              Подними клинок. Докажи, что ещё помнишь свой путь.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/tutorial"
                onClick={dismissSplash}
                className="px-7 py-3.5 rounded-md bg-primary text-primary-foreground font-serif tracking-wider text-sm inline-flex items-center gap-2 justify-center"
              >
                <GraduationCap className="h-4 w-4" /> Начать путь (60 сек)
              </Link>
              <button
                onClick={dismissSplash}
                className="px-7 py-3.5 rounded-md border border-border hover:border-primary text-sm"
              >
                Уже знаю правила
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative px-5 sm:px-8 pt-16 sm:pt-24 pb-20 max-w-6xl mx-auto text-center">
        <div className="font-zen text-7xl sm:text-9xl text-primary mb-4 leading-none ronin-fade">浪人</div>
        <p className="font-serif tracking-[0.5em] text-primary/80 text-sm sm:text-base">RONIN</p>
        <h1 className="mt-6 text-3xl sm:text-5xl font-serif text-foreground max-w-3xl mx-auto leading-tight">
          Mahjong как путь странствующего самурая.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Каждая партия — дуэль. Каждая провинция — новая глава. Очищай поле, читай его как поле боя, поднимайся в рейтинге сэнсэев.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {!tutorialDone && (
            <Link
              to="/tutorial"
              className="px-7 py-3.5 rounded-md bg-accent text-background font-serif tracking-wider text-sm hover:opacity-90 transition flex items-center gap-2"
            >
              <GraduationCap className="h-4 w-4" /> Туториал · 60 сек
            </Link>
          )}
          <Link
            to="/play"
            className="px-7 py-3.5 rounded-md bg-primary text-primary-foreground font-serif tracking-wider text-sm hover:opacity-90 transition flex items-center gap-2"
          >
            <Sword className="h-4 w-4" /> Начать дуэль
          </Link>
          <Link
            to="/daily"
            className="px-7 py-3.5 rounded-md border border-border hover:border-primary text-foreground font-serif tracking-wider text-sm transition flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" /> Дуэль дня
          </Link>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 text-[11px] text-muted-foreground">
          <Flame className="h-3 w-3 text-accent" /> Играй каждый день — серия растёт, плитки помнят.
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-5 sm:px-8 max-w-6xl mx-auto pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: <Brain className="h-5 w-5" />, title: "AI-Коуч ронина", desc: "Подсказывает, какой ход откроет больше плиток. Учит читать поле." },
            { icon: <Calendar className="h-5 w-5" />, title: "Дуэль дня", desc: "Одна раскладка для всех. Глобальный рейтинг по времени и очкам." },
            { icon: <Trophy className="h-5 w-5" />, title: "Прогрессия", desc: "5 провинций, 4 раскладки, ранги от Ронина до Легенды." },
            { icon: <Sparkles className="h-5 w-5" />, title: "Стиль", desc: "Скины плиток: классика, природа, луна, огонь — и темы интерфейса." },
            { icon: <Sword className="h-5 w-5" />, title: "Подсказка и отмена", desc: "Меч ронина не падает напрасно — вернись и попробуй другой путь." },
            { icon: <Crown className="h-5 w-5" />, title: "Pro-доспехи", desc: "Эксклюзивные провинции, скины клинков и Battle Pass." },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-lg border border-border bg-surface/60 backdrop-blur">
              <div className="h-9 w-9 grid place-items-center rounded-md bg-primary/10 text-primary mb-3">{f.icon}</div>
              <h3 className="text-sm font-serif text-foreground tracking-wide mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROVINCES */}
      <section className="px-5 sm:px-8 max-w-6xl mx-auto pb-24">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-serif tracking-[0.3em] text-primary/70">КАРТА ПУТИ</p>
            <h2 className="text-2xl sm:text-3xl font-serif mt-1">Пять провинций ждут</h2>
          </div>
          <Link to="/play" className="text-xs text-muted-foreground hover:text-primary">Все →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PROVINCES.map((p) => {
            const coverUrl = `${import.meta.env.BASE_URL}covers/${encodeURIComponent(p.cover)}`;
            return (
              <div key={p.id} className="group relative min-h-48 overflow-hidden rounded-lg border border-border bg-surface/40 p-4 transition hover:border-primary/40">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center opacity-35 transition duration-300 group-hover:scale-105 group-hover:opacity-45"
                  style={{ backgroundImage: `url("${coverUrl}")` }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-background/25 via-background/70 to-background/95" />
                <div className="relative z-10 flex h-full min-h-40 flex-col">
                  <div className="font-zen text-3xl text-primary mb-2 drop-shadow">{p.kanji}</div>
                  <div className="text-sm font-serif drop-shadow">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{p.description}</div>
                  <div className="mt-auto pt-4 text-[10px] uppercase tracking-widest text-primary/70">
                    {p.unlockWins === 0 ? "Открыто" : `Открыть: ${p.unlockWins} побед`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
