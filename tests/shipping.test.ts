import { describe, it, expect } from "vitest";
import { GRADE_PRICE } from "../src/config/balance";
import { placeGreenhouse } from "../src/game/farm";
import { shipAll, shipGrade, shipPreview, totalRevenue } from "../src/game/shipping";
import { createInitialState, type GameState } from "../src/game/state";

function withInventory(state: GameState, S = 0, A = 0, B = 0, C = 0): GameState {
  return { ...state, farm: { ...state.farm, inventory: { S, A, B, C } } };
}

describe("shipPreview", () => {
  it("returns 4 rows (S/A/B/C) with kg and unit price", () => {
    const s = withInventory(createInitialState(), 1, 2, 3, 4);
    const rows = shipPreview(s);
    expect(rows.map((r) => r.grade)).toEqual(["S", "A", "B", "C"]);
    expect(rows[0]!.kg).toBe(1);
    expect(rows[0]!.unitPrice).toBe(GRADE_PRICE.S);
    expect(rows[0]!.revenue).toBe(GRADE_PRICE.S * 1);
  });
});

describe("shipGrade", () => {
  it("converts kg of one grade to cash and zeros that grade", () => {
    const s = withInventory(createInitialState(), 0, 5, 0, 0);
    const before = s.cash;
    const r = shipGrade(s, "A");
    expect(r.revenue).toBe(GRADE_PRICE.A * 5);
    expect(r.state.cash).toBe(before + r.revenue);
    expect(r.state.farm.inventory.A).toBe(0);
    expect(r.state.farm.inventory.S).toBe(0);
  });

  it("yields zero revenue and no cash change when stock is empty", () => {
    const s = createInitialState();
    const r = shipGrade(s, "S");
    expect(r.revenue).toBe(0);
    expect(r.state.cash).toBe(s.cash);
  });
});

describe("shipAll", () => {
  it("sells all stock and clears the inventory", () => {
    const s = withInventory(createInitialState(), 2, 3, 4, 5);
    const total = totalRevenue(s);
    const r = shipAll(s);
    expect(r.revenue).toBe(total);
    expect(r.state.cash).toBe(s.cash + total);
    expect(r.state.farm.inventory).toEqual({ S: 0, A: 0, B: 0, C: 0 });
  });

  it("does not mutate the input state", () => {
    const s = withInventory(createInitialState(), 0, 3, 0, 0);
    const before = { ...s.farm.inventory };
    shipAll(s);
    expect(s.farm.inventory).toEqual(before);
  });
});

describe("integration: harvest → ship", () => {
  it("a single greenhouse can be placed after harvesting and shipping", () => {
    let s = createInitialState();
    const placed = placeGreenhouse(s, 0, 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    s = placed.state;
    const after = shipAll(withInventory(s, 50, 50, 50, 50)).state;
    // 売却益で 2 棟目も買える
    expect(after.cash).toBeGreaterThan(30_000);
  });
});
