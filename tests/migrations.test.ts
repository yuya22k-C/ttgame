import { describe, it, expect } from "vitest";
import { migrate } from "../src/save/migrations";
import { createInitialState } from "../src/game/state";

describe("migrate", () => {
  it("accepts the current schema unchanged", () => {
    const s = createInitialState();
    const r = migrate(JSON.parse(JSON.stringify(s)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.version).toBe(1);
    expect(r.state.cash).toBe(s.cash);
  });

  it("rejects null / non-object input", () => {
    expect(migrate(null).ok).toBe(false);
    expect(migrate(42).ok).toBe(false);
    expect(migrate("oops").ok).toBe(false);
  });

  it("rejects objects without a version number", () => {
    const r = migrate({ player: {}, farm: {}, clock: {} });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("missing_version");
  });

  it("refuses to load data newer than this build", () => {
    const r = migrate({ version: 99, player: {}, farm: {}, clock: {} });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("version_too_new");
  });

  it("rejects when top-level keys are missing", () => {
    const r = migrate({ version: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid_shape");
  });
});
