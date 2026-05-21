// 出荷ロジック (純粋関数). 在庫を金に換える.

import { GRADES, GRADE_PRICE, type Grade } from "@/config/balance";
import type { GameState } from "@/game/state";

export interface ShipBreakdown {
  grade: Grade;
  kg: number;
  unitPrice: number;
  revenue: number;
}

/** 全在庫の現時点での評価額 (出荷シミュレーション). */
export function shipPreview(state: GameState): ShipBreakdown[] {
  return GRADES.map((g) => {
    const kg = state.farm.inventory[g];
    return { grade: g, kg, unitPrice: GRADE_PRICE[g], revenue: kg * GRADE_PRICE[g] };
  });
}

export function totalRevenue(state: GameState): number {
  return shipPreview(state).reduce((acc, r) => acc + r.revenue, 0);
}

export function shipGrade(state: GameState, grade: Grade): { state: GameState; revenue: number } {
  const kg = state.farm.inventory[grade];
  const revenue = kg * GRADE_PRICE[grade];
  return {
    state: {
      ...state,
      cash: state.cash + revenue,
      farm: { ...state.farm, inventory: { ...state.farm.inventory, [grade]: 0 } },
    },
    revenue,
  };
}

export function shipAll(state: GameState): { state: GameState; revenue: number } {
  const revenue = totalRevenue(state);
  return {
    state: {
      ...state,
      cash: state.cash + revenue,
      farm: { ...state.farm, inventory: { S: 0, A: 0, B: 0, C: 0 } },
    },
    revenue,
  };
}
