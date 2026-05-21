import { describe, it, expect } from "vitest";
import { canPlaceGreenhouse, placeGreenhouse } from "../src/game/farm";
import { createInitialState } from "../src/game/state";
import { GREENHOUSE_COST, GREENHOUSE_SIZE } from "../src/config/balance";

describe("canPlaceGreenhouse", () => {
  it("accepts a corner placement on an empty farm", () => {
    const s = createInitialState();
    expect(canPlaceGreenhouse(s.farm, 0, 0)).toBe(true);
  });

  it("rejects placements that extend past the right edge", () => {
    const s = createInitialState();
    expect(canPlaceGreenhouse(s.farm, s.farm.width - 2, 0)).toBe(false);
  });

  it("rejects placements that extend past the bottom edge", () => {
    const s = createInitialState();
    expect(canPlaceGreenhouse(s.farm, 0, s.farm.height - 1)).toBe(false);
  });

  it("rejects negative coordinates", () => {
    const s = createInitialState();
    expect(canPlaceGreenhouse(s.farm, -1, 0)).toBe(false);
  });

  it("rejects placements that overlap an existing greenhouse", () => {
    const s = createInitialState();
    const placed = placeGreenhouse(s, 2, 2);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    // 既存の (2,2)-(4,3) と被る配置
    expect(canPlaceGreenhouse(placed.state.farm, 3, 2)).toBe(false);
    // 接しているが被らない配置はOK
    expect(canPlaceGreenhouse(placed.state.farm, 5, 2)).toBe(true);
  });
});

describe("placeGreenhouse", () => {
  it("deducts cost and appends greenhouse on success", () => {
    const s = createInitialState();
    const before = s.cash;
    const r = placeGreenhouse(s, 0, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.cash).toBe(before - GREENHOUSE_COST);
    expect(r.state.farm.greenhouses).toHaveLength(1);
    expect(r.state.farm.greenhouses[0]!.position).toEqual({ x: 0, y: 0 });
    expect(r.state.farm.greenhouses[0]!.size).toEqual(GREENHOUSE_SIZE);
  });

  it("returns not_enough_cash when below cost", () => {
    const s = { ...createInitialState(), cash: 1000 };
    const r = placeGreenhouse(s, 0, 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("not_enough_cash");
  });

  it("returns out_of_bounds for invalid grid coordinates", () => {
    const s = createInitialState();
    const r = placeGreenhouse(s, s.farm.width - 1, 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("out_of_bounds");
  });

  it("returns overlap when a greenhouse is already at that spot", () => {
    let s = createInitialState();
    const first = placeGreenhouse(s, 0, 0);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    s = first.state;
    const second = placeGreenhouse(s, 1, 0);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("overlap");
  });

  it("does not mutate the input state on success", () => {
    const s = createInitialState();
    const r = placeGreenhouse(s, 0, 0);
    expect(r.ok).toBe(true);
    expect(s.farm.greenhouses).toHaveLength(0);
    expect(s.cash).toBe(createInitialState().cash);
  });
});
