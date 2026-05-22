import { describe, it, expect } from "vitest";
import { expForNextLevel } from "../src/config/balance";
import { allocateSkill, gainExp } from "../src/game/player";
import { createInitialState } from "../src/game/state";

describe("gainExp", () => {
  it("accumulates exp without leveling when below threshold", () => {
    const p = createInitialState().player;
    const r = gainExp(p, 50);
    expect(r.player.level).toBe(1);
    expect(r.player.exp).toBe(50);
    expect(r.leveledUp).toBe(false);
    expect(r.player.skillPoints).toBe(0);
  });

  it("levels up exactly once at threshold and awards 1 SP", () => {
    const p = createInitialState().player;
    const need = expForNextLevel(1);
    const r = gainExp(p, need);
    expect(r.player.level).toBe(2);
    expect(r.player.exp).toBe(0);
    expect(r.player.skillPoints).toBe(1);
    expect(r.leveledUp).toBe(true);
    expect(r.levelsGained).toBe(1);
  });

  it("handles multi-level jumps with a single huge gain", () => {
    const p = createInitialState().player;
    const need1 = expForNextLevel(1); // 100
    const need2 = expForNextLevel(2); // ~282
    const big = need1 + need2 + 10;
    const r = gainExp(p, big);
    expect(r.player.level).toBe(3);
    expect(r.player.exp).toBe(10);
    expect(r.player.skillPoints).toBe(2);
    expect(r.levelsGained).toBe(2);
  });

  it("no-ops for non-positive amounts", () => {
    const p = createInitialState().player;
    expect(gainExp(p, 0).player).toBe(p);
    expect(gainExp(p, -10).player).toBe(p);
  });
});

describe("allocateSkill", () => {
  it("decreases SP and increases the chosen skill by 1", () => {
    const base = createInitialState().player;
    const withSp = { ...base, skillPoints: 2 };
    const r = allocateSkill(withSp, "cultivate");
    expect(r.ok).toBe(true);
    expect(r.player.skillPoints).toBe(1);
    expect(r.player.skills.cultivate).toBe(2);
    expect(r.player.skills.business).toBe(1);
  });

  it("rejects when SP is 0", () => {
    const p = createInitialState().player;
    const r = allocateSkill(p, "business");
    expect(r.ok).toBe(false);
    expect(r.player).toBe(p);
  });
});

describe("expForNextLevel curve", () => {
  it("increases super-linearly", () => {
    expect(expForNextLevel(1)).toBe(100);
    expect(expForNextLevel(2)).toBeGreaterThan(expForNextLevel(1));
    expect(expForNextLevel(5)).toBeGreaterThan(expForNextLevel(4));
  });
});
