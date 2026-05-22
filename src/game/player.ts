// プレイヤー (農園主) の成長ロジック.
// 経験値の加算 → レベルアップ → スキルポイント付与 / スキル振り分け.

import { expForNextLevel } from "@/config/balance";
import type { Player, PlayerSkills } from "@/game/state";

export interface GainExpResult {
  player: Player;
  leveledUp: boolean;
  /** レベルアップ回数 (連続) と新レベル. */
  levelsGained: number;
  newLevel: number;
}

export function gainExp(player: Player, amount: number): GainExpResult {
  if (amount <= 0) {
    return { player, leveledUp: false, levelsGained: 0, newLevel: player.level };
  }
  let level = player.level;
  let exp = player.exp + amount;
  let skillPoints = player.skillPoints;
  let levelsGained = 0;

  // 多段レベルアップ対応
  let need = expForNextLevel(level);
  while (exp >= need) {
    exp -= need;
    level += 1;
    skillPoints += 1;
    levelsGained += 1;
    need = expForNextLevel(level);
  }

  return {
    player: { ...player, level, exp, skillPoints },
    leveledUp: levelsGained > 0,
    levelsGained,
    newLevel: level,
  };
}

export function allocateSkill(
  player: Player,
  skill: keyof PlayerSkills,
): { player: Player; ok: boolean } {
  if (player.skillPoints <= 0) return { player, ok: false };
  return {
    player: {
      ...player,
      skillPoints: player.skillPoints - 1,
      skills: { ...player.skills, [skill]: player.skills[skill] + 1 },
    },
    ok: true,
  };
}
