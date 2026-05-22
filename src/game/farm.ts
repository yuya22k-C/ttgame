// 農園 (ハウス建設等) の純粋ロジック.
// Pixi/DOM に依存しない. 結果は新しい GameState を返す.

import {
  GREENHOUSE_COST,
  GREENHOUSE_SIZE,
  PLOTS_PER_GREENHOUSE,
  SKILL_BUSINESS_BUILD_DISCOUNT_PER_LEVEL,
} from "@/config/balance";
import type { Farm, GameState, Greenhouse, Plot } from "@/game/state";
import { nextId } from "@/util/id";

export function effectiveGreenhouseCost(state: GameState): number {
  const lvl = Math.max(1, state.player.skills.business);
  const discount = (lvl - 1) * SKILL_BUSINESS_BUILD_DISCOUNT_PER_LEVEL;
  return Math.max(0, Math.round(GREENHOUSE_COST * (1 - discount)));
}

function createEmptyPlots(count: number): Plot[] {
  const plots: Plot[] = [];
  for (let i = 0; i < count; i += 1) {
    plots.push({
      id: nextId("plot"),
      index: i,
      waterLevel: 0,
      fertilizerLevel: 0,
    });
  }
  return plots;
}

export type Size = { w: number; h: number };

function overlaps(ax: number, ay: number, asz: Size, bx: number, by: number, bsz: Size): boolean {
  return ax < bx + bsz.w && ax + asz.w > bx && ay < by + bsz.h && ay + asz.h > by;
}

/** 指定マスを左上として size のハウスが置けるか. */
export function canPlaceGreenhouse(
  farm: Farm,
  gx: number,
  gy: number,
  size: Size = GREENHOUSE_SIZE,
): boolean {
  if (!Number.isInteger(gx) || !Number.isInteger(gy)) return false;
  if (gx < 0 || gy < 0) return false;
  if (gx + size.w > farm.width || gy + size.h > farm.height) return false;
  for (const gh of farm.greenhouses) {
    if (overlaps(gx, gy, size, gh.position.x, gh.position.y, gh.size)) return false;
  }
  return true;
}

export type PlaceResult =
  | { ok: true; state: GameState; greenhouse: Greenhouse }
  | { ok: false; reason: "out_of_bounds" | "overlap" | "not_enough_cash" };

export function placeGreenhouse(state: GameState, gx: number, gy: number): PlaceResult {
  const size = GREENHOUSE_SIZE;
  if (
    gx < 0 ||
    gy < 0 ||
    gx + size.w > state.farm.width ||
    gy + size.h > state.farm.height
  ) {
    return { ok: false, reason: "out_of_bounds" };
  }
  for (const gh of state.farm.greenhouses) {
    if (overlaps(gx, gy, size, gh.position.x, gh.position.y, gh.size)) {
      return { ok: false, reason: "overlap" };
    }
  }
  const cost = effectiveGreenhouseCost(state);
  if (state.cash < cost) {
    return { ok: false, reason: "not_enough_cash" };
  }
  const greenhouse: Greenhouse = {
    id: nextId("gh"),
    position: { x: gx, y: gy },
    size: { w: size.w, h: size.h },
    tier: 1,
    plots: createEmptyPlots(PLOTS_PER_GREENHOUSE),
  };
  const nextState: GameState = {
    ...state,
    cash: state.cash - cost,
    farm: {
      ...state.farm,
      greenhouses: [...state.farm.greenhouses, greenhouse],
    },
  };
  return { ok: true, state: nextState, greenhouse };
}
