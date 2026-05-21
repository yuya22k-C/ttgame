// 経済・スケールの数値定数 (実装計画 5 章).
// バランス調整はここを書き換えて行う.

export const TILE_SIZE = 32; // px / マス

export const GRID_W = 14;
export const GRID_H = 10;

export const INITIAL_CASH = 50_000;

export const GREENHOUSE_SIZE = { w: 3, h: 2 } as const;
export const GREENHOUSE_COST = 30_000;
export const GREENHOUSE_MAINT_PER_DAY = 100;
export const PLOTS_PER_GREENHOUSE = 6; // 3列 × 2行

// ---- 大玉トマト栽培 (要件 4.2 / 実装計画 5章) -----------------------------
export const GROWTH_STAGES = [
  "seed",
  "sprout",
  "seedling",
  "planted",
  "flower",
  "fruit",
  "grow",
  "harvest",
] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

/** 各ステージの所要ゲーム日数. 合計 ≒ 60 ゲーム日 (約 8 実分@1×). */
export const STAGE_DAYS: Record<GrowthStage, number> = {
  seed: 4,
  sprout: 6,
  seedling: 8,
  planted: 8,
  flower: 8,
  fruit: 10,
  grow: 8,
  harvest: 0, // 収穫されるまで停滞
};

/** 1ゲーム日あたりの水/肥料の自然減衰量 (0-100スケール). */
export const WATER_DECAY_PER_DAY = 25;
export const FERTILIZER_DECAY_PER_DAY = 12;

export const SEED_COST = 500;
export const FERTILIZER_COST = 50;
export const FERTILIZER_GAIN = 40;
export const INITIAL_WATER = 60;
export const INITIAL_FERTILIZER = 30;
