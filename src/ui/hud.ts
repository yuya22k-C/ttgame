import type { GameState, Season } from "@/game/state";

const SEASON_LABEL: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

interface HudElements {
  cash: HTMLElement;
  date: HTMLElement;
  level: HTMLElement;
}

let cached: HudElements | null = null;

function get(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`HUD element #${id} not found`);
  return el;
}

export function mountHud(): void {
  cached = {
    cash: get("hud-cash"),
    date: get("hud-date"),
    level: get("hud-level"),
  };
}

export function renderHud(state: GameState): void {
  if (!cached) mountHud();
  const c = cached!;
  c.cash.textContent = `¥ ${state.cash.toLocaleString("ja-JP")}`;
  const { year, season, day, hour, minute } = state.clock;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  c.date.textContent = `${year}年 ${SEASON_LABEL[season]} ${day}日 ${hh}:${mm}`;
  c.level.textContent = String(state.player.level);
}
