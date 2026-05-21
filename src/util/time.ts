// 時間スケール変換ユーティリティ
// 要件定義 3.1: 現実 1 秒 = ゲーム内 3 分.

/** 1 実ミリ秒あたりに進むゲーム内分数. */
export const GAME_MINUTES_PER_REAL_MS = 3 / 1000;

export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;
export const DAYS_PER_SEASON = 30;
export const SEASONS_PER_YEAR = 4;

/** 実ミリ秒からゲーム内分数 (整数化前の生の値) を返す. */
export function realMsToGameMinutes(realMs: number): number {
  return realMs * GAME_MINUTES_PER_REAL_MS;
}

/** ゲーム時間 (年/季節/日/時/分) を実ミリ秒に換算 (検証・テスト用). */
export function gameMinutesToRealMs(gameMinutes: number): number {
  return gameMinutes / GAME_MINUTES_PER_REAL_MS;
}

/** オフライン進行などで巨大な delta を扱うときの上限. 24 ゲーム時間ぶん. */
export const MAX_TICK_GAME_MINUTES = HOURS_PER_DAY * MINUTES_PER_HOUR;
