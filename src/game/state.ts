// GameState — 要件定義 7.1 の中央オブジェクト.
// M3 で Farm / Greenhouse を追加.

import { GRID_H, GRID_W, INITIAL_CASH } from "@/config/balance";

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

export interface Greenhouse {
  id: string;
  position: { x: number; y: number }; // グリッド座標 (左上)
  size: { w: number; h: number };
  tier: number;
}

export interface Farm {
  width: number; // タイル単位
  height: number; // タイル単位
  greenhouses: Greenhouse[];
}

export interface GameState {
  version: number;
  player: Player;
  cash: number;
  farm: Farm;
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
    cash: INITIAL_CASH,
    farm: {
      width: GRID_W,
      height: GRID_H,
      greenhouses: [],
    },
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
