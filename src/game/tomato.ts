// 大玉トマト栽培ロジック (純粋関数).
// 生育ステージ進行 / 水・肥料の自然減衰 / プレイヤー操作 (植える/水やる/追肥/収穫).

import {
  FERTILIZER_COST,
  FERTILIZER_DECAY_PER_DAY,
  FERTILIZER_GAIN,
  GROWTH_STAGES,
  INITIAL_FERTILIZER,
  INITIAL_WATER,
  SEED_COST,
  STAGE_DAYS,
  WATER_DECAY_PER_DAY,
  type GrowthStage,
} from "@/config/balance";
import type { Farm, GameState, Greenhouse, Plot, TomatoPlant } from "@/game/state";

const DEFAULT_VARIETY = "akanemaru"; // 仮称: 架空品種「アカネ丸」 (要件 5.3)

const STAGE_INDEX: Record<GrowthStage, number> = Object.fromEntries(
  GROWTH_STAGES.map((s, i) => [s, i] as const),
) as Record<GrowthStage, number>;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function nextStageOf(s: GrowthStage): GrowthStage | null {
  const i = STAGE_INDEX[s];
  if (i === GROWTH_STAGES.length - 1) return null; // harvest が終端
  return GROWTH_STAGES[i + 1]!;
}

// ---------------------------------------------------------------------------
// 時間進行
// ---------------------------------------------------------------------------

/**
 * 単一プロットを gameDays ぶん進めた新しい Plot を返す.
 * - 水/肥料は時間経過で減衰
 * - 植物がいればステージ進行
 * - 水切れ・肥料切れは careScore に効く
 */
export function advancePlot(plot: Plot, gameDays: number): Plot {
  if (gameDays <= 0) return plot;

  const newWater = Math.max(0, plot.waterLevel - WATER_DECAY_PER_DAY * gameDays);
  const newFert = Math.max(0, plot.fertilizerLevel - FERTILIZER_DECAY_PER_DAY * gameDays);

  let plant = plot.plant;
  if (plant) {
    // care score の更新: 水/肥料が十分なら +、切れていれば -
    let careDelta = 0;
    careDelta += plot.waterLevel < 15 ? -3 * gameDays : 2 * gameDays;
    careDelta += plot.fertilizerLevel < 10 ? -1.5 * gameDays : 0.5 * gameDays;
    let care = clamp(plant.careScore + careDelta, 0, 100);

    // ステージ進行
    let stage: GrowthStage = plant.stage;
    let days = plant.daysInStage + gameDays;
    // ステージの所要日数. 水切れだと進行速度が半減する
    const speedFactor = plot.waterLevel < 15 ? 0.5 : 1;
    let effectiveDays = days * speedFactor;
    let safety = 0;
    while (safety < GROWTH_STAGES.length) {
      const needed = STAGE_DAYS[stage];
      if (needed === 0) break; // harvest 等の停滞ステージ
      if (effectiveDays < needed) break;
      const next = nextStageOf(stage);
      if (!next) break;
      effectiveDays -= needed;
      days = effectiveDays / speedFactor; // 速度補正前に戻す
      stage = next;
      safety += 1;
    }
    plant = { ...plant, stage, daysInStage: days, careScore: care };
  }

  return {
    ...plot,
    plant,
    waterLevel: newWater,
    fertilizerLevel: newFert,
  };
}

export function advanceGreenhouse(gh: Greenhouse, gameDays: number): Greenhouse {
  return { ...gh, plots: gh.plots.map((p) => advancePlot(p, gameDays)) };
}

export function advanceFarm(farm: Farm, gameDays: number): Farm {
  if (gameDays <= 0) return farm;
  return { ...farm, greenhouses: farm.greenhouses.map((gh) => advanceGreenhouse(gh, gameDays)) };
}

// ---------------------------------------------------------------------------
// プレイヤー操作
// ---------------------------------------------------------------------------

export type ActionResult =
  | { ok: true; state: GameState }
  | {
      ok: false;
      reason:
        | "no_such_greenhouse"
        | "no_such_plot"
        | "already_planted"
        | "not_planted"
        | "not_enough_cash"
        | "not_ready_to_harvest";
    };

function updatePlot(
  state: GameState,
  greenhouseId: string,
  plotId: string,
  updater: (p: Plot) => Plot,
): ActionResult {
  const gh = state.farm.greenhouses.find((g) => g.id === greenhouseId);
  if (!gh) return { ok: false, reason: "no_such_greenhouse" };
  const plot = gh.plots.find((p) => p.id === plotId);
  if (!plot) return { ok: false, reason: "no_such_plot" };
  const newPlot = updater(plot);
  const newGh: Greenhouse = {
    ...gh,
    plots: gh.plots.map((p) => (p.id === plotId ? newPlot : p)),
  };
  return {
    ok: true,
    state: {
      ...state,
      farm: {
        ...state.farm,
        greenhouses: state.farm.greenhouses.map((g) => (g.id === greenhouseId ? newGh : g)),
      },
    },
  };
}

export function plantSeed(state: GameState, greenhouseId: string, plotId: string): ActionResult {
  const gh = state.farm.greenhouses.find((g) => g.id === greenhouseId);
  if (!gh) return { ok: false, reason: "no_such_greenhouse" };
  const plot = gh.plots.find((p) => p.id === plotId);
  if (!plot) return { ok: false, reason: "no_such_plot" };
  if (plot.plant) return { ok: false, reason: "already_planted" };
  if (state.cash < SEED_COST) return { ok: false, reason: "not_enough_cash" };

  const newPlant: TomatoPlant = {
    varietyId: DEFAULT_VARIETY,
    stage: "seed",
    daysInStage: 0,
    careScore: 60,
  };
  const updated = updatePlot(state, greenhouseId, plotId, (p) => ({
    ...p,
    plant: newPlant,
    waterLevel: Math.max(p.waterLevel, INITIAL_WATER),
    fertilizerLevel: Math.max(p.fertilizerLevel, INITIAL_FERTILIZER),
  }));
  if (!updated.ok) return updated;
  return { ok: true, state: { ...updated.state, cash: updated.state.cash - SEED_COST } };
}

export function waterPlot(state: GameState, greenhouseId: string, plotId: string): ActionResult {
  return updatePlot(state, greenhouseId, plotId, (p) => ({ ...p, waterLevel: 100 }));
}

export function fertilizePlot(
  state: GameState,
  greenhouseId: string,
  plotId: string,
): ActionResult {
  const gh = state.farm.greenhouses.find((g) => g.id === greenhouseId);
  if (!gh) return { ok: false, reason: "no_such_greenhouse" };
  const plot = gh.plots.find((p) => p.id === plotId);
  if (!plot) return { ok: false, reason: "no_such_plot" };
  if (state.cash < FERTILIZER_COST) return { ok: false, reason: "not_enough_cash" };
  const updated = updatePlot(state, greenhouseId, plotId, (p) => ({
    ...p,
    fertilizerLevel: clamp(p.fertilizerLevel + FERTILIZER_GAIN, 0, 100),
  }));
  if (!updated.ok) return updated;
  return { ok: true, state: { ...updated.state, cash: updated.state.cash - FERTILIZER_COST } };
}
