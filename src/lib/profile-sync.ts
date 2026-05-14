import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Difficulty } from "@/lib/mahjong/engine";
import type { LayoutName } from "@/lib/mahjong/layouts";
import type { TileTheme } from "@/lib/mahjong/tiles";

/**
 * Ensures a `profiles` row exists (covers legacy accounts or missed triggers).
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const { data, error } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("[profile-sync] ensure read", error);
    return;
  }
  if (data) return;

  const email = user.email ?? "";
  const handle = (email.split("@")[0] || "ronin").slice(0, 24);
  const display = (user.user_metadata?.display_name as string | undefined)?.trim() || handle;
  const username = `r_${user.id.replace(/-/g, "").slice(0, 22)}`;

  const { error: ins } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    display_name: display,
  });
  if (ins && ins.code !== "23505") console.error("[profile-sync] ensure insert", ins);
}

export type PlayPreferences = {
  last_layout: LayoutName;
  last_difficulty: Difficulty;
  last_theme: TileTheme;
  last_province: number;
};

export async function savePlayPreferences(userId: string, prefs: PlayPreferences): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      last_layout: prefs.last_layout,
      last_difficulty: prefs.last_difficulty,
      last_theme: prefs.last_theme,
      last_province: prefs.last_province,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) console.error("[profile-sync] prefs", error);
}
