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

// ---- 収穫・出荷 (要件 4.3 / 4.4) ----------------------------------------
export const GRADES = ["S", "A", "B", "C"] as const;
export type Grade = (typeof GRADES)[number];

/** グレード判定に使う careScore のしきい値 (含む). */
export const GRADE_THRESHOLDS: Record<Grade, number> = {
  S: 85,
  A: 65,
  B: 40,
  C: 0,
};

/** グレード別の出荷単価 (円/kg). 要件 4.3. */
export const GRADE_PRICE: Record<Grade, number> = {
  S: 600,
  A: 400,
  B: 250,
  C: 120,
};

/** 収穫量の最小/最大 (kg/区画). careScore で内挿. */
export const YIELD_MIN = 3;
export const YIELD_MAX = 6;

// ---- プレイヤー成長 (要件 4.6) ------------------------------------------
/** レベル N から N+1 に必要な EXP. ⌊100 × N^1.5⌋. */
export function expForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** 収穫時に獲得する EXP. base = 10 EXP/kg + グレードボーナス. */
export const EXP_PER_KG = 10;
export const EXP_GRADE_BONUS: Record<Grade, number> = {
  S: 20,
  A: 10,
  B: 5,
  C: 0,
};

// ---- スキル係数 ---------------------------------------------------------
/** 栽培スキル: 収穫時に careScore を底上げする値 (level-1) × n. */
export const SKILL_CULTIVATE_CARE_PER_LEVEL = 5;
/** 経営スキル: 出荷単価の倍率 = 1 + (level-1) × n. */
export const SKILL_BUSINESS_PRICE_PER_LEVEL = 0.05;
/** 経営スキル: 建設コストの割引率 (level-1) × n. */
export const SKILL_BUSINESS_BUILD_DISCOUNT_PER_LEVEL = 0.03;
/** 目利きスキル: 種苗コストの割引率 (level-1) × n. */
export const SKILL_APPRAISAL_SEED_DISCOUNT_PER_LEVEL = 0.02;
/** 目利きスキル: 植え付け時の初期 careScore ボーナス (level-1) × n. */
export const SKILL_APPRAISAL_INITIAL_CARE_PER_LEVEL = 5;
