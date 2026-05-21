import { describe, it, expect } from "vitest";
import { advanceClock, tick } from "../src/game/tick";
import { createInitialState } from "../src/game/state";
import { gameMinutesToRealMs } from "../src/util/time";

describe("advanceClock", () => {
  it("ticks minutes within the same hour", () => {
    const s = createInitialState();
    const c = advanceClock(s.clock, 15, 1000);
    expect(c.minute).toBe(15);
    expect(c.hour).toBe(6);
    expect(c.day).toBe(1);
    expect(c.lastTickAt).toBe(1000);
  });

  it("carries minutes into hours", () => {
    const s = createInitialState();
    const c = advanceClock(s.clock, 75, 0);
    expect(c.hour).toBe(7);
    expect(c.minute).toBe(15);
  });

  it("carries hours into days", () => {
    const s = createInitialState();
    // 6:00 + 20h = next day 02:00
    const c = advanceClock(s.clock, 20 * 60, 0);
    expect(c.day).toBe(2);
    expect(c.hour).toBe(2);
    expect(c.minute).toBe(0);
  });

  it("advances season after 30 days", () => {
    const s = createInitialState();
    // 1日 6:00 から 30日分進める → spring 31日 → summer 1日
    const c = advanceClock(s.clock, 30 * 24 * 60, 0);
    expect(c.season).toBe("summer");
    expect(c.day).toBe(1);
  });

  it("advances year after 4 seasons", () => {
    const s = createInitialState();
    // 120日 = 1 ゲーム年ぶん進めると年が +1, 日付は元に戻る
    const c = advanceClock(s.clock, 120 * 24 * 60, 0);
    expect(c.year).toBe(2);
    expect(c.season).toBe("spring");
    expect(c.day).toBe(1);
    expect(c.hour).toBe(6);
  });

  it("handles multi-year jumps purely (no clamping in advanceClock)", () => {
    const s = createInitialState();
    // 3 ゲーム年ぶん進める (3 * 120 = 360 日)
    const c = advanceClock(s.clock, 3 * 120 * 24 * 60, 0);
    expect(c.year).toBe(4);
    expect(c.season).toBe("spring");
    expect(c.day).toBe(1);
    expect(c.hour).toBe(6);
  });
});

describe("tick", () => {
  it("does not advance the clock when speed is 0", () => {
    let s = createInitialState();
    s = { ...s, clock: { ...s.clock, speed: 0 } };
    const after = tick(s, 10_000, 12345);
    expect(after.clock.minute).toBe(s.clock.minute);
    expect(after.clock.hour).toBe(s.clock.hour);
    expect(after.clock.lastTickAt).toBe(12345);
  });

  it("scales by speed multiplier", () => {
    const s = createInitialState();
    // 1 実秒 = 3 ゲーム分. 4× で 12 ゲーム分.
    const after = tick({ ...s, clock: { ...s.clock, speed: 4 } }, 1000, 0);
    expect(after.clock.minute).toBe(12);
  });

  it("agrees with gameMinutesToRealMs round-trip", () => {
    // 1 ゲーム時間 = 60 ゲーム分 = 20 実秒
    expect(gameMinutesToRealMs(60)).toBeCloseTo(20_000, 0);
  });
});
