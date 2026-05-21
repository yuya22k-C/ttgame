import { describe, it, expect } from "vitest";
import {
  GROWTH_STAGES,
  SEED_COST,
  STAGE_DAYS,
  WATER_DECAY_PER_DAY,
} from "../src/config/balance";
import { placeGreenhouse } from "../src/game/farm";
import { createInitialState, type GameState } from "../src/game/state";
import {
  advancePlot,
  fertilizePlot,
  gradeFor,
  harvestPlot,
  plantSeed,
  waterPlot,
  yieldFor,
} from "../src/game/tomato";

function setupWithGreenhouse(): { state: GameState; ghId: string; plotId: string } {
  let s = createInitialState();
  const placed = placeGreenhouse(s, 0, 0);
  if (!placed.ok) throw new Error("setup failed");
  s = placed.state;
  const gh = s.farm.greenhouses[0]!;
  return { state: s, ghId: gh.id, plotId: gh.plots[0]!.id };
}

describe("plantSeed", () => {
  it("creates a TomatoPlant at stage 'seed' and deducts seed cost", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const r = plantSeed(state, ghId, plotId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const gh = r.state.farm.greenhouses[0]!;
    const plot = gh.plots[0]!;
    expect(plot.plant?.stage).toBe("seed");
    expect(plot.plant?.daysInStage).toBe(0);
    expect(plot.waterLevel).toBeGreaterThan(0);
    expect(r.state.cash).toBe(state.cash - SEED_COST);
  });

  it("rejects planting twice in the same plot", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const r1 = plantSeed(state, ghId, plotId);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = plantSeed(r1.state, ghId, plotId);
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toBe("already_planted");
  });

  it("rejects when cash is below seed cost", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const broke: GameState = { ...state, cash: 100 };
    const r = plantSeed(broke, ghId, plotId);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("not_enough_cash");
  });
});

describe("waterPlot / fertilizePlot", () => {
  it("waterPlot sets the level to 100", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const r = waterPlot(state, ghId, plotId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.farm.greenhouses[0]!.plots[0]!.waterLevel).toBe(100);
  });

  it("fertilizePlot increases level and charges cost", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    // 種を撒いて初期肥料 30 にする
    const planted = plantSeed(state, ghId, plotId);
    if (!planted.ok) throw new Error();
    const before = planted.state.farm.greenhouses[0]!.plots[0]!.fertilizerLevel;
    const r = fertilizePlot(planted.state, ghId, plotId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.farm.greenhouses[0]!.plots[0]!.fertilizerLevel).toBeGreaterThan(before);
    expect(r.state.cash).toBeLessThan(planted.state.cash);
  });
});

describe("advancePlot", () => {
  it("decays water level over time", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const planted = plantSeed(state, ghId, plotId);
    if (!planted.ok) throw new Error();
    const plot = planted.state.farm.greenhouses[0]!.plots[0]!;
    const after = advancePlot(plot, 1);
    expect(after.waterLevel).toBe(Math.max(0, plot.waterLevel - WATER_DECAY_PER_DAY));
  });

  it("advances stages when enough days have passed", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const planted = plantSeed(state, ghId, plotId);
    if (!planted.ok) throw new Error();
    // 水を満杯にして進行速度補正を確実にし、十分な日数を進める
    const w = waterPlot(planted.state, ghId, plotId);
    if (!w.ok) throw new Error();
    let plot = w.state.farm.greenhouses[0]!.plots[0]!;
    expect(plot.plant?.stage).toBe("seed");
    // seed: 4日進めると sprout に
    plot = advancePlot(plot, STAGE_DAYS.seed + 0.5);
    expect(plot.plant?.stage).toBe("sprout");
  });

  it("eventually reaches harvest stage after enough cumulative days", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const planted = plantSeed(state, ghId, plotId);
    if (!planted.ok) throw new Error();
    let plot = planted.state.farm.greenhouses[0]!.plots[0]!;
    // 全ステージの累積 + 余裕
    const totalDays =
      GROWTH_STAGES.reduce<number>((acc, s) => acc + STAGE_DAYS[s], 0) + 10;
    // 水切れで進行半減を防ぐため、こまめに水やりを挟む
    for (let d = 0; d < totalDays; d += 1) {
      plot = { ...plot, waterLevel: 100 };
      plot = advancePlot(plot, 1);
    }
    expect(plot.plant?.stage).toBe("harvest");
  });

  it("is a no-op when gameDays is 0 or negative", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const planted = plantSeed(state, ghId, plotId);
    if (!planted.ok) throw new Error();
    const plot = planted.state.farm.greenhouses[0]!.plots[0]!;
    expect(advancePlot(plot, 0)).toBe(plot);
    expect(advancePlot(plot, -1)).toBe(plot);
  });
});

describe("gradeFor / yieldFor", () => {
  it("maps careScore to grades", () => {
    expect(gradeFor(95)).toBe("S");
    expect(gradeFor(85)).toBe("S");
    expect(gradeFor(70)).toBe("A");
    expect(gradeFor(65)).toBe("A");
    expect(gradeFor(50)).toBe("B");
    expect(gradeFor(10)).toBe("C");
  });

  it("yieldFor stays within YIELD_MIN..YIELD_MAX", () => {
    expect(yieldFor(0)).toBe(3);
    expect(yieldFor(100)).toBe(6);
    expect(yieldFor(50)).toBeGreaterThanOrEqual(3);
    expect(yieldFor(50)).toBeLessThanOrEqual(6);
  });
});

describe("harvestPlot", () => {
  it("rejects when plant has not reached harvest stage", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const planted = plantSeed(state, ghId, plotId);
    if (!planted.ok) throw new Error();
    const r = harvestPlot(planted.state, ghId, plotId);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("not_ready_to_harvest");
  });

  it("rejects when plot has no plant", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    const r = harvestPlot(state, ghId, plotId);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("not_planted");
  });

  it("harvests when stage reached and updates inventory + clears plant", () => {
    const { state, ghId, plotId } = setupWithGreenhouse();
    // 直接 harvest ステージの植物に書き換えてテスト
    const gh = state.farm.greenhouses[0]!;
    const plot = gh.plots[0]!;
    const mutated: GameState = {
      ...state,
      farm: {
        ...state.farm,
        greenhouses: [
          {
            ...gh,
            plots: gh.plots.map((p) =>
              p.id === plot.id
                ? {
                    ...p,
                    plant: {
                      varietyId: "x",
                      stage: "harvest",
                      daysInStage: 0,
                      careScore: 90, // S グレード狙い
                    },
                  }
                : p,
            ),
          },
        ],
      },
    };
    const r = harvestPlot(mutated, ghId, plotId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.grade).toBe("S");
    expect(r.kg).toBeGreaterThan(0);
    const after = r.state.farm.greenhouses[0]!.plots[0]!;
    expect(after.plant).toBeUndefined();
    expect(r.state.farm.inventory.S).toBe(r.kg);
  });
});
