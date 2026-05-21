import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/game/state";

describe("createInitialState", () => {
  it("returns a state with the current schema version", () => {
    const s = createInitialState();
    expect(s.version).toBe(1);
  });

  it("starts on year 1 spring day 1 at 06:00", () => {
    const { clock } = createInitialState();
    expect(clock.year).toBe(1);
    expect(clock.season).toBe("spring");
    expect(clock.day).toBe(1);
    expect(clock.hour).toBe(6);
    expect(clock.minute).toBe(0);
    expect(clock.speed).toBe(1);
  });

  it("starts with positive cash so the player can build", () => {
    expect(createInitialState().cash).toBeGreaterThan(0);
  });

  it("starts at level 1 with no skill points", () => {
    const { player } = createInitialState();
    expect(player.level).toBe(1);
    expect(player.exp).toBe(0);
    expect(player.skillPoints).toBe(0);
  });
});
