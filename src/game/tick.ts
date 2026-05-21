// クロック進行ロジック.
// 「唯一の時間進行関数」として位置付け (実装計画 3.1).
// 純粋関数として保ち、副作用は呼び出し側 (ループ) が担当する.

import {
  DAYS_PER_SEASON,
  HOURS_PER_DAY,
  MAX_TICK_GAME_MINUTES,
  MINUTES_PER_HOUR,
  SEASONS_PER_YEAR,
  realMsToGameMinutes,
} from "@/util/time";
import type { GameState, Season } from "@/game/state";
import { advanceFarm } from "@/game/tomato";

const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

function nextSeason(s: Season): { season: Season; rolledYear: boolean } {
  const idx = SEASON_ORDER.indexOf(s);
  const nextIdx = (idx + 1) % SEASONS_PER_YEAR;
  return { season: SEASON_ORDER[nextIdx]!, rolledYear: nextIdx === 0 };
}

/**
 * クロックに gameMinutes を加算した新しいクロック値を返す純粋関数.
 * 桁上がり (分→時→日→季節→年) を再帰せずループで処理する.
 * 上限のクランプは行わない (catch-up 制御は tick 側で実施).
 */
export function advanceClock(
  clock: GameState["clock"],
  gameMinutes: number,
  nowRealMs: number,
): GameState["clock"] {
  const delta = Math.max(gameMinutes, 0);

  let { year, season, day, hour, minute } = clock;
  let m = minute + delta;

  // 分 → 時
  if (m >= MINUTES_PER_HOUR) {
    const carry = Math.floor(m / MINUTES_PER_HOUR);
    hour += carry;
    m -= carry * MINUTES_PER_HOUR;
  }
  // 時 → 日
  if (hour >= HOURS_PER_DAY) {
    const carry = Math.floor(hour / HOURS_PER_DAY);
    day += carry;
    hour -= carry * HOURS_PER_DAY;
  }
  // 日 → 季節
  while (day > DAYS_PER_SEASON) {
    day -= DAYS_PER_SEASON;
    const next = nextSeason(season);
    season = next.season;
    if (next.rolledYear) year += 1;
  }

  return {
    year,
    season,
    day,
    hour,
    minute: m,
    speed: clock.speed,
    lastTickAt: nowRealMs,
  };
}

/**
 * 実時間 delta (ms) を受け取り、speed と時間スケールを考慮してクロックを進める.
 * 速度 0 のときは進行しない (lastTickAt は更新する).
 * オフライン進行などで巨大な delta を受け取った場合、1 ティックあたり 24 ゲーム時間に
 * クランプして時間の暴走を防ぐ (要件 3.3).
 */
export function tick(state: GameState, realDeltaMs: number, nowRealMs: number): GameState {
  const speed = state.clock.speed;
  if (speed === 0) {
    return { ...state, clock: { ...state.clock, lastTickAt: nowRealMs } };
  }
  const rawGameMinutes = realMsToGameMinutes(realDeltaMs) * speed;
  const gameMinutes = Math.min(rawGameMinutes, MAX_TICK_GAME_MINUTES);
  const gameDays = gameMinutes / (HOURS_PER_DAY * MINUTES_PER_HOUR);
  const newClock = advanceClock(state.clock, gameMinutes, nowRealMs);
  const newFarm = advanceFarm(state.farm, gameDays);
  return { ...state, clock: newClock, farm: newFarm };
}
