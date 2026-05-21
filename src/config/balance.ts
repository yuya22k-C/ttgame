// 経済・スケールの数値定数 (実装計画 5 章).
// バランス調整はここを書き換えて行う.

export const TILE_SIZE = 32; // px / マス

export const GRID_W = 14;
export const GRID_H = 10;

export const INITIAL_CASH = 50_000;

export const GREENHOUSE_SIZE = { w: 3, h: 2 } as const;
export const GREENHOUSE_COST = 30_000;
export const GREENHOUSE_MAINT_PER_DAY = 100;
