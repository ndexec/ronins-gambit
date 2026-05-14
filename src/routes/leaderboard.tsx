import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { todaySeed } from "@/lib/mahjong/prng";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Рейтинг · RONIN Mahjong" },
      { name: "description", content: "Глобальный и городской рейтинг ронинов. Дуэль дня и за всё время." },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const [tab, setTab] = useState<"daily" | "all" | "city">("daily");
  const [city, setCity] = useState("");

  const { data: daily = [] } = useQuery({
    queryKey: ["lb-daily"],
    queryFn: async () => {
      const seed = todaySeed();
      const { data } = await supabase.from("daily_scores").select("*").eq("daily_date", seed).order("score", { ascending: false }).limit(50);
      const ids = [...new Set((data ?? []).map((d) => d.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, display_name, city, rank").in("id", ids);
      const m = new Map(profs?.map((p) => [p.id, p]));
      return (data ?? []).map((d) => ({ ...d, profile: m.get(d.user_id) }));
    },
  });

  const { data: all = [] } = useQuery({
    queryKey: ["lb-all"],
    queryFn: async () => {
      const { data } = await supabase.from("game_history").select("*").eq("won", true).order("score", { ascending: false }).limit(50);
      const ids = [...new Set((data ?? []).map((d) => d.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, display_name, city, rank").in("id", ids);
      const m = new Map(profs?.map((p) => [p.id, p]));
      return (data ?? []).map((d) => ({ ...d, profile: m.get(d.user_id) }));
    },
  });

  const { data: byCity = [] } = useQuery({
    queryKey: ["lb-city", city],
    enabled: tab === "city" && city.length > 1,
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, city, rank, total_wins, best_streak").ilike("city", `%${city}%`).order("total_wins", { ascending: false }).limit(50);
      return profs ?? [];
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs tracking-[0.3em] font-serif text-primary/70">КНИГА ИМЁН</p>
          <h1 className="font-serif text-3xl mt-1 flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" /> Рейтинг ронинов</h1>
        </div>
      </div>
      <div className="flex gap-2 border-b border-border mb-5">
        {([
          ["daily", "Дуэль дня"],
          ["all", "Все времена"],
          ["city", "По городам"],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-serif tracking-wider border-b-2 -mb-px ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "city" && (
        <div className="mb-4 flex gap-2 items-center">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Введи город (напр. Алматы)"
            className="flex-1 max-w-xs bg-surface border border-border rounded-md px-3 py-2 text-sm" />
        </div>
      )}

      {tab === "daily" && <Table rows={daily.map((r) => ({ name: r.profile?.display_name ?? "Аноним", city: r.profile?.city, rank: r.profile?.rank, value: r.score, sub: formatTime(r.time_seconds) }))} valueLabel="Очки" />}
      {tab === "all" && <Table rows={all.map((r) => ({ name: r.profile?.display_name ?? "Аноним", city: r.profile?.city, rank: r.profile?.rank, value: r.score, sub: `${r.layout} · ${r.difficulty}` }))} valueLabel="Очки" />}
      {tab === "city" && <Table rows={byCity.map((p) => ({ name: p.display_name ?? "Аноним", city: p.city, rank: p.rank, value: p.total_wins, sub: `Серия: ${p.best_streak}` }))} valueLabel="Победы" />}
    </div>
  );
}

function Table({ rows, valueLabel }: { rows: Array<{ name: string; city?: string | null; rank?: string; value: number; sub?: string }>; valueLabel: string }) {
  if (rows.length === 0) return <div className="text-sm text-muted-foreground py-8 text-center">Пока пусто. Стань первым.</div>;
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface text-muted-foreground text-xs uppercase tracking-wider">
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Ронин</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell">Город</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell">Ранг</th>
            <th className="px-3 py-2 text-right">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border hover:bg-surface/50">
              <td className="px-3 py-2 font-serif text-primary">{i + 1}</td>
              <td className="px-3 py-2">
                <div>{r.name}</div>
                {r.sub && <div className="text-[11px] text-muted-foreground">{r.sub}</div>}
              </td>
              <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">{r.city ?? "—"}</td>
              <td className="px-3 py-2 hidden sm:table-cell text-xs">{r.rank ?? "—"}</td>
              <td className="px-3 py-2 text-right font-serif text-primary">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
