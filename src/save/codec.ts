// 持ち運びコードの encode/decode.
// 形式: TTG1-v{N}-{crc8hex}-{lz-base64payload}
// パイプライン: GameState → JSON → LZ-String(Base64) → 接頭辞+CRC32 付与.
// 詳細は docs/requirements.md 7.2.2.

import { compressToBase64, decompressFromBase64 } from "lz-string";
import type { GameState } from "@/game/state";
import { crc32Hex } from "@/save/checksum";
import { CURRENT_VERSION, migrate, type MigrationResult } from "@/save/migrations";

const PREFIX = "TTG1";
const SEP = "-";

export function encode(state: GameState): string {
  const json = JSON.stringify(state);
  const payload = compressToBase64(json);
  const checksum = crc32Hex(payload);
  return [PREFIX, `v${state.version ?? CURRENT_VERSION}`, checksum, payload].join(SEP);
}

export type DecodeResult =
  | { ok: true; state: GameState; checksumOk: boolean }
  | {
      ok: false;
      reason:
        | "bad_format"
        | "bad_prefix"
        | "bad_version_tag"
        | "decompress_failed"
        | "bad_json"
        | "migration_failed";
      message: string;
    };

export function decode(code: string): DecodeResult {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, reason: "bad_format", message: "コードが空です" };

  // 接頭辞 + 3 区切りで終わり. payload に '-' は含まれない (base64 のみ).
  const parts = trimmed.split(SEP);
  if (parts.length < 4) return { ok: false, reason: "bad_format", message: "区切りが不足" };
  const [prefix, vtag, checksum, ...rest] = parts;
  if (prefix !== PREFIX) {
    return { ok: false, reason: "bad_prefix", message: `接頭辞が不正 (${prefix})` };
  }
  if (!vtag?.startsWith("v")) {
    return { ok: false, reason: "bad_version_tag", message: `バージョンタグが不正 (${vtag})` };
  }
  const declaredVersion = Number(vtag.slice(1));
  if (!Number.isInteger(declaredVersion) || declaredVersion <= 0) {
    return { ok: false, reason: "bad_version_tag", message: `バージョン番号が不正 (${vtag})` };
  }
  const payload = rest.join(SEP); // base64 に '-' は含まないが念のため
  const checksumOk = crc32Hex(payload) === checksum;

  const json = decompressFromBase64(payload);
  if (!json) {
    return { ok: false, reason: "decompress_failed", message: "コードの展開に失敗" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "bad_json", message: "JSON の解析に失敗" };
  }

  const m: MigrationResult = migrate(parsed);
  if (!m.ok) {
    return { ok: false, reason: "migration_failed", message: m.message };
  }
  return { ok: true, state: m.state, checksumOk };
}
