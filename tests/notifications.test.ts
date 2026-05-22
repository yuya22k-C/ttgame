import { describe, it, expect } from "vitest";
import { placeGreenhouse } from "../src/game/farm";
import {
  createCenter,
  detectEvents,
  greenhouseAttention,
  markAllRead,
  pushLevelUp,
} from "../src/game/notifications";
import { createInitialState, type GameState } from "../src/game/state";

function setupWithGreenhouse(): { state: GameState; ghId: string; plotId: string } {
  let s = createInitialState();
  const placed = placeGreenhouse(s, 0, 0);
  if (!placed.ok) throw new Error("setup failed");
  s = placed.state;
  const gh = s.farm.greenhouses[0]!;
  return { state: s, ghId: gh.id, plotId: gh.plots[0]!.id };
}

describe("detectEvents", () => {
  it("notifies when a plot reaches harvest stage and stops after harvest", () => {
    const c = createCenter();
    const { state, ghId, plotId } = setupWithGreenhouse();
    // harvest 状態を直接注入
    const withPlant: GameState = {
      ...state,
      farm: {
        ...state.farm,
        greenhouses: state.farm.greenhouses.map((g) =>
          g.id === ghId
            ? {
                ...g,
                plots: g.plots.map((p) =>
                  p.id === plotId
                    ? {
                        ...p,
                        plant: {
                          varietyId: "x",
                          stage: "harvest",
                          daysInStage: 0,
                          careScore: 80,
                        },
                        waterLevel: 100,
                        fertilizerLevel: 100,
                      }
                    : p,
                ),
              }
            : g,
        ),
      },
    };
    detectEvents(c, withPlant, 1_000);
    expect(c.list.some((n) => n.kind === "harvest_ready")).toBe(true);
    expect(c.unread).toBe(1);

    // 同じ呼び出しでは重複しない
    detectEvents(c, withPlant, 1_000);
    expect(c.list.filter((n) => n.kind === "harvest_ready")).toHaveLength(1);

    // plant がなくなれば clearKey で再通知可能になる
    const cleared: GameState = {
      ...withPlant,
      farm: {
        ...withPlant.farm,
        greenhouses: withPlant.farm.greenhouses.map((g) => ({
          ...g,
          plots: g.plots.map((p) => ({ ...p, plant: undefined })),
        })),
      },
    };
    detectEvents(c, cleared, 2_000);
    // 解除されているので、次回 harvest になれば再度通知される
    detectEvents(c, withPlant, 3_000);
    expect(c.list.filter((n) => n.kind === "harvest_ready")).toHaveLength(2);
  });

  it("notifies cash_zero once and clears when cash recovers", () => {
    const c = createCenter();
    const s = createInitialState();
    detectEvents(c, { ...s, cash: 0 }, 100);
    expect(c.unread).toBe(1);
    detectEvents(c, { ...s, cash: 0 }, 200);
    expect(c.list.filter((n) => n.kind === "cash_zero")).toHaveLength(1);
    detectEvents(c, { ...s, cash: 1000 }, 300);
    // 解除後に再度0になれば通知される
    detectEvents(c, { ...s, cash: 0 }, 400);
    expect(c.list.filter((n) => n.kind === "cash_zero")).toHaveLength(2);
  });

  it("notifies water_low only when below threshold and clears above", () => {
    const c = createCenter();
    const { state, ghId, plotId } = setupWithGreenhouse();
    const make = (water: number): GameState => ({
      ...state,
      farm: {
        ...state.farm,
        greenhouses: state.farm.greenhouses.map((g) =>
          g.id === ghId
            ? {
                ...g,
                plots: g.plots.map((p) =>
                  p.id === plotId
                    ? {
                        ...p,
                        plant: {
                          varietyId: "x",
                          stage: "planted",
                          daysInStage: 0,
                          careScore: 50,
                        },
                        waterLevel: water,
                      }
                    : p,
                ),
              }
            : g,
        ),
      },
    });
    detectEvents(c, make(10), 1_000);
    expect(c.list.some((n) => n.kind === "water_low")).toBe(true);
    detectEvents(c, make(60), 2_000);
    // しきい値超えで解除 → 次の water_low は新規通知
    detectEvents(c, make(5), 3_000);
    expect(c.list.filter((n) => n.kind === "water_low")).toHaveLength(2);
  });
});

describe("markAllRead", () => {
  it("zeros unread and marks all items read", () => {
    const c = createCenter();
    pushLevelUp(c, 2, 1_000);
    pushLevelUp(c, 3, 2_000);
    expect(c.unread).toBe(2);
    markAllRead(c);
    expect(c.unread).toBe(0);
    expect(c.list.every((n) => n.read)).toBe(true);
  });
});

describe("greenhouseAttention", () => {
  it("returns 'info' when a plot is harvest-ready", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const s2: GameState = {
      ...state,
      farm: {
        ...state.farm,
        greenhouses: state.farm.greenhouses.map((g) =>
          g.id === ghId
            ? {
                ...g,
                plots: g.plots.map((p) =>
                  p.id === plotId
                    ? {
                        ...p,
                        plant: {
                          varietyId: "x",
                          stage: "harvest",
                          daysInStage: 0,
                          careScore: 80,
                        },
                        waterLevel: 80,
                        fertilizerLevel: 80,
                      }
                    : p,
                ),
              }
            : g,
        ),
      },
    };
    expect(greenhouseAttention(s2, ghId)).toBe("info");
  });

  it("returns 'warn' for low water without harvest-ready", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const s2: GameState = {
      ...state,
      farm: {
        ...state.farm,
        greenhouses: state.farm.greenhouses.map((g) =>
          g.id === ghId
            ? {
                ...g,
                plots: g.plots.map((p) =>
                  p.id === plotId
                    ? {
                        ...p,
                        plant: {
                          varietyId: "x",
                          stage: "planted",
                          daysInStage: 0,
                          careScore: 50,
                        },
                        waterLevel: 5,
                      }
                    : p,
                ),
              }
            : g,
        ),
      },
    };
    expect(greenhouseAttention(s2, ghId)).toBe("warn");
  });

  it("returns 'none' for unknown greenhouse id", () => {
    const s = createInitialState();
    expect(greenhouseAttention(s, "nope")).toBe("none");
  });
});
