// GameState — 要件定義 7.1 で定義した中央オブジェクト.
// M1 では最小のフィールドのみ定義. 後続マイルストーンで拡張する.

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface Clock {
  year: number;
  season: Season;
  day: number; // 1-30
  hour: number; // 0-23
  minute: number; // 0-59
  speed: 0 | 1 | 2 | 4 | 8;
  lastTickAt: number; // epoch ms
}

export interface PlayerSkills {
  cultivate: number;
  business: number;
  appraisal: number;
}

export interface Player {
  name: string;
  level: number;
  exp: number;
  skillPoints: number;
  skills: PlayerSkills;
}

export interface GameState {
  version: number; // セーブスキーマバージョン (要件 7.2.3)
  player: Player;
  cash: number;
  clock: Clock;
}

export function createInitialState(): GameState {
  return {
    version: 1,
    player: {
      name: "農園主",
      level: 1,
      exp: 0,
      skillPoints: 0,
      skills: { cultivate: 1, business: 1, appraisal: 1 },
    },
    cash: 50_000,
    clock: {
      year: 1,
      season: "spring",
      day: 1,
      hour: 6,
      minute: 0,
      speed: 1,
      lastTickAt: Date.now(),
    },
  };
}
