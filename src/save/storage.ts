// localStorage 自動セーブ + ロード.
// 1秒の debounce で頻繁な書き込みを防ぐ. 失敗は警告ログのみ (ゲームは止めない).

import type { GameState } from "@/game/state";
import { migrate } from "@/save/migrations";

export const AUTO_KEY = "ttgame.auto";

let pendingTimer: number | null = null;

export function saveNow(state: GameState, key: string = AUTO_KEY): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn("自動セーブに失敗:", e);
  }
}

export function scheduleSave(state: GameState, debounceMs = 1000): void {
  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
  }
  pendingTimer = window.setTimeout(() => {
    saveNow(state);
    pendingTimer = null;
  }, debounceMs);
}

export function flushPendingSave(state: GameState): void {
  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  saveNow(state);
}

export type LoadResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: "no_save" | "parse_failed" | "migration_failed"; message: string };

export function loadAuto(key: string = AUTO_KEY): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch (e) {
    return { ok: false, reason: "parse_failed", message: `localStorage 読込失敗: ${String(e)}` };
  }
  if (!raw) return { ok: false, reason: "no_save", message: "保存データなし" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "parse_failed", message: "JSON 解析失敗" };
  }
  const m = migrate(parsed);
  if (!m.ok) return { ok: false, reason: "migration_failed", message: m.message };
  return { ok: true, state: m.state };
}

export function clearAuto(key: string = AUTO_KEY): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("セーブ削除に失敗:", e);
  }
}
