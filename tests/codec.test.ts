import { describe, it, expect } from "vitest";
import { placeGreenhouse } from "../src/game/farm";
import { decode, encode } from "../src/save/codec";
import { crc32, crc32Hex } from "../src/save/checksum";
import { createInitialState } from "../src/game/state";
import { plantSeed, waterPlot } from "../src/game/tomato";

describe("crc32", () => {
  it("matches the canonical test vector for ASCII '123456789'", () => {
    expect(crc32("123456789")).toBe(0xcbf43926);
  });

  it("returns a stable hex-padded string", () => {
    expect(crc32Hex("")).toBe("00000000");
    expect(crc32Hex("hello").length).toBe(8);
  });
});

describe("codec.encode / decode", () => {
  it("round-trips an initial state without loss", () => {
    const s = createInitialState();
    const code = encode(s);
    const r = decode(code);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.checksumOk).toBe(true);
    expect(r.state.cash).toBe(s.cash);
    expect(r.state.farm.greenhouses).toEqual([]);
    expect(r.state.player.level).toBe(1);
  });

  it("round-trips a non-trivial state with greenhouses and plants", () => {
    let s = createInitialState();
    const p = placeGreenhouse(s, 0, 0);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    s = p.state;
    const ghId = s.farm.greenhouses[0]!.id;
    const plotId = s.farm.greenhouses[0]!.plots[0]!.id;
    const planted = plantSeed(s, ghId, plotId);
    if (!planted.ok) throw new Error();
    s = waterPlot(planted.state, ghId, plotId).ok
      ? (waterPlot(planted.state, ghId, plotId) as { ok: true; state: typeof s }).state
      : planted.state;

    const code = encode(s);
    const r = decode(code);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.checksumOk).toBe(true);
    expect(r.state.farm.greenhouses).toHaveLength(1);
    expect(r.state.farm.greenhouses[0]!.plots[0]!.plant?.stage).toBe("seed");
  });

  it("starts with TTG1- prefix and v1 tag", () => {
    const code = encode(createInitialState());
    expect(code.startsWith("TTG1-v1-")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(decode("").ok).toBe(false);
    expect(decode("notvalid").ok).toBe(false);
    expect(decode("TTG1-v1-deadbeef-NOTBASE64!!!").ok).toBe(false);
  });

  it("rejects wrong prefix", () => {
    const code = encode(createInitialState()).replace("TTG1", "WRONG");
    const r = decode(code);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("bad_prefix");
  });

  it("flags checksum mismatch but still attempts the load", () => {
    const code = encode(createInitialState());
    const parts = code.split("-");
    parts[2] = "00000000"; // 不正なチェックサム
    const r = decode(parts.join("-"));
    expect(r.ok).toBe(true); // ペイロードは生きているので state は返す
    if (!r.ok) return;
    expect(r.checksumOk).toBe(false);
  });
});
