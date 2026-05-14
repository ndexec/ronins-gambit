import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Sparkles, Sword, Calendar, ShieldCheck, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isProLocal, setProLocal } from "@/lib/share-card";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Лавка ронина · RONIN" },
      { name: "description", content: "RONIN PRO, скины клинков, эксклюзивные провинции, Battle Pass." },
    ],
  }),
  component: ShopPage,
});

const SKINS = [
  { id: "blade-jade", name: "Клинок Нефрита", price: 199, kanji: "玉", rarity: "Редкий", pro: false, image: "Blade of Jade.png" },
  { id: "blade-fire", name: "Клинок Дракона", price: 299, kanji: "炎", rarity: "Легендарный", pro: true, image: "Dragon Blade.png" },
  { id: "blade-moon", name: "Клинок Луны", price: 199, kanji: "月", rarity: "Редкий", pro: false, image: "Blade of the Moon.png" },
  { id: "blade-shadow", name: "Клинок Теней", price: 399, kanji: "影", rarity: "Легендарный", pro: true, image: "Blade of Shadows.png" },
];
const EXCLUSIVE_PROVINCES = [
  { id: "prov-iga", name: "Ига (тайные дзёдзё)", price: 499, kanji: "伊賀", cover: "Iga.png" },
  { id: "prov-tokai", name: "Токайдо", price: 499, kanji: "東海", cover: "Tokaido.png" },
];

function ShopPage() {
  const [pro, setPro] = useState(false);
  useEffect(() => { setPro(isProLocal()); }, []);

  function toggleProDemo() {
    const next = !pro;
    setProLocal(next);
    setPro(next);
    toast(next ? "RONIN PRO активирован (демо)" : "PRO отключён", {
      description: next ? "Безлимитные подсказки и эксклюзивы открыты" : "Возврат к Free",
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* PRO HERO */}
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-surface to-accent/10 p-8 mb-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 font-zen text-[200px] leading-none text-primary select-none pointer-events-none">武</div>
        <div className="relative">
          <div className="text-[10px] tracking-[0.4em] uppercase text-primary/70 font-serif">RONIN PRO</div>
          <h1 className="font-serif text-3xl sm:text-4xl mt-2">Путь Мастера</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-3">
            Безлимитные подсказки, эксклюзивные провинции, ежемесячный Battle Pass и приоритет в рейтингах.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            <Feature icon={<Sword className="h-4 w-4" />} text="∞ подсказок" />
            <Feature icon={<Calendar className="h-4 w-4" />} text="2 новые главы / мес" />
            <Feature icon={<ShieldCheck className="h-4 w-4" />} text="Без рекламы" />
            <Feature icon={<Sparkles className="h-4 w-4" />} text="Эксклюзивные скины" />
          </div>
          {pro ? (
            <div className="mt-6 inline-flex flex-col items-center gap-2">
              <div className="px-6 py-3 rounded-md border border-primary/60 bg-primary/10 text-primary font-serif text-sm flex items-center gap-2">
                <Check className="h-4 w-4" /> PRO активен (демо)
              </div>
              <button onClick={toggleProDemo} className="text-[11px] text-muted-foreground hover:text-foreground underline">
                Отключить (для теста)
              </button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                onClick={toggleProDemo}
                className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-serif tracking-wider text-sm inline-flex items-center gap-2"
              >
                <Crown className="h-4 w-4" /> Стать Мастером · 4.99 $/мес
              </button>
              <div className="text-[11px] text-muted-foreground">или единоразовый Ronin Pack — $9.99 (демо)</div>
            </div>
          )}
        </div>
      </div>

      {/* SKINS */}
      <h2 className="font-serif text-2xl mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Скины клинков</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {SKINS.map((s) => {
          const imageUrl = `/blade_skins/${encodeURIComponent(s.image)}`;
          return (
            <div key={s.id} className="group rounded-lg border border-border bg-surface/60 p-4 hover:border-primary/40 transition relative overflow-hidden">
              {s.pro && (
                <div className="absolute top-2 right-2 z-20 text-[9px] tracking-widest uppercase text-primary border border-primary/50 bg-background/70 px-1.5 py-0.5 rounded">PRO</div>
              )}
              <div className="relative mb-3 h-32 rounded-md overflow-hidden border border-border/70 bg-background/45">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm scale-110"
                  style={{ backgroundImage: `url("${imageUrl}")` }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/20 to-background/70" />
                <img
                  src={imageUrl}
                  alt={s.name}
                  className="relative z-10 h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute bottom-2 left-2 z-10 font-zen text-2xl text-primary/70 leading-none">{s.kanji}</div>
              </div>
              <div className="text-sm font-serif">{s.name}</div>
              <div className="text-[11px] text-muted-foreground">{s.rarity}</div>
              <button
                onClick={() => {
                  if (s.pro && !pro) return toast("Только для PRO", { description: "Открой RONIN PRO выше." });
                  toast("Куплено (демо)", { description: s.name });
                }}
                className="mt-3 w-full py-2 rounded-md border border-primary/40 text-primary text-xs hover:bg-primary/10"
              >
                {s.pro && !pro ? "Только PRO" : `${s.price} ⛩`}
              </button>
            </div>
          );
        })}
      </div>

      {/* PROVINCES */}
      <h2 className="font-serif text-2xl mb-4">Эксклюзивные провинции</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {EXCLUSIVE_PROVINCES.map((p) => {
          const coverUrl = `/covers/${encodeURIComponent(p.cover)}`;
          return (
            <div key={p.id} className="group relative min-h-28 overflow-hidden rounded-lg border border-border bg-surface/60 p-5 flex items-center gap-4 transition hover:border-accent/50">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center opacity-35 transition duration-300 group-hover:scale-105 group-hover:opacity-45"
                style={{ backgroundImage: `url("${coverUrl}")` }}
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-background/35" />
              <div className="relative z-10 font-zen text-4xl text-accent drop-shadow">{p.kanji}</div>
              <div className="relative z-10 flex-1 min-w-0">
                <div className="font-serif truncate drop-shadow">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">Новая раскладка, враги, музыка</div>
              </div>
              <button
                onClick={() => pro ? toast("Открыто! (демо)", { description: p.name }) : toast("Только для PRO")}
                className="relative z-10 px-3 py-1.5 rounded-md bg-accent text-background text-xs shrink-0"
              >
                {pro ? "Открыть" : `${p.price} ⛩`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-10">
        Демо-каталог. Реальная оплата подключается через Stripe в полной версии. <Link to="/" className="text-primary">На главную</Link>
      </p>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-1.5 text-foreground/80">{icon} {text}</div>;
}
