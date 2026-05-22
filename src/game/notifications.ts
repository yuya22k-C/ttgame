// ゲーム内お知らせの検出と管理.
// state は永続化せず、ラウンド中だけメモリに保持する.
// 重複通知を避けるため「同じ kind+対象」は notified セットで管理.

import type { GameState } from "@/game/state";

export type NotificationKind =
  | "harvest_ready"
  | "water_low"
  | "fert_low"
  | "cash_zero"
  | "level_up";

export interface Notification {
  id: string;
  kind: NotificationKind;
  message: string;
  /** 対象を特定するキー (plot.id, greenhouse.id, "global" 等). 重複抑止用. */
  scope: string;
  createdAt: number; // ms (実時間)
  read: boolean;
}

export interface NotificationCenter {
  list: Notification[]; // 新しい順
  notifiedKeys: Set<string>;
  unread: number;
}

export function createCenter(): NotificationCenter {
  return { list: [], notifiedKeys: new Set(), unread: 0 };
}

function keyFor(kind: NotificationKind, scope: string): string {
  return `${kind}:${scope}`;
}

function addOnce(
  center: NotificationCenter,
  kind: NotificationKind,
  scope: string,
  message: string,
  now: number,
): void {
  const k = keyFor(kind, scope);
  if (center.notifiedKeys.has(k)) return;
  center.notifiedKeys.add(k);
  center.list.unshift({
    id: `n_${now.toString(36)}_${center.list.length}`,
    kind,
    scope,
    message,
    createdAt: now,
    read: false,
  });
  center.unread += 1;
  // 最大 30 件で打ち切り
  if (center.list.length > 30) center.list.pop();
}

/** 後で再通知できるよう、解消した警告のキーは削除する. */
function clearKey(center: NotificationCenter, kind: NotificationKind, scope: string): void {
  center.notifiedKeys.delete(keyFor(kind, scope));
}

/**
 * state を見て新規イベントを検出し center に追記する (副作用).
 * 連続通知を避けるため、状態が回復したら notifiedKeys から消す.
 */
export function detectEvents(center: NotificationCenter, state: GameState, now: number): void {
  // 所持金 0
  if (state.cash <= 0) {
    addOnce(center, "cash_zero", "global", "所持金がゼロになりました", now);
  } else {
    clearKey(center, "cash_zero", "global");
  }

  // ハウスごと
  for (const gh of state.farm.greenhouses) {
    for (const plot of gh.plots) {
      if (!plot.plant) {
        clearKey(center, "harvest_ready", plot.id);
        clearKey(center, "water_low", plot.id);
        clearKey(center, "fert_low", plot.id);
        continue;
      }
      // 収穫期到達
      if (plot.plant.stage === "harvest") {
        addOnce(center, "harvest_ready", plot.id, "収穫できる区画があります", now);
      } else {
        clearKey(center, "harvest_ready", plot.id);
      }
      // 水切れ
      if (plot.waterLevel < 15) {
        addOnce(center, "water_low", plot.id, "区画の水が足りません", now);
      } else if (plot.waterLevel > 40) {
        clearKey(center, "water_low", plot.id);
      }
      // 肥料切れ (着果以降のみ通知)
      if (
        plot.fertilizerLevel < 10 &&
        (plot.plant.stage === "fruit" || plot.plant.stage === "grow")
      ) {
        addOnce(center, "fert_low", plot.id, "区画の肥料が足りません", now);
      } else if (plot.fertilizerLevel > 30) {
        clearKey(center, "fert_low", plot.id);
      }
    }
  }
}

export function pushLevelUp(
  center: NotificationCenter,
  newLevel: number,
  now: number,
): void {
  // scope=実時間 で毎回別キーにする (同レベルでも複数回ありえないので今回はOK)
  center.notifiedKeys.add(keyFor("level_up", `${now}`));
  center.list.unshift({
    id: `n_lvl_${now.toString(36)}`,
    kind: "level_up",
    scope: `lvl_${newLevel}`,
    message: `レベルアップ! Lv ${newLevel}`,
    createdAt: now,
    read: false,
  });
  center.unread += 1;
  if (center.list.length > 30) center.list.pop();
}

export function markAllRead(center: NotificationCenter): void {
  for (const n of center.list) n.read = true;
  center.unread = 0;
}

/** プロットごとの注意レベル. 農園トップビューのドット色を決める. */
export type AttentionLevel = "none" | "info" | "warn";

export function greenhouseAttention(state: GameState, greenhouseId: string): AttentionLevel {
  const gh = state.farm.greenhouses.find((g) => g.id === greenhouseId);
  if (!gh) return "none";
  let level: AttentionLevel = "none";
  for (const plot of gh.plots) {
    if (!plot.plant) continue;
    if (plot.plant.stage === "harvest") return "info"; // 収穫は最優先で表示
    if (plot.waterLevel < 15) level = "warn";
    else if (plot.fertilizerLevel < 10 && level === "none") level = "warn";
  }
  return level;
}
