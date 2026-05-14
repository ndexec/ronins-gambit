// Generates a shareable PNG/blob of a duel result on canvas.
export interface ShareCardData {
  title: string;          // e.g. "Дуэль дня · 2026-05-13"
  subtitle?: string;      // e.g. enemy / province
  score: number;
  timeSeconds: number;
  won: boolean;
  player?: string;
  challengeUrl?: string;  // optional URL displayed at bottom
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export async function renderShareCard(d: ShareCardData): Promise<Blob> {
  const W = 1080, H = 1080;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;

  // Background gradient (sumi-e night)
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0b0a08");
  g.addColorStop(0.5, "#171410");
  g.addColorStop(1, "#0b0a08");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Subtle gold rays
  ctx.save();
  ctx.translate(W / 2, H / 2);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    const grd = ctx.createLinearGradient(0, 0, 0, -H);
    grd.addColorStop(0, "rgba(212,175,55,0.08)");
    grd.addColorStop(1, "rgba(212,175,55,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(40, -H);
    ctx.lineTo(-40, -H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Border frame
  ctx.strokeStyle = "rgba(212,175,55,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = "rgba(212,175,55,0.18)";
  ctx.strokeRect(60, 60, W - 120, H - 120);

  // Giant kanji watermark
  ctx.fillStyle = "rgba(212,175,55,0.10)";
  ctx.font = "900 720px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.won ? "勝" : "学", W / 2, H / 2 + 40);

  // Top brand
  ctx.fillStyle = "rgba(212,175,55,0.85)";
  ctx.font = "600 28px serif";
  ctx.textAlign = "center";
  ctx.fillText("RONIN  ·  侍", W / 2, 130);

  // Title
  ctx.fillStyle = "#f5f1e6";
  ctx.font = "700 56px serif";
  ctx.fillText(d.title, W / 2, 210);

  if (d.subtitle) {
    ctx.fillStyle = "rgba(245,241,230,0.65)";
    ctx.font = "400 30px serif";
    ctx.fillText(d.subtitle, W / 2, 270);
  }

  // Verdict
  ctx.fillStyle = d.won ? "#d4af37" : "#a78b5f";
  ctx.font = "700 96px serif";
  ctx.fillText(d.won ? "ПОБЕДА" : "УРОК", W / 2, 470);

  // Score / time
  const cx1 = W / 2 - 200, cx2 = W / 2 + 200, cy = 720;
  ctx.fillStyle = "rgba(212,175,55,0.75)";
  ctx.font = "500 24px serif";
  ctx.fillText("ОЧКИ", cx1, cy - 40);
  ctx.fillText("ВРЕМЯ", cx2, cy - 40);
  ctx.fillStyle = "#f5f1e6";
  ctx.font = "700 88px serif";
  ctx.fillText(d.score.toString(), cx1, cy + 40);
  ctx.fillText(fmtTime(d.timeSeconds), cx2, cy + 40);

  // Player name
  if (d.player) {
    ctx.fillStyle = "rgba(245,241,230,0.7)";
    ctx.font = "italic 28px serif";
    ctx.fillText(`— ${d.player}`, W / 2, 850);
  }

  // Challenge URL
  if (d.challengeUrl) {
    ctx.fillStyle = "rgba(212,175,55,0.65)";
    ctx.font = "500 22px monospace";
    ctx.fillText("Брось вызов:", W / 2, 950);
    ctx.fillStyle = "#d4af37";
    ctx.font = "600 24px monospace";
    const u = d.challengeUrl.length > 60 ? d.challengeUrl.slice(0, 57) + "..." : d.challengeUrl;
    ctx.fillText(u, W / 2, 990);
  }

  return await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/png", 0.95));
}

export async function shareResult(d: ShareCardData) {
  const blob = await renderShareCard(d);
  const file = new File([blob], "ronin-duel.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "RONIN Mahjong",
        text: d.won
          ? `${d.score} очков за ${fmtTime(d.timeSeconds)} — победа в RONIN. Сможешь обойти?`
          : `Сегодня — урок (${d.score} очков). Сыграй ту же раскладку:`,
        url: d.challengeUrl,
      });
      return "shared";
    } catch {/* user cancelled */}
  }
  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ronin-duel.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

// Hint quota tracking — 3 free hints/day, Pro = unlimited
const HINT_KEY = "ronin_hints";
export function readHintQuota(): { date: string; used: number } {
  if (typeof localStorage === "undefined") return { date: "", used: 0 };
  try {
    const raw = localStorage.getItem(HINT_KEY);
    if (!raw) return { date: today(), used: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== today()) return { date: today(), used: 0 };
    return parsed;
  } catch { return { date: today(), used: 0 }; }
}
export function bumpHintQuota(): number {
  const q = readHintQuota();
  q.used += 1;
  if (typeof localStorage !== "undefined") localStorage.setItem(HINT_KEY, JSON.stringify(q));
  return q.used;
}
export const FREE_HINTS_PER_DAY = 3;
function today() { return new Date().toISOString().slice(0, 10); }

// Pro flag — local demo flag (real impl would query profile.is_pro)
export function isProLocal(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("ronin_pro") === "1";
}
export function setProLocal(v: boolean) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("ronin_pro", v ? "1" : "0");
}
